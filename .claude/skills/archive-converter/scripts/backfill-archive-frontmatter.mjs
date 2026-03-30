#!/usr/bin/env node
import {
  collectTargetFiles,
  previewCanonicalFrontMatter,
  runFrontMatterAudit,
} from "../../../shared/scripts/md-frontmatter-audit-core.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const rootIndex = args.indexOf("--root");
const pathIndex = args.indexOf("--path");
const root = rootIndex >= 0 ? args[rootIndex + 1] : undefined;
const pathArg = pathIndex >= 0 ? args[pathIndex + 1] : undefined;

if (dryRun) {
  const files = collectTargetFiles({ root, archiveOnly: true, pathArg });
  for (const filePath of files) {
    process.stdout.write(`[dry-run] ${filePath}\n`);
    process.stdout.write(previewCanonicalFrontMatter(filePath, { root }));
  }
  process.exit(0);
}

const result = runFrontMatterAudit({
  root,
  archiveOnly: true,
  pathArg,
  fix: true,
});
process.stdout.write(result.output);
process.exit(result.exitCode);
