/**
 * backfill-archive-frontmatter.mjs
 * 通过统一审计核心为 Archive Markdown 回填 canonical frontmatter
 */
import {
  formatBackfillRun,
  runMarkdownFrontmatterAudit,
} from "../../../shared/scripts/md-frontmatter-audit-core.mjs";
import { getWorkspaceRoot } from "../../../shared/scripts/load-config.mjs";

const args = process.argv.slice(2);
const pathArg = readFlagValue(args, "--path");
const rootArg = readFlagValue(args, "--root") || getWorkspaceRoot();
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose");
const force = args.includes("--force");

if (args.includes("--legacy")) {
  console.warn("⚠️ --legacy 已废弃；当前仅支持 canonical schema。");
}

const result = runMarkdownFrontmatterAudit({
  root: rootArg,
  includeArchive: true,
  includeRequirements: false,
  fix: true,
  dryRun,
  force,
  paths: pathArg ? [pathArg] : [],
});

process.stdout.write(formatBackfillRun(result, { dryRun, verbose }));
process.exit(result.exitCode);

function readFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1 || index === argv.length - 1) return "";
  return argv[index + 1];
}
