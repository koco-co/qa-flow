import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { repoRoot } from "../lib/paths.ts";

interface Violation {
  file: string;
  line: number;
  reason: string;
}

interface AuditReport {
  totals: { pass: number; fail: number; errors: number; total: number };
  buckets: {
    E1: Violation[]; // subprocess spawn
    E2: Violation[]; // temp path / fixture
    E3: Violation[]; // codemod residue (toBeTruthy on boolean)
    E4: Violation[]; // business regression
    E5: Violation[]; // syntax / import
  };
}

/** Run bun test, capture stdout, parse the report. */
export function runTestAudit(): AuditReport {
  const engineRoot = join(repoRoot(), "engine");
  const result = spawnSync("bun", ["test", "--cwd", engineRoot], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const stdout = result.stdout + result.stderr;

  // Parse summary line: "  N pass\n  N fail\n  N errors\n"
  const passM = stdout.match(/(\d+)\s+pass/);
  const failM = stdout.match(/(\d+)\s+fail/);
  const errM = stdout.match(/(\d+)\s+errors/);
  const totalM = stdout.match(/Ran\s+(\d+)\s+tests/);

  const totals = {
    pass: passM ? Number(passM[1]) : 0,
    fail: failM ? Number(failM[1]) : 0,
    errors: errM ? Number(errM[1]) : 0,
    total: totalM ? Number(totalM[1]) : 0,
  };

  const buckets: AuditReport["buckets"] = { E1: [], E2: [], E3: [], E4: [], E5: [] };

  // Extract failure/error lines: "(fail) testName" or "(error) ..."
  // Match format: "  (fail) test > name [time]" or "TypeError: ... at (file:line:col)"
  const failLines = stdout.matchAll(/\(fail\)\s+(.+?)\s+\[[\d.]+\w+\]/g);
  for (const m of failLines) {
    const testName = m[1]!;
    const vio = classify(testName, stdout);
    if (vio) buckets[vio.bucket].push(vio);
  }

  return { totals, buckets };
}

function classify(
  testName: string,
  stdout: string,
): { bucket: keyof AuditReport["buckets"]; file: string; line: number; reason: string } | null {
  // Extract file:line from the fail context
  const fileMatch = testName.match(/^([^\s>]+)/);
  if (!fileMatch) return null;
  const fileSlug = fileMatch[1]!;

  // Reconstruct file path
  const fullPath = stdout.match(
    new RegExp(`/Users/poco/Projects/kata/engine/(tests/[^:]+):(\\d+)`),
  );
  const line = fullPath ? Number(fullPath[2]) : 0;

  // Heuristic classification
  const reason = testName;

  // E5: TypeScript syntax errors
  if (stdout.includes("SyntaxError") || stdout.includes("TypeError:")) {
    const errLines = stdout.match(new RegExp(`error:.*${escapeRegex(fileSlug)}.*`, "m"));
    if (errLines && /SyntaxError|TypeError/.test(errLines[0]!)) {
      const lineM = errLines[0]!.match(/\((\d+):/);
      return { bucket: "E5", file: fileSlug, line: lineM ? Number(lineM[1]) : 0, reason };
    }
  }

  // E1: subprocess spawn
  if (/(spawn|Bun\.spawn|child_process|execFile|execSync)/i.test(testName)) {
    return { bucket: "E1", file: fileSlug, line, reason };
  }

  // E3: toBeTruthy on non-expect (remaining codemod corruption)
  if (/\.(includes|endsWith|startsWith)\(.*\)\.toBeTruthy/.test(testName)) {
    return { bucket: "E3", file: fileSlug, line, reason };
  }

  // E2: temp paths
  if (/(tmpdir|mkdtemp|\/tmp\/|temp|fixture)/i.test(testName)) {
    return { bucket: "E2", file: fileSlug, line, reason };
  }

  // Default: E4 business regression
  return { bucket: "E4", file: fileSlug, line, reason };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Commander registration (P8.1) ──────────────────────────
import { Command } from "commander";

export function registerTestBucketAudit(kata: Command): void {
  kata
    .command("test:bucket-audit")
    .description("Run engine tests, classify failures into E1-E5 manifest")
    .action(() => {
      const report = runTestAudit();
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    });
}
