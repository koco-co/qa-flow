import { Command } from "commander";
import { lintWeakAssertion } from "../lint/weak-assertion.ts";
import { lintHardcodePath } from "../lint/hardcode-path.ts";
import { lintDebugFileNaming } from "../lint/debug-file-naming.ts";
import { lintOwnerSkillDup } from "../lint/owner-skill-dup.ts";
import { repoRoot } from "../lib/paths.ts";
import { join } from "node:path";

export function registerCasesLint(program: Command): void {
  program
    .command("cases:lint")
    .description("Aggregate case-level lints (E1-WEAK / E1-PATH / E1-DEBUG / E1-OWNER) per spec §10.7")
    .option("--exit-code", "exit non-zero on any violation", false)
    .option("--severity <level>", "filter exit-code by severity (all|fail-only)", "all")
    .option("--scope <p>", "scan path", join(repoRoot(), "workspace"))
    .action((opts: { exitCode: boolean; severity: string; scope: string }) => {
      const reports = [
        lintWeakAssertion(opts.scope),
        lintHardcodePath(opts.scope),
        lintDebugFileNaming(opts.scope),
        lintOwnerSkillDup(join(repoRoot(), ".claude", "agents")),
      ];
      const all = reports.flatMap((r) => r.violations);
      for (const v of all) {
        const rel = v.file.replace(repoRoot(), ".");
        console.log(`${rel}:${v.lineNumber} [${v.rule}] ${v.matched}`);
      }
      console.log(`\n[cases:lint] violations=${all.length}`);
      const exitableViolations = opts.severity === "fail-only"
        ? all.filter((v) => v.severity !== "warn")
        : all;
      if (opts.exitCode && exitableViolations.length > 0) process.exit(1);
    });
}
