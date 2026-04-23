import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// dirname = /<repo>/.claude/scripts/__tests__
// ../../.. → /<repo>
const repoRoot = resolve(import.meta.dirname, "../../..");

function runCli(args: string[]) {
  return spawnSync("kata-cli", ["case-strategy-resolver", ...args], {
    encoding: "utf8",
    cwd: repoRoot,
  });
}

function makeProfile(levels: {
  source: string;
  prd: string;
  history: string;
  knowledge: string;
}): unknown {
  const entry = (level: string) => ({ level, evidence: {} });
  return {
    source: entry(levels.source),
    prd: entry(levels.prd),
    history: entry(levels.history),
    knowledge: entry(levels.knowledge),
    probed_at: "2026-04-18T00:00:00.000Z",
    project: "fixture",
    prd_path: "/fake/prd.md",
  };
}

let tmpDir: string;
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "case-strategy-resolver-"));
});
afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Test 1: inline JSON → valid StrategyResolution; all-strong → S1
// ---------------------------------------------------------------------------
describe("inline JSON profile", () => {
  test("all-strong profile resolves to S1 and outputs valid JSON", () => {
    const profile = makeProfile({
      source: "strong",
      prd: "strong",
      history: "strong",
      knowledge: "strong",
    });
    const result = runCli(["resolve", "--profile", JSON.stringify(profile)]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.strategy_id).toBe("S1");
    expect(parsed.strategy_name).toBe("完整型");
    expect(parsed).toHaveProperty("signal_profile");
    expect(parsed).toHaveProperty("overrides");
    expect(parsed).toHaveProperty("resolved_at");
  });
});

// ---------------------------------------------------------------------------
// Test 2: @<file> path → reads file and resolves
// ---------------------------------------------------------------------------
describe("@<file> profile path", () => {
  test("reads profile from file when prefixed with @", () => {
    const profile = makeProfile({
      source: "strong",
      prd: "strong",
      history: "strong",
      knowledge: "weak",
    });
    const filePath = join(tmpDir, "profile.json");
    writeFileSync(filePath, JSON.stringify(profile), "utf8");

    const result = runCli(["resolve", "--profile", `@${filePath}`]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.strategy_id).toBe("S1");
  });
});

// ---------------------------------------------------------------------------
// Test 3: invalid JSON → non-zero exit, stderr contains error message
// ---------------------------------------------------------------------------
describe("invalid profile JSON", () => {
  test("exits with non-zero and writes error to stderr", () => {
    const result = runCli(["resolve", "--profile", "not-json"]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("invalid profile JSON");
  });
});

// ---------------------------------------------------------------------------
// Test 4: table-driven strategy selection for 5 strategies
// ---------------------------------------------------------------------------
describe("strategy selection", () => {
  const cases: Array<{
    label: string;
    levels: { source: string; prd: string; history: string; knowledge: string };
    expectedId: string;
  }> = [
    {
      label: "all-strong → S1",
      levels: { source: "strong", prd: "strong", history: "strong", knowledge: "strong" },
      expectedId: "S1",
    },
    {
      label: "source=strong, prd=weak → S2",
      levels: { source: "strong", prd: "weak", history: "weak", knowledge: "missing" },
      expectedId: "S2",
    },
    {
      label: "prd=strong, history=strong, source=weak → S3",
      levels: { source: "weak", prd: "strong", history: "strong", knowledge: "missing" },
      expectedId: "S3",
    },
    {
      label: "source=weak, prd=weak, history=weak → S4",
      levels: { source: "weak", prd: "weak", history: "weak", knowledge: "missing" },
      expectedId: "S4",
    },
    {
      label: "source=strong, prd=missing → S5",
      levels: { source: "strong", prd: "missing", history: "weak", knowledge: "missing" },
      expectedId: "S5",
    },
  ];

  for (const c of cases) {
    test(c.label, () => {
      const profile = makeProfile(c.levels);
      const result = runCli(["resolve", "--profile", JSON.stringify(profile)]);

      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.strategy_id).toBe(c.expectedId);
    });
  }
});

// ---------------------------------------------------------------------------
// Test 5: --force-strategy overrides natural selection
// ---------------------------------------------------------------------------
describe("--force-strategy", () => {
  test("forces S4 even when profile is all-strong (would naturally be S1)", () => {
    const profile = makeProfile({
      source: "strong",
      prd: "strong",
      history: "strong",
      knowledge: "strong",
    });
    const result = runCli([
      "resolve",
      "--profile",
      JSON.stringify(profile),
      "--force-strategy",
      "S4",
    ]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.strategy_id).toBe("S4");
    expect(parsed.strategy_name).toBe("保守兜底");
  });

  test("forces S3 even when profile would naturally select S1", () => {
    const profile = makeProfile({
      source: "strong",
      prd: "strong",
      history: "strong",
      knowledge: "weak",
    });
    const result = runCli([
      "resolve",
      "--profile",
      JSON.stringify(profile),
      "--force-strategy",
      "S3",
    ]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.strategy_id).toBe("S3");
  });
});

// ---------------------------------------------------------------------------
// Test 6: --force-strategy with invalid ID → non-zero exit, error in stderr
// ---------------------------------------------------------------------------
describe("--force-strategy validation", () => {
  test("exits with non-zero and writes error for invalid strategy ID", () => {
    const profile = makeProfile({
      source: "strong",
      prd: "strong",
      history: "strong",
      knowledge: "strong",
    });
    const result = runCli([
      "resolve",
      "--profile",
      JSON.stringify(profile),
      "--force-strategy",
      "INVALID",
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("invalid --force-strategy");
  });
});

// ---------------------------------------------------------------------------
// Test 7: --output summary writes to stderr without breaking stdout JSON
// ---------------------------------------------------------------------------
describe("--output summary", () => {
  test("writes strategy info to stderr and valid JSON to stdout", () => {
    const profile = makeProfile({
      source: "strong",
      prd: "strong",
      history: "strong",
      knowledge: "strong",
    });
    const result = runCli([
      "resolve",
      "--profile",
      JSON.stringify(profile),
      "--output",
      "summary",
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("strategy=S1");
    expect(result.stderr).toContain("name=完整型");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.strategy_id).toBe("S1");
  });
});

// ---------------------------------------------------------------------------
// Test 8: profile missing required fields → non-zero exit, error in stderr
// ---------------------------------------------------------------------------
describe("profile validation", () => {
  test("exits with non-zero when profile is missing required fields", () => {
    const incompleteProfile = JSON.stringify({ probed_at: "2026-04-18T00:00:00.000Z" });
    const result = runCli(["resolve", "--profile", incompleteProfile]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("profile missing required fields");
  });
});
