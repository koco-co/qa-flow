/**
 * test-front-matter-utils.mjs
 * 锁定 archive body 结构分类与 canonical case block contract。
 *
 * 运行: node test-front-matter-utils.mjs
 */
import {
  ARCHIVE_BODY_STRUCTURE_CATEGORIES,
  CANONICAL_ARCHIVE_CASE_BLOCK_CONTRACT,
  buildFrontMatter,
  buildCanonicalArchiveCaseBlock,
  classifyArchiveBodyStructure,
  parseFrontMatter,
  validateFrontMatter,
} from "../shared/scripts/front-matter-utils.mjs";

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

const canonicalArchiveBody = [
  "## 数据资产",
  "",
  "### 质量问题台账",
  "",
  "#### 搜索功能",
  "",
  "##### 【P1】验证搜索条件过滤",
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
  "| 2 | 输入搜索条件并点击查询 | 列表返回过滤结果 |",
  "",
].join("\n");

const hybridArchiveBody = [
  "## 数据资产",
  "",
  "##### 验证旧格式用例 「P1」",
  "",
  "| 编号 | 步骤 | 预期 |",
  "| --- | --- | --- |",
  "| 1 | 点击按钮 | 成功 |",
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

const requirementNarrativeBody = [
  "# 质量问题台账需求",
  "",
  "## 需求背景",
  "",
  "本需求用于统一质量问题筛选条件与列表展示逻辑。",
  "",
  "## 范围说明",
  "",
  "支持关键词、状态与责任人联合查询。",
  "",
].join("\n");

const h5NarrativeArchiveBody = [
  "## 数据资产模块",
  "",
  "##### 登录功能",
  "用户可以使用账号密码登录系统。",
  "",
  "##### 退出功能",
  "用户可以点击退出按钮退出系统。",
  "",
].join("\n");

console.log("\n=== Test: classify archive body structure families ===");
assert(
  JSON.stringify(Object.values(ARCHIVE_BODY_STRUCTURE_CATEGORIES)) === JSON.stringify([
    "canonical table",
    "hybrid table",
    "bullet/XMind tree",
    "requirements narrative",
  ]),
  "body structure categories 使用稳定命名",
  [JSON.stringify(ARCHIVE_BODY_STRUCTURE_CATEGORIES)],
);
assert(
  classifyArchiveBodyStructure(canonicalArchiveBody) === ARCHIVE_BODY_STRUCTURE_CATEGORIES.CANONICAL_TABLE,
  "already-normalized archive 识别为 canonical table",
);
assert(
  classifyArchiveBodyStructure(hybridArchiveBody) === ARCHIVE_BODY_STRUCTURE_CATEGORIES.HYBRID_TABLE,
  "table-style archive 识别为 hybrid table",
);
assert(
  classifyArchiveBodyStructure(bulletArchiveBody) === ARCHIVE_BODY_STRUCTURE_CATEGORIES.BULLET_XMIND_TREE,
  "bullet/XMind-style archive 识别为 bullet/XMind tree",
);
assert(
  classifyArchiveBodyStructure(requirementNarrativeBody) === ARCHIVE_BODY_STRUCTURE_CATEGORIES.REQUIREMENTS_NARRATIVE,
  "requirements narrative 识别为 requirements narrative",
);
assert(
  classifyArchiveBodyStructure(h5NarrativeArchiveBody) === ARCHIVE_BODY_STRUCTURE_CATEGORIES.REQUIREMENTS_NARRATIVE,
  "仅包含 H5 标题的正文不会误判为 bullet/XMind tree",
  [`actual: ${classifyArchiveBodyStructure(h5NarrativeArchiveBody)}`],
);

console.log("\n=== Test: canonical archive case block preserves blanks instead of inventing ===");
const canonicalSkeleton = buildCanonicalArchiveCaseBlock({
  priority: "P2",
  title: "验证标题树叶子节点",
});
assert(
  CANONICAL_ARCHIVE_CASE_BLOCK_CONTRACT.titlePattern.test("##### 【P1】验证标题"),
  "canonical contract 锁定标题格式",
);
assert(
  canonicalSkeleton.startsWith("##### 【P2】验证标题树叶子节点"),
  "canonical skeleton 输出 canonical 标题",
  [canonicalSkeleton],
);
assert(
  canonicalSkeleton.includes("> 前置条件\n```\n```"),
  "precondition 缺失时保留空 fenced block",
  [canonicalSkeleton],
);
assert(
  canonicalSkeleton.includes("> 用例步骤\n\n| 编号 | 步骤 | 预期 |"),
  "case block 包含 canonical step table header",
  [canonicalSkeleton],
);
assert(
  !/\|\s*1\s*\|/.test(canonicalSkeleton),
  "没有原始步骤时不虚构步骤行",
  [canonicalSkeleton],
);
assert(
  !/(待补充|TODO|标题缺失)/.test(canonicalSkeleton),
  "空值保持为空，不写入占位文案",
  [canonicalSkeleton],
);

const partialCaseBlock = buildCanonicalArchiveCaseBlock({
  priority: "P1",
  title: "验证部分步骤缺字段",
  steps: [
    { step: "进入【质量问题台账】页面", expected: "" },
    { step: "", expected: "" },
  ],
});
assert(
  partialCaseBlock.includes("| 1 | 进入【质量问题台账】页面 |  |"),
  "expected 缺失时保留空白单元格",
  [partialCaseBlock],
);
assert(
  partialCaseBlock.includes("| 2 |  |  |"),
  "步骤与预期缺失时保留空白单元格",
  [partialCaseBlock],
);
assert(
  CANONICAL_ARCHIVE_CASE_BLOCK_CONTRACT.blankPolicy.allowEmptyPreconditionFence
    && CANONICAL_ARCHIVE_CASE_BLOCK_CONTRACT.blankPolicy.allowBlankStepCell
    && CANONICAL_ARCHIVE_CASE_BLOCK_CONTRACT.blankPolicy.allowBlankExpectedCell
    && CANONICAL_ARCHIVE_CASE_BLOCK_CONTRACT.blankPolicy.allowOmittedStepRows,
  "blank policy 明确允许留空而非虚构内容",
  [JSON.stringify(CANONICAL_ARCHIVE_CASE_BLOCK_CONTRACT.blankPolicy)],
);

console.log("\n=== Test: front-matter round-trip preserves object-valued fields ===");
const roundTripMarkdown = `${buildFrontMatter({
  suite_name: "质量问题台账",
  tags: ["数据资产", "回归"],
  case_types: {
    normal: 2,
    abnormal: 1,
    boundary: 0,
  },
})}## 正文
`;
const { frontMatter: parsedFrontMatter, body: parsedBody } = parseFrontMatter(roundTripMarkdown);

assert(
  JSON.stringify(parsedFrontMatter?.case_types) === JSON.stringify({
    normal: 2,
    abnormal: 1,
    boundary: 0,
  }),
  "object-valued front-matter 字段可正确 round-trip",
  [
    `actual: ${JSON.stringify(parsedFrontMatter?.case_types)}`,
  ],
);
assert(
  JSON.stringify(parsedFrontMatter?.tags) === JSON.stringify(["数据资产", "回归"]),
  "array-valued front-matter 字段保持原样",
  [
    `actual: ${JSON.stringify(parsedFrontMatter?.tags)}`,
  ],
);
assert(
  parsedBody === "## 正文\n",
  "parseFrontMatter 保留正文内容",
  [
    `actual: ${JSON.stringify(parsedBody)}`,
  ],
);

console.log("\n=== Test: archive front-matter 允许无关联 PRD 的独立文档 ===");
const hotfixArchiveValidation = validateFrontMatter({
  suite_name: "在线问题转化-145513-资产目录列表分页",
  description: "验证资产目录列表第二页数据正常加载",
  product: "online-cases",
  dev_version: "hotfix_6.2.x_145513",
  tags: ["hotfix", "online-case"],
  create_at: "2026-04-01",
  status: "草稿",
  origin: "json",
}, "archive");
assert(
  hotfixArchiveValidation.valid,
  "archive new schema 允许无 prd_path 的独立 hotfix 文档",
  [JSON.stringify(hotfixArchiveValidation)],
);

const partialPrdLinkedArchiveValidation = validateFrontMatter({
  suite_name: "关联 PRD 但缺路径",
  description: "验证部分关联 PRD 字段不会误通过",
  product: "data-assets",
  tags: ["回归"],
  create_at: "2026-04-01",
  prd_id: 12345,
  prd_version: "v1.0.0",
}, "archive");
assert(
  !partialPrdLinkedArchiveValidation.valid && partialPrdLinkedArchiveValidation.missing.includes("prd_path"),
  "archive 一旦出现 PRD 关联字段，缺失 prd_path 时必须报错",
  [JSON.stringify(partialPrdLinkedArchiveValidation)],
);

const pathOnlyArchiveValidation = validateFrontMatter({
  suite_name: "仅写 prd_path 的归档",
  description: "验证 PRD 关联字段必须成组出现",
  product: "data-assets",
  tags: ["回归"],
  create_at: "2026-04-01",
  prd_path: "cases/requirements/data-assets/v1.0.0/示例.md",
}, "archive");
assert(
  !pathOnlyArchiveValidation.valid
    && pathOnlyArchiveValidation.missing.includes("prd_id")
    && pathOnlyArchiveValidation.missing.includes("prd_version"),
  "archive 已关联 PRD 时，prd_id / prd_version / prd_path 必须成组完整",
  [JSON.stringify(pathOnlyArchiveValidation)],
);

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
