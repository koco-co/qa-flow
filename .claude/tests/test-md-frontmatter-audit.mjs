/**
 * test-md-frontmatter-audit.mjs
 * 回归测试：覆盖 Markdown frontmatter 审计 / 修复 CLI 与 backfill 包装脚本
 *
 * 运行: node .claude/tests/test-md-frontmatter-audit.mjs
 */
import {
  mkdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const cliPath = resolve(repoRoot, "tools", "audit-md-frontmatter.mjs");
const archiveBackfillPath = resolve(
  repoRoot,
  ".claude/skills/archive-converter/scripts/backfill-archive-frontmatter.mjs",
);
const prdBackfillPath = resolve(
  repoRoot,
  ".claude/skills/prd-enhancer/scripts/backfill-prd-frontmatter.mjs",
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

process.on("exit", cleanup);

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeFile(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content, "utf8");
}

function runNodeScript(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  return {
    code: result.status ?? 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function readBodyWithoutFrontMatter(content) {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length) : content;
}

function assertIncludes(haystack, needle, msg) {
  assert(haystack.includes(needle), msg, [`missing: ${needle}`]);
}

async function main() {
  cleanup();
  ensureDir(tempRoot);

  console.log("\n=== Test: unified CLI report-only flags archive frontmatter/body issues ===");
  const archiveFile = resolve(
    tempRoot,
    "cases/archive/data-assets/v6.4.9/【数据质量】质量校验不通过时支持发送邮件(#10307).md",
  );
  const requirementForArchive = resolve(
    tempRoot,
    "cases/requirements/data-assets/v6.4.9/【数据质量】质量校验不通过时支持发送邮件.md",
  );

  const archiveContent = `---
name: "【数据质量】质量校验不通过时支持发送邮件(#10307)（XMind）"
description: "【数据质量】质量校验不通过时支持发送邮件(#10307)（XMind）"
tags:
  - 数据资产
  - 数据质量
module: data-assets
version: v6.4.9
source: "cases/xmind/data-assets/v6.4.9/质量校验.xmind"
created_at: 2026-01-15
---
# 【数据质量】质量校验不通过时支持发送邮件(#10307)（XMind）

## 模块名称

### 菜单名称

##### 验证缺少优先级前缀

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 打开页面 | 页面加载 |

##### 【P1】验证缺少前置条件标记

1、准备测试数据

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 选择任务 | 任务成功选择 |
`;

  writeFile(archiveFile, archiveContent);
  writeFile(
    requirementForArchive,
    `---
prd_name: "【数据质量】质量校验不通过时支持发送邮件"
description: "质量校验失败邮件支持发送明细数据"
product: data-assets
create_at: 2026-01-10
status: raw
health_warnings: []
repos: []
tags: []
case_path: ""
---
【数据质量】质量校验不通过时支持发送邮件
`,
  );

  const archiveReport = runNodeScript(cliPath, [
    "--root",
    tempRoot,
    "--archive",
    "--path",
    archiveFile,
  ]);

  assert(archiveReport.code === 1, "archive report-only 发现问题并返回非 0", [
    archiveReport.stdout.trim(),
    archiveReport.stderr.trim(),
  ].filter(Boolean));
  assertIncludes(archiveReport.stdout, "data-assets/v6.4.9", "报告按 bucket 分组展示");
  assertIncludes(archiveReport.stdout, "legacy frontmatter", "报告提示 legacy frontmatter");
  assertIncludes(archiveReport.stdout, "missing prd_path", "报告提示缺少 prd_path");
  assertIncludes(archiveReport.stdout, "body contains H1", "报告提示 body H1 警告");

  console.log("\n=== Test: malformed case_count is reported instead of coerced ===");
  const malformedCaseCountFile = resolve(
    tempRoot,
    "cases/archive/custom/xyzh/信永中和-空用例.md",
  );
  writeFile(
    malformedCaseCountFile,
    `---
suite_name: 信永中和-空用例
description: 信永中和-空用例
product: xyzh
tags:
  - 信永中和
  - 质量问题
  - 台账
create_at: 2026-01-10
status: ""
health_warnings: []
case_count:
---
## 台账
`,
  );
  const malformedCaseCountReport = runNodeScript(cliPath, [
    "--root",
    tempRoot,
    "--archive",
    "--path",
    malformedCaseCountFile,
  ]);
  assert(malformedCaseCountReport.code === 1, "malformed case_count 会导致 report 非 0", [
    malformedCaseCountReport.stdout.trim(),
    malformedCaseCountReport.stderr.trim(),
  ].filter(Boolean));
  assertIncludes(malformedCaseCountReport.stdout, "invalid case_count", "报告提示 malformed case_count");

  console.log("\n=== Test: explicit empty prd_path is accepted for archive ===");
  const emptyPrdPathFile = resolve(
    tempRoot,
    "cases/archive/custom/xyzh/信永中和-允许空prd_path.md",
  );
  writeFile(
    emptyPrdPathFile,
    `---
suite_name: 信永中和-允许空prd_path
description: 信永中和-允许空prd_path
prd_path: ""
product: xyzh
tags:
  - 信永中和
  - 质量问题
  - 台账
create_at: 2026-01-10
status: ""
health_warnings: []
case_count: 1
---
##### 【P1】验证台账查询

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【信永中和】-【质量问题台账】页面 | 页面正常加载 |
`,
  );
  const emptyPrdPathReport = runNodeScript(cliPath, [
    "--root",
    tempRoot,
    "--archive",
    "--path",
    emptyPrdPathFile,
  ]);
  assert(emptyPrdPathReport.code === 0, "显式空 prd_path 不应被判错", [
    emptyPrdPathReport.stdout.trim(),
    emptyPrdPathReport.stderr.trim(),
  ].filter(Boolean));
  assert(!emptyPrdPathReport.stdout.includes("missing prd_path"), "报告不会把 prd_path: \"\" 视为缺失");

  console.log("\n=== Test: unified CLI fix rewrites archive frontmatter and preserves body ===");
  const originalArchiveBody = readBodyWithoutFrontMatter(readFileSync(archiveFile, "utf8"));
  const archiveFix = runNodeScript(cliPath, [
    "--root",
    tempRoot,
    "--archive",
    "--path",
    archiveFile,
    "--fix",
  ]);
  assert(archiveFix.code === 0, "archive fix 成功", [
    archiveFix.stdout.trim(),
    archiveFix.stderr.trim(),
  ].filter(Boolean));

  const fixedArchiveContent = readFileSync(archiveFile, "utf8");
  const fixedArchiveFrontMatter = fixedArchiveContent.match(/^---\r?\n[\s\S]*?\r?\n---/m)?.[0] || "";
  const fixedArchiveBody = readBodyWithoutFrontMatter(fixedArchiveContent);
  assertIncludes(fixedArchiveFrontMatter, 'suite_name: "【数据质量】质量校验不通过时支持发送邮件(#10307)"', "archive 写入 canonical suite_name");
  assertIncludes(fixedArchiveFrontMatter, "prd_id: 10307", "archive 从文件名推断 prd_id");
  assertIncludes(fixedArchiveFrontMatter, 'prd_version: v6.4.9', "archive 从路径推断 prd_version");
  assertIncludes(
    fixedArchiveFrontMatter,
    'prd_path: cases/requirements/data-assets/v6.4.9/【数据质量】质量校验不通过时支持发送邮件.md',
    "archive 关联 requirements 路径",
  );
  assertIncludes(fixedArchiveFrontMatter, 'product: data-assets', "archive 写入 canonical product");
  assertIncludes(fixedArchiveFrontMatter, 'create_at: 2026-01-15', "archive 保留 legacy create_at");
  assertIncludes(fixedArchiveFrontMatter, 'status: ""', "archive 默认 status 为空字符串");
  assertIncludes(fixedArchiveFrontMatter, 'health_warnings: []', "archive 默认 health_warnings 为空数组");
  assertIncludes(fixedArchiveFrontMatter, "case_count: 2", "archive 写入 case_count");
  assert(!fixedArchiveFrontMatter.includes("\nname:"), "archive 已移除 legacy name 字段");
  assert(!fixedArchiveFrontMatter.includes("\nmodule:"), "archive 已移除 legacy module 字段");
  assert(!fixedArchiveFrontMatter.includes("\nsource:"), "archive 已移除 legacy source 字段");
  assert(fixedArchiveBody === originalArchiveBody, "archive fix 不改动 body 文本");

  console.log("\n=== Test: unified CLI fix inserts requirements canonical frontmatter with mtime fallback ===");
  const requirementFile = resolve(
    tempRoot,
    "cases/requirements/custom/xyzh/数据质量-质量问题台账-enhanced.md",
  );
  writeFile(
    requirementFile,
    `<!-- enhanced-at: 2026-03-26T02:37:41Z | images: 9/9 | health: 1 warnings -->

# PRD-26 数据质量-质量问题台账

> 来源：内部需求文档
> 开发版本：6.3信永中和定制化分支

本模块用于管理质量问题台账。

> ⚠️ [W001] 缺少字段定义表
`,
  );
  const expectedRequirementDate = new Date("2026-02-01T00:00:00Z");
  utimesSync(requirementFile, expectedRequirementDate, expectedRequirementDate);

  const originalRequirementBody = readFileSync(requirementFile, "utf8");
  const requirementFix = runNodeScript(cliPath, [
    "--root",
    tempRoot,
    "--requirements",
    "--path",
    requirementFile,
    "--fix",
  ]);
  assert(requirementFix.code === 0, "requirements fix 成功", [
    requirementFix.stdout.trim(),
    requirementFix.stderr.trim(),
  ].filter(Boolean));

  const fixedRequirementContent = readFileSync(requirementFile, "utf8");
  const fixedRequirementFrontMatter = fixedRequirementContent.match(/^---\r?\n[\s\S]*?\r?\n---/m)?.[0] || "";
  const fixedRequirementBody = readBodyWithoutFrontMatter(fixedRequirementContent);
  assertIncludes(fixedRequirementFrontMatter, 'prd_name: 数据质量-质量问题台账', "requirements 写入 canonical prd_name");
  assertIncludes(fixedRequirementFrontMatter, 'product: xyzh', "requirements 从路径推断 product");
  assertIncludes(fixedRequirementFrontMatter, 'create_at: 2026-02-01', "requirements 使用 mtime 回填 create_at");
  assertIncludes(fixedRequirementFrontMatter, 'status: enhanced', "requirements 推断 enhanced 状态");
  assertIncludes(fixedRequirementFrontMatter, 'prd_source: 内部需求文档', "requirements 回填 prd_source");
  assertIncludes(fixedRequirementFrontMatter, 'case_path: ""', "requirements 默认 case_path 为空");
  assert(!fixedRequirementFrontMatter.includes("\nname:"), "requirements 已移除 legacy name 字段");
  assert(fixedRequirementBody === originalRequirementBody, "requirements fix 不改动 body 文本");

  console.log("\n=== Test: requirements fix normalizes invalid status and allows long description ===");
  const longDescriptionPrd = resolve(
    tempRoot,
    "cases/requirements/custom/xyzh/数据质量-质量问题台账-formalized.md",
  );
  writeFile(
    longDescriptionPrd,
    `---
prd_name: 数据质量-质量问题台账
description: 这是一个超过六十个字符的需求描述，用于确认 requirements 审计不会因为描述较长而直接给出长度告警，同时还会校正非法状态值。
product: xyzh
status: invalid-status
---
正文
`,
  );
  const expectedLongDescriptionDate = new Date("2026-02-02T00:00:00Z");
  utimesSync(longDescriptionPrd, expectedLongDescriptionDate, expectedLongDescriptionDate);
  const longDescriptionFix = runNodeScript(cliPath, [
    "--root",
    tempRoot,
    "--requirements",
    "--path",
    longDescriptionPrd,
    "--fix",
  ]);
  assert(longDescriptionFix.code === 0, "requirements invalid status fix 成功", [
    longDescriptionFix.stdout.trim(),
    longDescriptionFix.stderr.trim(),
  ].filter(Boolean));
  const fixedLongDescriptionContent = readFileSync(longDescriptionPrd, "utf8");
  const fixedLongDescriptionFrontMatter = fixedLongDescriptionContent.match(/^---\r?\n[\s\S]*?\r?\n---/m)?.[0] || "";
  assertIncludes(fixedLongDescriptionFrontMatter, "create_at: 2026-02-02", "已有 frontmatter 但缺 create_at 时也会使用 mtime");
  assertIncludes(fixedLongDescriptionFrontMatter, "status: formalized", "invalid status 会按文件名归一化");
  const longDescriptionReport = runNodeScript(cliPath, [
    "--root",
    tempRoot,
    "--requirements",
    "--path",
    longDescriptionPrd,
  ]);
  assert(longDescriptionReport.code === 0, "requirements 长描述不会单独触发告警", [
    longDescriptionReport.stdout.trim(),
    longDescriptionReport.stderr.trim(),
  ].filter(Boolean));
  assert(!longDescriptionReport.stdout.includes("description > 60 chars"), "requirements 报告不再检查 description 长度");

  console.log("\n=== Test: archive backfill wrapper delegates to canonical audit core ===");
  const wrapperArchiveFile = resolve(
    tempRoot,
    "cases/archive/custom/xyzh/信永中和质量问题台账.md",
  );
  writeFile(
    wrapperArchiveFile,
    `---
name: 信永中和质量问题台账（XMind）
description: 信永中和质量问题台账（XMind）
tags:
  - 信永中和
module: xyzh
source: "cases/xmind/custom/xyzh/信永中和质量问题台账.xmind"
created_at: 2026-01-20
---
# 信永中和质量问题台账（XMind）

##### 【P1】验证台账查询

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【信永中和】-【质量问题台账】页面 | 页面正常加载 |
`,
  );
  const archiveBackfillDryRun = runNodeScript(archiveBackfillPath, [
    "--root",
    tempRoot,
    "--path",
    wrapperArchiveFile,
    "--dry-run",
  ]);
  assert(archiveBackfillDryRun.code === 0, "archive backfill dry-run 成功", [
    archiveBackfillDryRun.stdout.trim(),
    archiveBackfillDryRun.stderr.trim(),
  ].filter(Boolean));
  assertIncludes(archiveBackfillDryRun.stdout, "suite_name:", "archive backfill 输出 canonical 字段");
  assert(!archiveBackfillDryRun.stdout.includes("\nname:"), "archive backfill 不再输出 legacy 字段");

  console.log("\n=== Test: PRD backfill wrapper delegates to canonical audit core ===");
  const wrapperPrdFile = resolve(
    tempRoot,
    "cases/requirements/data-assets/v6.4.10/【内置规则丰富】合理性校验-多表字段值对比.md",
  );
  writeFile(
    wrapperPrdFile,
    `---
name: PRD-15530 【内置规则丰富】合理性校验-多表字段值对比
description: 在现有合理性校验规则类型下，新增多表字段值对比子类型
source: "蓝湖原型 15530 + 源码分析"
module: data-assets
prd_id: 15530
created_at: 2026-01-30
status: enhanced
enhanced_at: "2026-03-29T05:45:00Z"
---
# PRD-15530 【内置规则丰富】合理性校验-多表字段值对比

> 来源：蓝湖原型 15530 + 源码分析
> 开发版本：6.3岚图定制化分支

在现有合理性校验规则类型下，新增多表字段值对比子类型。
`,
  );
  const prdBackfillDryRun = runNodeScript(prdBackfillPath, [
    "--root",
    tempRoot,
    "--path",
    wrapperPrdFile,
    "--dry-run",
  ]);
  assert(prdBackfillDryRun.code === 0, "PRD backfill dry-run 成功", [
    prdBackfillDryRun.stdout.trim(),
    prdBackfillDryRun.stderr.trim(),
  ].filter(Boolean));
  assertIncludes(prdBackfillDryRun.stdout, "prd_name:", "PRD backfill 输出 canonical 字段");
  assert(!prdBackfillDryRun.stdout.includes("\nname:"), "PRD backfill 不再输出 legacy 字段");

  console.log(`\n══════════════════════════════════════`);
  console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
  console.log(`══════════════════════════════════════`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
