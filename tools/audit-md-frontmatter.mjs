#!/usr/bin/env node
import { runFrontMatterAudit } from "../.claude/shared/scripts/md-frontmatter-audit-core.mjs";

const args = process.argv.slice(2);
const fix = args.includes("--fix");
const archiveOnly = args.includes("--archive");
const requirementsOnly = args.includes("--requirements");
const rootIndex = args.indexOf("--root");
const pathIndex = args.indexOf("--path");
const root = rootIndex >= 0 ? args[rootIndex + 1] : undefined;
const pathArg = pathIndex >= 0 ? args[pathIndex + 1] : undefined;

const result = runFrontMatterAudit({
  root,
  archiveOnly,
  requirementsOnly,
  pathArg,
  fix,
});

process.stdout.write(result.output);
process.exit(result.exitCode);
