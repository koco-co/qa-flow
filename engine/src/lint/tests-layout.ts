import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import type { LintReport, LintViolation } from "./types.ts";

const CASE_FILENAME_REGEX = /^t\d{2}-[a-z0-9-]+\.ts$/;
const VARIANT_FILENAME_REGEX = /^.*[-_]v?\d+\..+$/;
const HELPER_LINE_LIMIT = 800;

function walkAllTs(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkAllTs(full));
    else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) out.push(full);
  }
  return out;
}

function listSubdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(dir, d.name));
}

export function lintFeatureTests(testsDir: string): LintReport {
  const violations: LintViolation[] = [];

  const casesDir = join(testsDir, "cases");
  const runnersDir = join(testsDir, "runners");
  const helpersDir = join(testsDir, "helpers");
  const dataDir = join(testsDir, "data");
  const unitDir = join(testsDir, "unit");

  // L1 — cases/*.ts must match ^t\d{2}-[a-z0-9-]+\.ts$
  for (const file of walkAllTs(casesDir)) {
    const name = basename(file);
    if (name === "README.md") continue;
    if (!CASE_FILENAME_REGEX.test(name) && !name.endsWith(".spec.ts")) {
      violations.push({ rule: "L1", file, message: `case filename '${name}' must match ^t\\d{2}-[a-z0-9-]+\\.ts$` });
    }
  }

  // L2 — cases >= 15 must have >= 2 module subdirs
  const flatCases = walkAllTs(casesDir).filter((f) => CASE_FILENAME_REGEX.test(basename(f)));
  if (flatCases.length >= 15) {
    const moduleSubdirs = listSubdirs(casesDir);
    if (moduleSubdirs.length < 2) {
      violations.push({ rule: "L2", file: casesDir, message: `${flatCases.length} cases >= 15 but only ${moduleSubdirs.length} module subdir(s); split into >= 2 module subdirs` });
    }
  }

  // L3 — cases/README.md must exist when cases/ exists
  if (existsSync(casesDir) && !existsSync(join(casesDir, "README.md"))) {
    violations.push({ rule: "L3", file: join(casesDir, "README.md"), message: "cases/README.md missing — must enumerate t{nn} -> business-scenario mapping" });
  }

  // L4 — helpers/*.ts <= 800 lines
  for (const file of walkAllTs(helpersDir)) {
    const lines = readFileSync(file, "utf8").split("\n").length;
    if (lines > HELPER_LINE_LIMIT) {
      violations.push({ rule: "L4", file, message: `helper '${basename(file)}' has ${lines} lines (limit ${HELPER_LINE_LIMIT})` });
    }
  }

  // L5 — runners/ contains only *.spec.ts ; cases/ contains only t{nn}-*.ts
  for (const file of walkAllTs(runnersDir)) {
    if (!basename(file).endsWith(".spec.ts")) {
      violations.push({ rule: "L5", file, message: `runners/ must contain only *.spec.ts; found '${basename(file)}'` });
    }
  }
  for (const file of walkAllTs(casesDir)) {
    if (basename(file).endsWith(".spec.ts")) {
      violations.push({ rule: "L5", file, message: `cases/ must not contain *.spec.ts; move to runners/` });
    }
  }

  // L6 — unit/ contains only *.test.ts
  for (const file of walkAllTs(unitDir)) {
    if (!basename(file).endsWith(".test.ts")) {
      violations.push({ rule: "L6", file, message: `unit/ must contain only *.test.ts; found '${basename(file)}'` });
    }
  }

  // L7 — data/ filenames must not match _v\d+ or -\d+.ts (variant copies)
  for (const file of walkAllTs(dataDir)) {
    const name = basename(file);
    if (VARIANT_FILENAME_REGEX.test(name)) {
      violations.push({ rule: "L7", file, message: `data filename '${name}' looks like a variant copy (_vN or -N); use git history instead` });
    }
  }

  // L8 — .debug/ must be in .gitignore (checked separately at workspace level)

  // L9 — tests/ root must not contain full.spec.ts with inline test bodies
  const rootSpecFiles = readdirSync(testsDir)
    .filter((f) => f.endsWith(".spec.ts"));
  for (const sf of rootSpecFiles) {
    const sfPath = join(testsDir, sf);
    const content = readFileSync(sfPath, "utf8");
    // 如果 spec 文件包含 test() 或 import 实际用例（非聚合 import），视为内联
    if (content.includes("test(") && !content.includes('import "./')) {
      violations.push({ rule: "L9", file: sfPath, message: `spec file '${sf}' contains inline test body instead of aggregated imports; move tests to cases/ and use merge-specs` });
    }
  }

  // L10 — tests/ root must not contain sql/ subdirectory
  const sqlDir = join(testsDir, "sql");
  if (existsSync(sqlDir)) {
    violations.push({ rule: "L10", file: sqlDir, message: "sql/ directory is legacy; move seed SQL to tests/data/ instead" });
  }

  // L11 — tests/ root must not contain MANUAL-TRIAGE.md
  const manualTriage = join(testsDir, "MANUAL-TRIAGE.md");
  if (existsSync(manualTriage)) {
    violations.push({ rule: "L11", file: manualTriage, message: "MANUAL-TRIAGE.md is legacy; use .task-state.json for task tracking instead" });
  }

  return {
    featureDir: testsDir,
    violations,
    passed: violations.length === 0,
  };
}
