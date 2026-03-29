#!/usr/bin/env node
import { runMarkdownFrontmatterAudit } from "../.claude/shared/scripts/md-frontmatter-audit-core.mjs";
import { getWorkspaceRoot } from "../.claude/shared/scripts/load-config.mjs";

const args = process.argv.slice(2);
const pathArgs = collectRepeatedFlag(args, "--path");
const rootArg = readFlagValue(args, "--root") || getWorkspaceRoot();
const includeArchive = args.includes("--archive");
const includeRequirements = args.includes("--requirements");
const fix = args.includes("--fix");
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

if (args.includes("--help")) {
  printHelp();
  process.exit(0);
}

const result = runMarkdownFrontmatterAudit({
  root: rootArg,
  includeArchive: includeArchive || !includeRequirements,
  includeRequirements: includeRequirements || !includeArchive,
  fix,
  dryRun,
  force,
  paths: pathArgs,
});

process.stdout.write(result.report);
process.exit(result.exitCode);

function readFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1 || index === argv.length - 1) return "";
  return argv[index + 1];
}

function collectRepeatedFlag(argv, flag) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === flag && index < argv.length - 1) {
      values.push(argv[index + 1]);
      index += 1;
    }
  }
  return values;
}

function printHelp() {
  console.log(`Usage: node tools/audit-md-frontmatter.mjs [options]\n
Options:\n  --archive         Audit cases/archive only\n  --requirements    Audit cases/requirements only\n  --path <path>     Limit to a file or directory (repeatable)\n  --root <path>     Override workspace root for scanned content\n  --fix             Rewrite inferable frontmatter fields\n  --dry-run         Preview fixes without writing files\n  --force           Rewrite even if frontmatter already looks canonical\n  --help            Show this help text`);
}
