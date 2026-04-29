import { Command } from "commander";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { projectDir } from "../../lib/paths.ts";

// ── Skeleton definition ──────────────────────────────────────

const DIRS = ["cases", "runners", "helpers", "data", "unit", ".debug"];

const README_TEMPLATES: Record<string, (vars: { feature: string; project: string }) => string> = {
  "README.md": ({ feature, project }) => `# ${feature} — Test Suite

## Structure

| Directory | Purpose |
|-----------|---------|
| cases/    | Test case scripts (\`t{nn}-{slug}.ts\`) |
| runners/  | Playwright runner specs (smoke/full/retry-failed) |
| helpers/  | PRD-specific helpers |
| data/     | Test data / fixtures / seed SQL |
| unit/     | Helper unit tests (\`*.test.ts\`) |
| .debug/   | One-off repro scripts (gitignored) |

## Run

\`\`\`bash
# Smoke
bun test workspace/${project}/features/${feature}/tests/runners/smoke.spec.ts

# Full
bun test workspace/${project}/features/${feature}/tests/runners/full.spec.ts
\`\`\`
`,

  "cases/README.md": () => `# Cases Index

> 由 script-writer-agent（Step 3a）自动生成，无需手动维护。

| # | File | Scenario |
|---|------|----------|
| t01 | t01-xxx.ts | （自动生成） |
| t02 | t02-xxx.ts | （自动生成） |
`,
};

// ── Plan / Apply (pure-function split) ───────────────────────

export interface InitPlan {
  testsDir: string;
  missingDirs: string[];
  missingGitkeeps: string[];
  missingReadmes: string[];
  existingDirs: string[];
}

export function planInitTests(testsDir: string): InitPlan {
  const missingDirs: string[] = [];
  const missingGitkeeps: string[] = [];
  const missingReadmes: string[] = [];
  const existingDirs: string[] = [];

  for (const dir of DIRS) {
    const abs = join(testsDir, dir);
    if (existsSync(abs)) {
      existingDirs.push(dir);
    } else {
      missingDirs.push(dir);
    }
  }

  // .gitkeep — only for dirs that exist or will be created
  for (const dir of DIRS) {
    const gk = join(testsDir, dir, ".gitkeep");
    if (!existsSync(gk)) {
      missingGitkeeps.push(`${dir}/.gitkeep`);
    }
  }

  // READMEs
  for (const rel of Object.keys(README_TEMPLATES)) {
    const abs = join(testsDir, rel);
    if (!existsSync(abs)) {
      missingReadmes.push(rel);
    }
  }

  return { testsDir, missingDirs, missingGitkeeps, missingReadmes, existingDirs };
}

export function applyInitTests(
  testsDir: string,
  plan: InitPlan,
  vars: { feature: string; project: string },
): { createdDirs: string[]; createdGitkeeps: string[]; createdReadmes: string[] } {
  const createdDirs: string[] = [];
  const createdGitkeeps: string[] = [];
  const createdReadmes: string[] = [];

  // Create missing dirs
  for (const dir of plan.missingDirs) {
    const abs = join(testsDir, dir);
    mkdirSync(abs, { recursive: true });
    createdDirs.push(dir);
  }

  // Create missing .gitkeeps
  for (const rel of plan.missingGitkeeps) {
    const abs = join(testsDir, rel);
    writeFileSync(abs, "");
    createdGitkeeps.push(rel);
  }

  // Create missing READMEs
  for (const rel of plan.missingReadmes) {
    const abs = join(testsDir, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    const renderer = README_TEMPLATES[rel]!;
    writeFileSync(abs, renderer(vars));
    createdReadmes.push(rel);
  }

  return { createdDirs, createdGitkeeps, createdReadmes };
}

// ── CLI registration ─────────────────────────────────────────

export function registerInitTests(program: Command): void {
  program
    .command("features:init-tests")
    .description("初始化 feature 级 tests/ 目录骨架")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--feature <ym-slug>", "feature 目录名（如 202604-xxx）")
    .option("--dry", "只预览，不落盘", false)
    .action(
      (opts: { project: string; feature: string; dry: boolean }) => {
        const featuresRoot = join(projectDir(opts.project), "features");
        const featDir = join(featuresRoot, opts.feature);

        if (!existsSync(featDir)) {
          console.error(
            `[features:init-tests] feature directory not found: ${featDir}`,
          );
          process.exit(1);
        }

        const testsDir = join(featDir, "tests");
        const plan = planInitTests(testsDir);

        const totalMissing =
          plan.missingDirs.length +
          plan.missingGitkeeps.length +
          plan.missingReadmes.length;

        if (totalMissing === 0) {
          console.log(
            `[features:init-tests] project=${opts.project} feature=${opts.feature} status=complete skipped=${DIRS.length}`,
          );
          return;
        }

        if (opts.dry) {
          console.log(
            `[features:init-tests] project=${opts.project} feature=${opts.feature} DRY RUN`,
          );
          if (plan.missingDirs.length > 0)
            console.log(`  dirs to create: ${plan.missingDirs.join(", ")}`);
          if (plan.missingGitkeeps.length > 0)
            console.log(
              `  gitkeeps to create: ${plan.missingGitkeeps.join(", ")}`,
            );
          if (plan.missingReadmes.length > 0)
            console.log(
              `  readmes to create: ${plan.missingReadmes.join(", ")}`,
            );
          console.log(`  existing: ${plan.existingDirs.join(", ") || "none"}`);
          return;
        }

        const result = applyInitTests(testsDir, plan, {
          feature: opts.feature,
          project: opts.project,
        });

        console.log(
          `[features:init-tests] project=${opts.project} feature=${opts.feature} created=${result.createdDirs.length} skipped=${plan.existingDirs.length}`,
        );
      },
    );
}
