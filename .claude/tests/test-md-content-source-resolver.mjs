/**
 * test-md-content-source-resolver.mjs
 * 锁定 archive / requirements 的内容来源解析契约。
 *
 * 运行: node .claude/tests/test-md-content-source-resolver.mjs
 */
import {
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import { basename, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import {
  CONTENT_SOURCE_RESOLUTION_STATUS,
  resolveMdContentSource,
} from "../shared/scripts/md-content-source-resolver.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const runId = `${process.pid}-${Date.now()}`;
const tempRoot = resolve(__dirname, `__test_md_content_source_resolver_${runId}`);
const escapedRoot = resolve(__dirname, `__test_md_content_source_resolver_escape_${runId}`);

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
  rmSync(escapedRoot, { recursive: true, force: true });
}

function cleanupStale() {
  for (const entry of readdirSync(__dirname)) {
    if (entry.startsWith("__test_md_content_source_resolver_")) {
      rmSync(resolve(__dirname, entry), { recursive: true, force: true });
    }
  }
}

process.on("exit", cleanup);
cleanupStale();

function writeFixture(relativePath, content = "") {
  const fullPath = resolve(tempRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
  return fullPath;
}

function writeEscapedFixture(relativePath, content = "") {
  const fullPath = resolve(escapedRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
  return fullPath;
}

const archiveResolvedPath = writeFixture(
  "cases/archive/data-assets/v6.4.10/quality-ledger.md",
  [
    "---",
    "suite_name: 质量问题台账（XMind）",
    "description: 质量问题台账归档",
    "prd_path: cases/requirements/data-assets/v6.4.10/quality-ledger.md",
    "product: data-assets",
    "prd_version: v6.4.10",
    "origin: xmind",
    "status: 已归档",
    "repos:",
    "  - .repos/dt-insight-web/dt-center-assets/",
    "---",
    "## 数据资产",
    "",
  ].join("\n"),
);
writeFixture("cases/requirements/data-assets/v6.4.10/quality-ledger.md", "---\nprd_name: 质量问题台账\nproduct: data-assets\ncreate_at: 2026-03-30\nstatus: 未开始\n---\n");
writeFixture("cases/xmind/data-assets/v6.4.10/quality-ledger.xmind");
writeFixture(".repos/dt-insight-web/dt-center-assets/README.md", "# repo\n");

const archiveMissingXmindPath = writeFixture(
  "cases/archive/data-query/v1.0.0/query-performance.md",
  [
    "---",
    "name: Query Performance",
    "description: 查询性能旧归档",
    "module: data-query",
    "version: v1.0.0",
    "source: cases/xmind/data-query/v1.0.0/query-performance.xmind",
    "created_at: 2026-03-28",
    "tags:",
    "  - 查询性能",
    "---",
    "## 统一查询",
    "",
  ].join("\n"),
);

const requirementMarkdownOnlyPath = writeFixture(
  "cases/requirements/custom/xyzh/数据质量-质量问题台账.md",
  [
    "---",
    "prd_name: PRD-26 数据质量-质量问题台账",
    "description: 定制化需求文档",
    "prd_source: 内部需求文档",
    "product: xyzh",
    "create_at: 2026-03-26",
    "status: 已增强",
    "---",
    "# PRD-26 数据质量-质量问题台账",
    "",
  ].join("\n"),
);
writeFixture(".repos/CustomItem/dt-insight-studio/README.md", "# custom repo\n");
writeFixture(".repos/CustomItem/dt-center-assets/README.md", "# custom repo\n");

const escapedPrdRelativePath = `../${basename(escapedRoot)}/escaped-prd.md`;
const escapedRepoRelativePath = `../${basename(escapedRoot)}/stolen-repo/`;
writeEscapedFixture("escaped-prd.md", "---\nprd_name: escaped\n---\n");
writeEscapedFixture("stolen-repo/README.md", "# stolen repo\n");

const traversalRequirementPath = writeFixture(
  "cases/requirements/custom/xyzh/安全测试-路径穿越.md",
  [
    "---",
    "prd_name: 安全测试-路径穿越",
    `prd_path: ${escapedPrdRelativePath}`,
    "product: xyzh",
    "repos:",
    `  - ${escapedRepoRelativePath}`,
    "create_at: 2026-03-30",
    "status: 已增强",
    "---",
    "# 安全测试-路径穿越",
    "",
  ].join("\n"),
);

const archiveHistoryPath = writeFixture(
  "cases/archive/custom/xyzh/v1.0.0/数据目录台账.md",
  [
    "---",
    "suite_name: 数据目录台账",
    "description: 历史 CSV 归档",
    "prd_path: cases/requirements/custom/xyzh/数据目录.md",
    "product: xyzh",
    "prd_version: v1.0.0",
    "origin: csv",
    "status: 已归档",
    "---",
    "## 信永中和",
    "",
  ].join("\n"),
);
writeFixture("cases/requirements/custom/xyzh/数据目录.md", "---\nprd_name: 数据目录\nproduct: xyzh\ncreate_at: 2026-03-20\nstatus: 未开始\n---\n");
writeFixture("cases/history/xyzh/v1.0.0/数据目录台账.csv", "标题,步骤,预期\n");

// Config with module-specific repoHints (replacing the former hardcoded DEFAULT_REPO_HINT_KEYS_BY_PRODUCT mapping)
const testConfig = {
  project: { name: "test" },
  casesRoot: "cases/",
  modules: {
    "data-assets": {
      zh: "数据资产",
      versioned: true,
      repoHints: ["dt-center-assets", "dt-insight-studio"],
    },
    "data-query": {
      zh: "数据查询",
      versioned: true,
    },
    "xyzh": {
      zh: "信阳中行",
      xmind: "cases/xmind/custom/xyzh/",
      archive: "cases/archive/custom/xyzh/",
      requirements: "cases/requirements/custom/xyzh/",
      history: "cases/history/xyzh/",
      repoHints: ["dt-insight-studio", "dt-center-assets"],
    },
  },
  repos: {
    "dt-center-assets": ".repos/dt-insight-web/dt-center-assets/",
    "dt-insight-studio": ".repos/dt-insight-front/dt-insight-studio/",
    "dt-insight-studio-custom": ".repos/CustomItem/dt-insight-studio/",
    "dt-center-assets-custom": ".repos/CustomItem/dt-center-assets/",
  },
};

// xyzh-specific config with CustomItem repo paths
const testConfigXyzh = {
  project: { name: "test" },
  casesRoot: "cases/",
  modules: {
    "xyzh": {
      zh: "信阳中行",
      xmind: "cases/xmind/custom/xyzh/",
      archive: "cases/archive/custom/xyzh/",
      requirements: "cases/requirements/custom/xyzh/",
      history: "cases/history/xyzh/",
      repoHints: ["dt-insight-studio-custom", "dt-center-assets-custom"],
    },
  },
  repos: {
    "dt-insight-studio-custom": ".repos/CustomItem/dt-insight-studio/",
    "dt-center-assets-custom": ".repos/CustomItem/dt-center-assets/",
  },
};

console.log("\n=== Test: archive resolves explicit XMind + PRD + repo candidates ===");
const resolvedArchive = resolveMdContentSource(archiveResolvedPath, { rootDir: tempRoot, config: testConfig });
assert(resolvedArchive.docType === "archive", "archive 文档类型识别正确", [
  `actual: ${resolvedArchive.docType}`,
]);
assert(resolvedArchive.product === "data-assets" && resolvedArchive.module === "data-assets", "archive 模块信息稳定输出", [
  JSON.stringify({ product: resolvedArchive.product, module: resolvedArchive.module }),
]);
assert(resolvedArchive.version === "v6.4.10", "archive 版本识别正确", [
  `actual: ${resolvedArchive.version}`,
]);
assert(
  JSON.stringify(resolvedArchive.candidatePrdPaths) === JSON.stringify([
    "cases/requirements/data-assets/v6.4.10/quality-ledger.md",
  ]),
  "archive PRD candidate 使用显式 prd_path",
  [JSON.stringify(resolvedArchive.candidatePrdPaths)],
);
assert(
  JSON.stringify(resolvedArchive.candidateXmindPaths) === JSON.stringify([
    "cases/xmind/data-assets/v6.4.10/quality-ledger.xmind",
  ]),
  "archive XMind candidate 优先锁定显式文件名 + 模块版本目录",
  [JSON.stringify(resolvedArchive.candidateXmindPaths)],
);
assert(resolvedArchive.originalXmindFound === true, "archive 可确认原始 XMind 已找到");
assert(
  resolvedArchive.sourceResolutionStatus === CONTENT_SOURCE_RESOLUTION_STATUS.ORIGINAL_XMIND_RESOLVED,
  "archive source status 标记为 original-xmind-resolved",
  [`actual: ${resolvedArchive.sourceResolutionStatus}`],
);
assert(
  JSON.stringify(resolvedArchive.candidateRepoPaths) === JSON.stringify([
    ".repos/dt-insight-web/dt-center-assets/",
    ".repos/dt-insight-front/dt-insight-studio/",
  ]),
  "archive repo candidates 先保留 frontmatter repos，再补模块默认 hints",
  [JSON.stringify(resolvedArchive.candidateRepoPaths)],
);

console.log("\n=== Test: legacy archive keeps unresolved original XMind candidate ===");
const missingXmindArchive = resolveMdContentSource(archiveMissingXmindPath, { rootDir: tempRoot });
assert(missingXmindArchive.docType === "archive", "legacy archive 文档类型识别正确");
assert(missingXmindArchive.product === "data-query", "legacy module 映射为 product", [
  `actual: ${missingXmindArchive.product}`,
]);
assert(
  JSON.stringify(missingXmindArchive.candidateXmindPaths) === JSON.stringify([
    "cases/xmind/data-query/v1.0.0/query-performance.xmind",
  ]),
  "legacy source 保持原始 XMind 候选路径",
  [JSON.stringify(missingXmindArchive.candidateXmindPaths)],
);
assert(missingXmindArchive.originalXmindFound === false, "legacy archive 未找到原始 XMind");
assert(
  missingXmindArchive.sourceResolutionStatus === CONTENT_SOURCE_RESOLUTION_STATUS.ORIGINAL_XMIND_MISSING,
  "legacy archive source status 标记为 original-xmind-missing",
  [`actual: ${missingXmindArchive.sourceResolutionStatus}`],
);

console.log("\n=== Test: requirements can fall back to markdown-only source ===");
const markdownOnlyRequirement = resolveMdContentSource(requirementMarkdownOnlyPath, { rootDir: tempRoot, config: testConfigXyzh });
assert(markdownOnlyRequirement.docType === "requirements", "requirements 文档类型识别正确", [
  `actual: ${markdownOnlyRequirement.docType}`,
]);
assert(
  JSON.stringify(markdownOnlyRequirement.candidatePrdPaths) === JSON.stringify([
    "cases/requirements/custom/xyzh/数据质量-质量问题台账.md",
  ]),
  "requirements candidatePrdPaths 以当前 Markdown 自身为稳定来源",
  [JSON.stringify(markdownOnlyRequirement.candidatePrdPaths)],
);
assert(markdownOnlyRequirement.originalXmindFound === false, "markdown-only requirement 不会误判为已找到 XMind");
assert(
  markdownOnlyRequirement.sourceResolutionStatus === CONTENT_SOURCE_RESOLUTION_STATUS.MARKDOWN_ONLY,
  "requirements source status 标记为 markdown-only",
  [`actual: ${markdownOnlyRequirement.sourceResolutionStatus}`],
);
assert(
  JSON.stringify(markdownOnlyRequirement.candidateRepoPaths) === JSON.stringify([
    ".repos/CustomItem/dt-insight-studio/",
    ".repos/CustomItem/dt-center-assets/",
  ]),
  "custom requirement 使用 .repos/CustomItem 模块 hints",
  [JSON.stringify(markdownOnlyRequirement.candidateRepoPaths)],
);

console.log("\n=== Test: resolver rejects frontmatter paths that escape the workspace root ===");
const traversalRequirement = resolveMdContentSource(traversalRequirementPath, { rootDir: tempRoot });
assert(
  traversalRequirement.candidatePrdPaths.includes(escapedPrdRelativePath) === false,
  "escaped prd_path 不应进入 candidatePrdPaths",
  [JSON.stringify(traversalRequirement.candidatePrdPaths)],
);
assert(
  traversalRequirement.existingCandidatePrdPaths.includes(escapedPrdRelativePath) === false,
  "escaped prd_path 不应进入 existingCandidatePrdPaths",
  [JSON.stringify(traversalRequirement.existingCandidatePrdPaths)],
);
assert(
  traversalRequirement.candidateRepoPaths.includes(escapedRepoRelativePath) === false,
  "escaped repo path 不应进入 candidateRepoPaths",
  [JSON.stringify(traversalRequirement.candidateRepoPaths)],
);
assert(
  traversalRequirement.existingCandidateRepoPaths.includes(escapedRepoRelativePath) === false,
  "escaped repo path 不应进入 existingCandidateRepoPaths",
  [JSON.stringify(traversalRequirement.existingCandidateRepoPaths)],
);
assert(
  traversalRequirement.sourceResolutionStatus === CONTENT_SOURCE_RESOLUTION_STATUS.MARKDOWN_ONLY,
  "escaped path 不应改变 markdown-only 判定",
  [`actual: ${traversalRequirement.sourceResolutionStatus}`],
);

console.log("\n=== Test: archive infers history CSV candidates from module + version + filename ===");
const historyArchive = resolveMdContentSource(archiveHistoryPath, { rootDir: tempRoot, config: testConfigXyzh });
assert(
  JSON.stringify(historyArchive.candidateHistoryPaths) === JSON.stringify([
    "cases/history/xyzh/v1.0.0/数据目录台账.csv",
  ]),
  "history candidate 锁定 module/version/file-name 对应 CSV",
  [JSON.stringify(historyArchive.candidateHistoryPaths)],
);
assert(
  JSON.stringify(historyArchive.existingCandidateHistoryPaths) === JSON.stringify([
    "cases/history/xyzh/v1.0.0/数据目录台账.csv",
  ]),
  "history existing candidates 仅保留实际存在的 CSV",
  [JSON.stringify(historyArchive.existingCandidateHistoryPaths)],
);
assert(
  historyArchive.sourceResolutionStatus === CONTENT_SOURCE_RESOLUTION_STATUS.ORIGINAL_XMIND_MISSING,
  "history archive source status 标记为 original-xmind-missing，而不是 markdown-only",
  [`actual: ${historyArchive.sourceResolutionStatus}`],
);
assert(
  JSON.stringify(historyArchive.candidateRepoPaths) === JSON.stringify([
    ".repos/CustomItem/dt-insight-studio/",
    ".repos/CustomItem/dt-center-assets/",
  ]),
  "history archive 也返回可读 repo roots hints",
  [JSON.stringify(historyArchive.candidateRepoPaths)],
);

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
