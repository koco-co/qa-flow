import { Command } from "commander";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { rewriteSharedImports } from "../migration/import-fix.ts";
import { projectDir } from "../lib/paths.ts";

export function registerImportFix(program: Command): void {
  program
    .command("features:import-fix")
    .description("Rewrite ../../fixtures/ → ../../../shared/fixtures/ in migrated test files (P3-B leftover)")
    .requiredOption("--project <name>", "project name (e.g. dataAssets)")
    .option("--dry", "report what would change without writing", false)
    .action(async (opts: { project: string; dry: boolean }) => {
      const featuresRoot = join(projectDir(opts.project), "features");
      const features = readdirSync(featuresRoot).filter((f) =>
        statSync(join(featuresRoot, f)).isDirectory()
      );
      let totalScanned = 0;
      let totalRewrites = 0;
      for (const feat of features) {
        const testsDir = join(featuresRoot, feat, "tests");
        try {
          if (!statSync(testsDir).isDirectory()) continue;
        } catch {
          continue;
        }
        if (opts.dry) {
          console.log(`[dry] ${feat} — would scan tests/`);
          continue;
        }
        const result = rewriteSharedImports(testsDir);
        if (result.rewriteCount > 0) {
          console.log(`[fix] ${feat}: rewrote ${result.rewriteCount} imports across ${result.rewrittenFiles.length} files`);
        }
        totalScanned += result.filesScanned;
        totalRewrites += result.rewriteCount;
      }
      console.log(`[features:import-fix] project=${opts.project} files=${totalScanned} rewrites=${totalRewrites}`);
    });
}
