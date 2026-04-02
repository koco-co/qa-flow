/**
 * test-md-frontmatter-audit.mjs
 * 验证 Markdown 全量审计/自动修复脚本对 archive/requirements 的 canonical 化、
 * case_count 修复、body 审计与特殊路径容错行为。
 *
 * 运行: node test-md-frontmatter-audit.mjs
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import {
  normalizeArchiveStatus,
  normalizeRequirementStatus,
  toArchiveDocumentStatus,
  toRequirementDocumentStatus,
} from "../shared/scripts/frontmatter-status-utils.mjs";
import { jsonToMd } from "../skills/archive-converter/scripts/json-to-archive-md.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const scriptPath = resolve(repoRoot, ".claude/shared/scripts/audit-md-frontmatter.mjs");
const prdBackfillScriptPath = resolve(
  repoRoot,
  ".claude/skills/prd-enhancer/scripts/backfill-prd-frontmatter.mjs",
);
const archiveBackfillScriptPath = resolve(
  repoRoot,
  ".claude/skills/archive-converter/scripts/backfill-archive-frontmatter.mjs",
);
const runId = `${process.pid}-${Date.now()}`;
const tempRoot = resolve(__dirname, `__test_md_frontmatter_audit_${runId}`);

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
    if (entry.startsWith("__test_md_frontmatter_audit_")) {
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasStatusIssue(output, relativePath) {
  return new RegExp(
    `${escapeRegExp(relativePath)}(?:\\n- [^\\n]*)*\\n- [^\\n]*status`,
    "m",
  ).test(output);
}

function runAudit(args = []) {
  return runNodeScript(scriptPath, ["--root", tempRoot, ...args]);
}

function runNodeScript(script, args = []) {
  return spawnSync(
    process.execPath,
    [script, ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
}

const archiveRelativePath = "cases/archive/data-assets/v6.4.9/legacy-archive(#12345).md";
const requirementRelativePath = "cases/requirements/data-assets/v6.4.9/legacy-prd-formalized.md";
const elicitedRequirementRelativePath = "cases/requirements/data-assets/v6.4.9/elicited-prd.md";
const chineseRequirementRelativePath = "cases/requirements/data-assets/v6.4.9/chinese-status-prd.md";
const headingOnlyRequirementRelativePath = "cases/requirements/data-assets/v6.4.9/handoff.md";
const bulletArchiveRelativePath = "cases/archive/data-assets/v6.4.9/tree-style-archive.md";
const englishArchiveStatusRelativePath = "cases/archive/data-assets/v6.4.9/english-status-archive.md";
const chineseArchiveRelativePath = "cases/archive/data-assets/v6.4.9/chinese-status-archive.md";
const nonSemverRelativePath = "cases/archive/data-assets/主流程/flow-archive.md";
const standaloneVersionedArchiveRelativePath = "cases/archive/data-assets/v6.4.9/standalone-versioned-archive.md";
const plainPreconditionRelativePath = "cases/archive/data-assets/v6.4.9/plain-precondition-archive.md";
const directBackfillRequirementRelativePath = "cases/requirements/data-assets/v6.4.9/direct-backfill-prd-formalized.md";
const directBackfillArchiveRelativePath = "cases/archive/data-assets/v6.4.9/direct-backfill-archive.md";
const directReviewedArchiveRelativePath = "cases/archive/data-assets/v6.4.9/direct-reviewed-status-archive.md";

const archiveBody = [
  "# Legacy archive(#12345)",
  "",
  "## 数据资产",
  "",
  "### 质量问题台账",
  "",
  "#### 列表页",
  "",
  "##### 验证旧格式用例 「P1」",
  "",
  "1、已登录系统",
  "",
  "| 编号 | 步骤 | 预期 |",
  "| --- | --- | --- |",
  "| 1 | 点击查询按钮 | 成功 |",
  "",
].join("\n");

const requirementBody = [
  "# Legacy PRD",
  "",
  "这里是需求正文。",
  "",
].join("\n");

const bulletArchiveBody = [
  "## 数据资产",
  "",
  "### 质量问题台账",
  "",
  "#### 列表页",
  "",
  "- 验证搜索条件组合筛选",
  "  - 输入关键词与状态",
  "  - 返回过滤结果",
  "",
].join("\n");

const canonicalArchiveBody = [
  "## 数据资产",
  "",
  "##### 【P1】验证主流程入口",
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
  "| 1 | 进入【数据资产】页面 | 页面正常加载 |",
  "",
].join("\n");

const plainPreconditionArchiveBody = [
  "## 数据资产",
  "",
  "##### 【P1】验证纯文本前置条件",
  "",
  "已登录管理员账户",
  "",
  "> 用例步骤",
  "",
  "| 编号 | 步骤 | 预期 |",
  "| --- | --- | --- |",
  "| 1 | 点击查询按钮 | 成功 |",
  "",
].join("\n");

writeFixture(
  archiveRelativePath,
  [
    "---",
    "name: \"Legacy archive(#12345)\"",
    "description: 旧归档描述",
    "module: data-assets",
    "version: v6.4.9",
    "source: cases/xmind/data-assets/v6.4.9/legacy-archive.xmind",
    "created_at: 2026-03-01",
    "status: ARCHIVED",
    "tags:",
    "  - 数据资产",
    "  - 数据质量",
    "  - 邮件通知",
    "---",
    archiveBody,
  ].join("\n"),
);

writeFixture(
  requirementRelativePath,
  [
    "---",
    "name: Legacy PRD",
    "description: 旧需求描述",
    "module: data-assets",
    "version: v6.4.9",
    "source: 内部需求文档",
    "created_at: 2026-03-02",
    "---",
    requirementBody,
  ].join("\n"),
);

writeFixture(
  elicitedRequirementRelativePath,
  [
    "---",
    "prd_name: 已澄清需求",
    "description: 已澄清需求",
    "product: data-assets",
    "create_at: 2026-03-02",
    "status: ELICITED",
    "---",
    requirementBody,
  ].join("\n"),
);

writeFixture(
  chineseRequirementRelativePath,
  [
    "---",
    "prd_name: 中文状态需求",
    "description: 中文状态需求",
    "product: data-assets",
    "create_at: 2026-03-05",
    "status: 已澄清",
    "---",
    requirementBody,
  ].join("\n"),
);

writeFixture(
  headingOnlyRequirementRelativePath,
  [
    "---",
    "product: data-assets",
    "create_at: 2026-03-04",
    "status: RAW",
    "---",
    "# 任务交接文档：PRD 15696【通用配置】json格式配置",
    "",
    "交接说明正文。",
    "",
  ].join("\n"),
);

writeFixture(
  bulletArchiveRelativePath,
  [
    "---",
    "suite_name: 树形归档样例",
    "description: XMind 标题树样例",
    "prd_version: v6.4.9",
    "prd_path: cases/requirements/data-assets/v6.4.9/tree-style-prd.md",
    "product: data-assets",
    "tags:",
    "  - 数据资产",
    "  - 质量问题",
    "  - 标题树",
    "create_at: 2026-03-03",
    "case_count: 0",
    "origin: xmind",
    "status: 已归档",
    "health_warnings: []",
    "---",
    bulletArchiveBody,
  ].join("\n"),
);

writeFixture(
  englishArchiveStatusRelativePath,
  [
    "---",
    "suite_name: 英文 archive 状态样例",
    "description: 英文 archive 状态样例",
    "prd_version: v6.4.9",
    "product: data-assets",
    "tags:",
    "  - 数据资产",
    "  - 状态兼容",
    "  - 归档",
    "create_at: 2026-03-05",
    "case_count: 1",
    "origin: xmind",
    "status: ARCHIVED",
    "health_warnings: []",
    "---",
    canonicalArchiveBody,
  ].join("\n"),
);

writeFixture(
  chineseArchiveRelativePath,
  [
    "---",
    "suite_name: 中文 archive 状态样例",
    "description: 中文 archive 状态样例",
    "prd_version: v6.4.9",
    "product: data-assets",
    "tags:",
    "  - 数据资产",
    "  - 状态兼容",
    "  - 归档",
    "create_at: 2026-03-05",
    "case_count: 1",
    "origin: xmind",
    "status: 已归档",
    "health_warnings: []",
    "---",
    canonicalArchiveBody,
  ].join("\n"),
);

writeFixture(
  nonSemverRelativePath,
  [
    "---",
    "suite_name: 主流程归档",
    "description: 主流程合法样例",
    "product: data-assets",
    "tags:",
    "  - 数据资产",
    "  - 主流程",
    "  - 冒烟",
    "create_at: 2026-03-03",
    "case_count: 1",
    "origin: xmind",
    "status: 已归档",
    "health_warnings: []",
    "---",
    canonicalArchiveBody,
  ].join("\n"),
);

writeFixture(
  standaloneVersionedArchiveRelativePath,
  [
    "---",
    "suite_name: 独立版本归档",
    "description: 无 PRD 关联的独立归档样例",
    "product: data-assets",
    "tags:",
    "  - 数据资产",
    "  - 独立归档",
    "  - 回归",
    "create_at: 2026-03-03",
    "case_count: 1",
    "origin: xmind",
    "status: 已归档",
    "health_warnings: []",
    "---",
    canonicalArchiveBody,
  ].join("\n"),
);

writeFixture(
  plainPreconditionRelativePath,
  [
    "---",
    "suite_name: 纯文本前置条件样例",
    "description: 纯文本前置条件样例",
    "product: data-assets",
    "prd_version: v6.4.9",
    "tags:",
    "  - 数据资产",
    "  - 前置条件",
    "  - 纯文本",
    "create_at: 2026-03-03",
    "case_count: 1",
    "origin: xmind",
    "status: 已归档",
    "health_warnings: []",
    "---",
    plainPreconditionArchiveBody,
  ].join("\n"),
);

writeFixture(
  directBackfillRequirementRelativePath,
  [
    "# 直接回填 PRD",
    "",
    "这里是待回填状态的正文。",
    "",
  ].join("\n"),
);

writeFixture(
  directBackfillArchiveRelativePath,
  [
    "# 直接回填 Archive",
    "",
    "> 来源：cases/xmind/data-assets/v6.4.9/direct-backfill-archive.xmind",
    "> 用例数：1",
    "",
    "## 数据资产",
    "",
    "##### 【P1】验证默认归档状态",
    "",
    "> 前置条件",
    "```",
    "```",
    "",
    "> 用例步骤",
    "",
    "| 编号 | 步骤 | 预期 |",
    "| --- | --- | --- |",
    "| 1 | 进入【数据资产】页面 | 成功 |",
    "",
  ].join("\n"),
);

writeFixture(
  directReviewedArchiveRelativePath,
  [
    "---",
    "suite_name: 旧评审状态归档",
    "description: 旧评审状态归档",
    "prd_path: cases/requirements/data-assets/v6.4.9/reviewed-prd.md",
    "product: data-assets",
    "prd_version: v6.4.9",
    "status: REVIEWED",
    "---",
    "## 数据资产",
    "",
    "##### 【P1】验证旧状态兼容",
    "",
    "> 前置条件",
    "```",
    "```",
    "",
    "> 用例步骤",
    "",
    "| 编号 | 步骤 | 预期 |",
    "| --- | --- | --- |",
    "| 1 | 进入【数据资产】页面 | 成功 |",
    "",
  ].join("\n"),
);

const originalArchive = readFixture(archiveRelativePath);
const originalRequirement = readFixture(requirementRelativePath);
const originalElicitedRequirement = readFixture(elicitedRequirementRelativePath);
const originalChineseRequirement = readFixture(chineseRequirementRelativePath);
const originalHeadingOnlyRequirement = readFixture(headingOnlyRequirementRelativePath);
const originalBulletArchive = readFixture(bulletArchiveRelativePath);
const originalEnglishArchiveStatus = readFixture(englishArchiveStatusRelativePath);
const originalChineseArchive = readFixture(chineseArchiveRelativePath);
const originalCanonicalArchive = readFixture(nonSemverRelativePath);
const originalStandaloneVersionedArchive = readFixture(standaloneVersionedArchiveRelativePath);
const originalPlainPreconditionArchive = readFixture(plainPreconditionRelativePath);

console.log("\n=== Test: status utils preserve case-insensitive compatibility ===");
assert(normalizeRequirementStatus("RAW") === "raw", "normalizeRequirementStatus 兼容大写 RAW");
assert(normalizeRequirementStatus("ELICITED") === "elicited", "normalizeRequirementStatus 兼容大写 ELICITED");
assert(toRequirementDocumentStatus("RAW") === "未开始", "toRequirementDocumentStatus 会把大写 RAW 写回中文文档值");
assert(toRequirementDocumentStatus("ELICITED") === "已澄清", "toRequirementDocumentStatus 会把大写 ELICITED 写回中文文档值");
assert(normalizeArchiveStatus("ARCHIVED") === "archived", "normalizeArchiveStatus 兼容大写 ARCHIVED");
assert(toArchiveDocumentStatus("ARCHIVED") === "已归档", "toArchiveDocumentStatus 会把大写 ARCHIVED 写回中文文档值");

console.log("\n=== Test: backfill/json scripts write chinese document statuses ===");
const directPrdBackfillResult = runNodeScript(prdBackfillScriptPath, [
  "--path",
  resolve(tempRoot, directBackfillRequirementRelativePath),
]);
assert(directPrdBackfillResult.status === 0, "PRD backfill 脚本执行成功", [
  directPrdBackfillResult.stderr.trim(),
  directPrdBackfillResult.stdout.trim(),
].filter(Boolean));
const directBackfilledRequirement = readFixture(directBackfillRequirementRelativePath);
assert(
  /(^|\n)status:\s*已形式化/.test(directBackfilledRequirement),
  "PRD backfill 会根据文件名写入中文 requirement 状态",
  [directBackfilledRequirement],
);

const directArchiveBackfillResult = runNodeScript(archiveBackfillScriptPath, [
  "--path",
  resolve(tempRoot, directBackfillArchiveRelativePath),
]);
assert(directArchiveBackfillResult.status === 0, "archive backfill 脚本执行成功", [
  directArchiveBackfillResult.stderr.trim(),
  directArchiveBackfillResult.stdout.trim(),
].filter(Boolean));
const directBackfilledArchive = readFixture(directBackfillArchiveRelativePath);
assert(
  /(^|\n)status:\s*已归档/.test(directBackfilledArchive),
  "archive backfill 默认写入中文归档状态",
  [directBackfilledArchive],
);

const directReviewedArchiveBackfillResult = runNodeScript(archiveBackfillScriptPath, [
  "--force",
  "--path",
  resolve(tempRoot, directReviewedArchiveRelativePath),
]);
assert(directReviewedArchiveBackfillResult.status === 0, "archive backfill force 模式执行成功", [
  directReviewedArchiveBackfillResult.stderr.trim(),
  directReviewedArchiveBackfillResult.stdout.trim(),
].filter(Boolean));
const directReviewedArchive = readFixture(directReviewedArchiveRelativePath);
assert(
  /(^|\n)status:\s*已评审/.test(directReviewedArchive),
  "archive backfill 会把旧英文 REVIEWED 状态写成中文文档值",
  [directReviewedArchive],
);

const generatedArchiveFromJson = jsonToMd(
  {
    meta: {
      requirement_name: "状态回填样例",
      module_key: "data-assets",
      version: "v6.4.9",
    },
    modules: [
      {
        name: "数据资产",
        test_cases: [
          {
            title: "验证归档状态默认值",
            priority: "P1",
            steps: [
              {
                step: "进入【数据资产】页面",
                expected: "成功",
              },
            ],
          },
        ],
      },
    ],
  },
  "cases/final-reviewed/data-assets/v6.4.9/status-sample.json",
);
assert(
  /(^|\n)status:\s*已归档/.test(generatedArchiveFromJson),
  "json-to-archive-md 默认写入中文归档状态",
  [generatedArchiveFromJson],
);

console.log("\n=== Test: dry-run reports issues but does not modify fixtures ===");
const dryRunResult = runAudit(["--dry-run"]);
assert(dryRunResult.status === 0, "dry-run 执行成功", [
  dryRunResult.stderr.trim(),
  dryRunResult.stdout.trim(),
].filter(Boolean));
assert(dryRunResult.stdout.includes(archiveRelativePath), "dry-run 报告包含 archive 文件路径");
assert(dryRunResult.stdout.includes("H1 标题"), "dry-run 报告包含 H1 标题问题");
assert(dryRunResult.stdout.includes("case_count"), "dry-run 报告包含 case_count 问题");
assert(dryRunResult.stdout.includes("hybrid table"), "dry-run 报告包含 hybrid table 分类");
assert(dryRunResult.stdout.includes("优先级前缀"), "dry-run 报告包含优先级前缀问题");
assert(dryRunResult.stdout.includes("用例步骤"), "dry-run 报告包含用例步骤问题");
assert(dryRunResult.stdout.includes("前置条件"), "dry-run 报告包含前置条件问题");
assert(dryRunResult.stdout.includes("进入【"), "dry-run 报告包含首步格式问题");
assert(dryRunResult.stdout.includes(bulletArchiveRelativePath), "dry-run 报告包含 bullet/XMind archive 文件路径");
assert(dryRunResult.stdout.includes("bullet/XMind tree"), "dry-run 报告包含 bullet/XMind tree 分类");
assert(
  new RegExp(`${escapeRegExp(bulletArchiveRelativePath)}[\\s\\S]*case_count`, "m").test(dryRunResult.stdout),
  "dry-run 会按可重建后的实际用例数报告 bullet/XMind archive 的 case_count 问题",
  [dryRunResult.stdout],
);
assert(dryRunResult.stdout.includes(requirementRelativePath), "dry-run 报告包含 requirement 文件路径");
assert(
  !hasStatusIssue(dryRunResult.stdout, elicitedRequirementRelativePath),
  "合法的大写 requirement status: ELICITED 不会被误报为非法",
  [dryRunResult.stdout],
);
assert(
  !hasStatusIssue(dryRunResult.stdout, chineseRequirementRelativePath),
  "中文 requirement status: 已澄清 不会被误报为非法",
  [dryRunResult.stdout],
);
assert(
  !hasStatusIssue(dryRunResult.stdout, headingOnlyRequirementRelativePath),
  "合法的大写 requirement status: RAW 不会被误报为非法",
  [dryRunResult.stdout],
);
assert(
  !hasStatusIssue(dryRunResult.stdout, englishArchiveStatusRelativePath),
  "合法的大写 archive status: ARCHIVED 不会被误报为非法",
  [dryRunResult.stdout],
);
assert(
  !hasStatusIssue(dryRunResult.stdout, chineseArchiveRelativePath),
  "中文 archive status: 已归档 不会被误报为非法",
  [dryRunResult.stdout],
);
assert(
  new RegExp(`${escapeRegExp(plainPreconditionRelativePath)}[\\s\\S]*前置条件`, "m").test(dryRunResult.stdout),
  "dry-run 会报告纯文本前置条件缺少 > 前置条件 标记",
  [dryRunResult.stdout],
);
assert(
  !dryRunResult.stdout.includes(`${nonSemverRelativePath}\n- ❌ \`prd_version\``),
  "非语义版本目录不会仅因缺 prd_version 被错误报告",
  [dryRunResult.stdout],
);
assert(
  !dryRunResult.stdout.includes(`${standaloneVersionedArchiveRelativePath}\n- ❌ \`prd_version\``),
  "语义版本目录下的独立 archive 不会仅因缺 prd_version 被错误报告",
  [dryRunResult.stdout],
);
assert(
  !dryRunResult.stdout.includes(`${nonSemverRelativePath}\n- ⚠️ Body 结构类型为`),
  "已归一化 archive 不会被错误标记为非 canonical table",
  [dryRunResult.stdout],
);
assert(readFixture(archiveRelativePath) === originalArchive, "dry-run 不修改 archive 文件");
assert(readFixture(requirementRelativePath) === originalRequirement, "dry-run 不修改 requirement 文件");
assert(readFixture(elicitedRequirementRelativePath) === originalElicitedRequirement, "dry-run 不修改 elicited requirement 文件");
assert(readFixture(chineseRequirementRelativePath) === originalChineseRequirement, "dry-run 不修改中文 requirement 文件");
assert(readFixture(headingOnlyRequirementRelativePath) === originalHeadingOnlyRequirement, "dry-run 不修改 heading-only requirement 文件");
assert(readFixture(bulletArchiveRelativePath) === originalBulletArchive, "dry-run 不修改 bullet/XMind archive 文件");
assert(readFixture(englishArchiveStatusRelativePath) === originalEnglishArchiveStatus, "dry-run 不修改英文 archive 状态文件");
assert(readFixture(chineseArchiveRelativePath) === originalChineseArchive, "dry-run 不修改中文 archive 状态文件");
assert(readFixture(standaloneVersionedArchiveRelativePath) === originalStandaloneVersionedArchive, "dry-run 不修改独立 versioned archive 文件");
assert(readFixture(plainPreconditionRelativePath) === originalPlainPreconditionArchive, "dry-run 不修改纯文本前置条件 archive 文件");

console.log("\n=== Test: fix mode canonicalizes archive frontmatter and preserves body ===");
const fixResult = runAudit(["--fix"]);
assert(fixResult.status === 0, "fix 模式执行成功", [
  fixResult.stderr.trim(),
  fixResult.stdout.trim(),
].filter(Boolean));

const fixedArchive = readFixture(archiveRelativePath);
assert(/(^|\n)suite_name:\s*"Legacy archive\(#12345\)"/.test(fixedArchive), "archive 已写入 canonical suite_name");
assert(/(^|\n)product:\s*data-assets/.test(fixedArchive), "archive 已写入 product");
assert(/(^|\n)create_at:\s*2026-03-01/.test(fixedArchive), "archive 已迁移 create_at");
assert(/(^|\n)case_count:\s*1/.test(fixedArchive), "archive 已写入正确 case_count");
assert(/(^|\n)origin:\s*xmind/.test(fixedArchive), "archive 已推断 origin");
assert(/(^|\n)status:\s*已归档/.test(fixedArchive), "archive 会把旧英文 status 写为中文文档值");
assert(/(^|\n)health_warnings:\s*\[\]/.test(fixedArchive), "archive 已补空数组 health_warnings");
assert(!/(^|\n)prd_id:/.test(fixedArchive), "archive 未确认 PRD 关联时不会凭文件名补写 prd_id", [fixedArchive]);
assert(!/(^|\n)prd_version:/.test(fixedArchive), "archive 未确认 PRD 关联时不会仅凭目录版本补写 prd_version", [fixedArchive]);
assert(!/(^|\n)prd_path:/.test(fixedArchive), "archive 未确认 PRD 关联时不会写半套 prd_path", [fixedArchive]);
assert(!/(^|\n)name:/.test(fixedArchive), "archive 已移除 legacy name 字段");
assert(!/(^|\n)module:/.test(fixedArchive), "archive 已移除 legacy module 字段");
assert(!/(^|\n)version:/.test(fixedArchive), "archive 已移除 legacy version 字段");
assert(!/(^|\n)created_at:/.test(fixedArchive), "archive 已移除 legacy created_at 字段");
assert(
  !fixedArchive.includes("\n# Legacy archive(#12345)\n"),
  "archive body 顶层 H1 已移除",
  [fixedArchive],
);
assert(
  fixedArchive.includes("##### 【P1】验证旧格式用例"),
  "archive body 已补 canonical 标题优先级前缀",
  [fixedArchive],
);
assert(
  fixedArchive.includes("> 前置条件\n```\n1、已登录系统\n```"),
  "archive body 已补前置条件区块",
  [fixedArchive],
);
assert(
  fixedArchive.includes("> 用例步骤\n\n| 编号 | 步骤 | 预期 |"),
  "archive body 已补用例步骤标记",
  [fixedArchive],
);
assert(
  fixedArchive.includes("| 1 | 进入【质量问题台账-列表页】页面，点击查询按钮 | 成功 |"),
  "archive body 已补首步进入页面格式",
  [fixedArchive],
);

console.log("\n=== Test: fix mode canonicalizes requirement frontmatter ===");
const fixedRequirement = readFixture(requirementRelativePath);
assert(/(^|\n)prd_name:\s*Legacy PRD/.test(fixedRequirement), "requirement 已写入 canonical prd_name");
assert(/(^|\n)prd_source:\s*"?内部需求文档"?/.test(fixedRequirement), "requirement 已迁移 prd_source");
assert(/(^|\n)prd_version:\s*v6\.4\.9/.test(fixedRequirement), "requirement 已迁移 prd_version");
assert(/(^|\n)product:\s*data-assets/.test(fixedRequirement), "requirement 已写入 product");
assert(/(^|\n)create_at:\s*2026-03-02/.test(fixedRequirement), "requirement 已迁移 create_at");
assert(/(^|\n)status:\s*已形式化/.test(fixedRequirement), "requirement 已根据文件名推断状态并写入中文文档值");
assert(!/(^|\n)name:/.test(fixedRequirement), "requirement 已移除 legacy name 字段");
assert(!/(^|\n)module:/.test(fixedRequirement), "requirement 已移除 legacy module 字段");
assert(!/(^|\n)version:/.test(fixedRequirement), "requirement 已移除 legacy version 字段");
assert(!/(^|\n)created_at:/.test(fixedRequirement), "requirement 已移除 legacy created_at 字段");
assert(
  fixedRequirement.endsWith(requirementBody),
  "requirement 修复仅修改 frontmatter，不改 body",
  [fixedRequirement],
);
const fixedElicitedRequirement = readFixture(elicitedRequirementRelativePath);
assert(/(^|\n)status:\s*已澄清/.test(fixedElicitedRequirement), "fix 模式会把合法的大写 ELICITED requirement 状态写为中文文档值", [
  fixedElicitedRequirement,
]);
const fixedChineseRequirement = readFixture(chineseRequirementRelativePath);
assert(/(^|\n)status:\s*已澄清/.test(fixedChineseRequirement), "fix 模式会保留中文 requirement 状态语义", [
  fixedChineseRequirement,
]);
const fixedHeadingOnlyRequirement = readFixture(headingOnlyRequirementRelativePath);
assert(
  /(^|\n)status:\s*未开始/.test(fixedHeadingOnlyRequirement),
  "fix 模式会把合法的大写 RAW requirement 状态写为中文文档值",
  [fixedHeadingOnlyRequirement],
);
assert(
  /(^|\n)prd_name:\s*任务交接文档：PRD 15696【通用配置】json格式配置/.test(fixedHeadingOnlyRequirement),
  "缺少 prd_name 的 requirement 会从首个 H1 安全回填",
  [fixedHeadingOnlyRequirement],
);
assert(
  /(^|\n)description:\s*任务交接文档：PRD 15696【通用配置】json格式配置/.test(fixedHeadingOnlyRequirement),
  "缺少 description 的 requirement 会从首个 H1 安全回填",
  [fixedHeadingOnlyRequirement],
);
const fixedBulletArchive = readFixture(bulletArchiveRelativePath);
assert(
  /(^|\n)case_count:\s*1/.test(fixedBulletArchive),
  "bullet/XMind archive 修复后会同步正确 case_count",
  [fixedBulletArchive],
);
assert(
  /(^|\n)prd_version:\s*v6\.4\.9/.test(fixedBulletArchive),
  "bullet/XMind archive 已确认的 prd_version 不会在 fix 模式被抹掉",
  [fixedBulletArchive],
);
assert(
  /(^|\n)prd_path:\s*cases\/requirements\/data-assets\/v6\.4\.9\/tree-style-prd\.md/.test(fixedBulletArchive),
  "bullet/XMind archive 已确认的 prd_path 不会在 fix 模式被抹掉",
  [fixedBulletArchive],
);
assert(
  fixedBulletArchive.includes("##### 【P2】验证搜索条件组合筛选"),
  "bullet/XMind archive 修复后会重建 canonical case 标题",
  [fixedBulletArchive],
);
assert(
  fixedBulletArchive.includes("> 前置条件\n```\n```"),
  "bullet/XMind archive 无法解析前置条件时保持空白 fenced block",
  [fixedBulletArchive],
);
assert(
  fixedBulletArchive.includes("| 1 | 进入【质量问题台账-列表页】页面，输入关键词与状态 | 返回过滤结果 |"),
  "bullet/XMind archive 修复后会把 bullet tree 映射为 canonical step table",
  [fixedBulletArchive],
);
const fixedEnglishArchiveStatus = readFixture(englishArchiveStatusRelativePath);
assert(
  /(^|\n)status:\s*已归档/.test(fixedEnglishArchiveStatus),
  "fix 模式会把合法的大写 ARCHIVED archive 状态写为中文文档值",
  [fixedEnglishArchiveStatus],
);
const fixedChineseArchive = readFixture(chineseArchiveRelativePath);
assert(
  /(^|\n)status:\s*已归档/.test(fixedChineseArchive),
  "fix 模式会保留中文 archive 状态语义",
  [fixedChineseArchive],
);
const fixedStandaloneVersionedArchive = readFixture(standaloneVersionedArchiveRelativePath);
assert(
  !/(^|\n)prd_version:/.test(fixedStandaloneVersionedArchive),
  "fix 模式不会为独立 versioned archive 虚构 prd_version",
  [fixedStandaloneVersionedArchive],
);
const fixedPlainPreconditionArchive = readFixture(plainPreconditionRelativePath);
assert(
  fixedPlainPreconditionArchive.includes("> 前置条件\n```\n已登录管理员账户\n```"),
  "fix 模式会把纯文本前置条件重写为 canonical 前置条件区块",
  [fixedPlainPreconditionArchive],
);
assert(readFixture(nonSemverRelativePath).endsWith(canonicalArchiveBody), "fix 模式不改写 canonical body");

console.log("\n=== Test: post-fix dry-run reduces table-style body warnings ===");
const postFixDryRunResult = runAudit(["--dry-run"]);
assert(postFixDryRunResult.status === 0, "post-fix dry-run 执行成功", [
  postFixDryRunResult.stderr.trim(),
  postFixDryRunResult.stdout.trim(),
].filter(Boolean));
assert(
  !postFixDryRunResult.stdout.includes(archiveRelativePath),
  "修复后 table-style archive 样例不再出现在 dry-run body 警告中",
  [postFixDryRunResult.stdout],
);
assert(
  !postFixDryRunResult.stdout.includes(`${bulletArchiveRelativePath}\n- ⚠️ Body 结构类型为`)
    && !postFixDryRunResult.stdout.includes(`${bulletArchiveRelativePath}\n- ⚠️ 步骤表格第一步未以“进入【”开头`),
  "修复后 bullet/XMind-style archive 不再出现 body 结构/首步格式警告",
  [postFixDryRunResult.stdout],
);

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
