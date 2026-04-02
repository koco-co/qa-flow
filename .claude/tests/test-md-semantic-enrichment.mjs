/**
 * test-md-semantic-enrichment.mjs
 * 验证 archive 语义补全只使用可追溯来源：
 * - prd_id 来自已确认的 PRD 文件名/标题
 * - prd_path 仅在已确认候选存在时回填
 * - tags 从 PRD 标题/heading 安全扩充
 * - description 仅压缩为可追溯短描述，不臆造
 *
 * 运行: node .claude/tests/test-md-semantic-enrichment.mjs
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { spawnSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const scriptPath = resolve(repoRoot, ".claude/shared/scripts/audit-md-frontmatter.mjs");
const runId = `${process.pid}-${Date.now()}`;
const tempRoot = resolve(__dirname, `__test_md_semantic_enrichment_${runId}`);

let passed = 0;
let failed = 0;

function assert(condition, msg, details = []) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
    return;
  }

  console.error(`  ❌ ${msg}`);
  details.forEach((detail) => console.error(`     - ${detail}`));
  failed++;
}

function cleanup() {
  rmSync(tempRoot, { recursive: true, force: true });
}

function cleanupStale() {
  for (const entry of readdirSync(__dirname)) {
    if (entry.startsWith("__test_md_semantic_enrichment_")) {
      rmSync(resolve(__dirname, entry), { recursive: true, force: true });
    }
  }
}

process.on("exit", cleanup);
cleanupStale();

function writeFixture(relativePath, content) {
  const fullPath = resolve(tempRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
  return fullPath;
}

function readFixture(relativePath) {
  return readFileSync(resolve(tempRoot, relativePath), "utf8");
}

function runAudit(args = []) {
  return spawnSync(
    process.execPath,
    [scriptPath, "--root", tempRoot, ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
}

const archiveRelativePath = "cases/archive/data-assets/v6.4.10/数据质量-质量问题台账.md";
const prdRelativePath = "cases/requirements/data-assets/v6.4.10/PRD-26-数据质量-质量问题台账.md";

writeFixture(
  archiveRelativePath,
  [
    "---",
    "suite_name: 数据质量-质量问题台账（XMind）",
    "description: 这是一段特别特别长的历史描述，用来模拟 legacy archive 中超过六十个字符的 description 需要被安全压缩。",
    "product: data-assets",
    "prd_version: v6.4.10",
    "tags:",
    "  - 数据资产",
    "create_at: 2026-03-30",
    "case_count: 1",
    "origin: xmind",
    "status: \"\"",
    "health_warnings: []",
    "---",
    "## 数据质量",
    "",
    "### 质量问题台账",
    "",
    "##### 【P1】验证详情抽屉展示",
    "",
    "> 前置条件",
    "```",
    "已登录系统",
    "```",
    "",
    "> 用例步骤",
    "",
    "| 编号 | 步骤 | 预期 |",
    "| --- | --- | --- |",
    "| 1 | 进入【质量问题台账】页面 | 页面正常加载 |",
    "",
  ].join("\n"),
);

writeFixture(
  prdRelativePath,
  [
    "---",
    "prd_name: PRD-26 数据质量-质量问题台账",
    "description: 数据质量-质量问题台账",
    "product: data-assets",
    "create_at: 2026-03-28",
    "status: formalized",
    "---",
    "# PRD-26 数据质量-质量问题台账",
    "",
    "## 质量问题台账",
    "",
    "### 搜索筛选",
    "",
    "### 详情抽屉",
    "",
  ].join("\n"),
);

console.log("\n=== Test: dry-run surfaces semantic warnings before enrichment ===");
const dryRunResult = runAudit(["--dry-run"]);
assert(dryRunResult.status === 0, "dry-run 执行成功", [
  dryRunResult.stderr.trim(),
  dryRunResult.stdout.trim(),
].filter(Boolean));
assert(dryRunResult.stdout.includes(archiveRelativePath), "dry-run 报告包含语义补全样例路径");
assert(dryRunResult.stdout.includes("`prd_id` 缺失"), "dry-run 会报告缺少 prd_id", [
  dryRunResult.stdout,
]);
assert(dryRunResult.stdout.includes("tags 数量为 1"), "dry-run 会报告 tags 数量不足", [
  dryRunResult.stdout,
]);
assert(dryRunResult.stdout.includes("`description` 超过 60 字"), "dry-run 会报告 description 超长", [
  dryRunResult.stdout,
]);

console.log("\n=== Test: fix mode enriches only traceable semantic fields ===");
const fixResult = runAudit(["--fix"]);
assert(fixResult.status === 0, "fix 模式执行成功", [
  fixResult.stderr.trim(),
  fixResult.stdout.trim(),
].filter(Boolean));

const fixedArchive = readFixture(archiveRelativePath);
assert(/(^|\n)prd_id:\s*26/.test(fixedArchive), "fix 模式会从已确认 PRD 路径/标题补全 prd_id", [
  fixedArchive,
]);
assert(
  /(^|\n)prd_path:\s*cases\/requirements\/data-assets\/v6\.4\.10\/PRD-26-数据质量-质量问题台账\.md/.test(fixedArchive),
  "fix 模式仅在已确认候选存在时回填 prd_path",
  [fixedArchive],
);
assert(
  /(^|\n)description:\s*PRD-26 数据质量-质量问题台账/.test(fixedArchive),
  "fix 模式会把超长 description 压缩为可追溯短描述",
  [fixedArchive],
);
assert(
  !fixedArchive.includes("这是一段特别特别长的历史描述"),
  "fix 模式不会保留超长旧 description",
  [fixedArchive],
);
assert(
  /(^|\n)tags:\n(?:\s+- .+\n){3,}/.test(fixedArchive)
    && fixedArchive.includes("  - 数据资产\n")
    && fixedArchive.includes("  - 质量问题台账\n")
    && fixedArchive.includes("  - 搜索筛选\n"),
  "fix 模式会基于 PRD 标题与 headings 安全扩充 tags",
  [fixedArchive],
);

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
