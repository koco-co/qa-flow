/**
 * test-md-xmind-regeneration.mjs
 * 验证 bullet/XMind-style archive body 可基于原始 XMind 或当前标题树重建为 canonical table。
 *
 * 运行: node .claude/tests/test-md-xmind-regeneration.mjs
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
import {
  ARCHIVE_BODY_STRUCTURE_CATEGORIES,
  classifyArchiveBodyStructure,
} from "../shared/scripts/front-matter-utils.mjs";
import { normalizeArchiveBody } from "../shared/scripts/normalize-md-content.mjs";
import {
  determineOutputDir,
  determineOutputDirWithMeta,
  jsonToMd,
} from "../skills/archive-converter/scripts/json-to-archive-md.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const runId = `${process.pid}-${Date.now()}`;
const tempRoot = resolve(__dirname, `__test_md_xmind_regeneration_${runId}`);

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
    if (entry.startsWith("__test_md_xmind_regeneration_")) {
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

function readFixture(relativePath) {
  return readFileSync(resolve(tempRoot, relativePath), "utf8");
}

function createXmindFixture(relativePath, sheets) {
  const fullPath = resolve(tempRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  const result = spawnSync(
    "python3",
    [
      "-c",
      [
        "import json, sys, zipfile",
        "path = sys.argv[1]",
        "payload = json.loads(sys.argv[2])",
        "with zipfile.ZipFile(path, 'w') as archive:",
        "    archive.writestr('content.json', json.dumps(payload, ensure_ascii=False))",
      ].join("\n"),
      fullPath,
      JSON.stringify(sheets),
    ],
    {
      cwd: tempRoot,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  if ((result.status ?? 1) !== 0) {
    throw new Error(
      [
        "createXmindFixture failed",
        result.stdout?.trim(),
        result.stderr?.trim(),
      ].filter(Boolean).join("\n"),
    );
  }

  return fullPath;
}

const xmindArchiveRelativePath = "cases/archive/data-assets/主流程/数据质量.md";
const xmindSourceRelativePath = "cases/xmind/data-assets/主流程/数据资产-主流程用例.xmind";
const legacyXmindBody = [
  "# 数据质量（XMind）",
  "> 来源：cases/xmind/data-assets/主流程/数据资产-主流程用例.xmind",
  "",
  "---",
  "",
  "### 老旧标题树",
  "",
  "#### 旧步骤",
  "- 旧预期",
  "",
].join("\n");

writeFixture(
  xmindArchiveRelativePath,
  [
    "---",
    "suite_name: 数据质量（XMind）",
    "description: 数据质量（XMind）",
    "product: data-assets",
    "source: cases/xmind/data-assets/主流程/数据资产-主流程用例.xmind",
    "origin: xmind",
    "create_at: 2026-03-30",
    "status: \"\"",
    "health_warnings: []",
    "---",
    legacyXmindBody,
  ].join("\n"),
);

createXmindFixture(xmindSourceRelativePath, [
  {
    rootTopic: {
      title: "数据资产-主流程用例",
      children: {
        attached: [
          {
            title: "资产盘点",
            children: {
              attached: [
                {
                  title: "资产盘点模块",
                  children: {
                    attached: [
                      {
                        title: "列表页",
                        children: {
                          attached: [
                            {
                              title: "验证资产盘点首页",
                              markers: [{ markerId: "priority-3" }],
                              notes: { plain: { content: "旧结果，不应被选中" } },
                              children: {
                                attached: [
                                  {
                                    title: "进入【资产盘点】页面",
                                    children: {
                                      attached: [{ title: "页面正常加载" }],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            title: "数据质量",
            children: {
              attached: [
                {
                  title: "质量问题台账",
                  children: {
                    attached: [
                      {
                        title: "列表页",
                        children: {
                          attached: [
                            {
                              title: "验证质量问题详情展示",
                              markers: [{ markerId: "priority-2" }],
                              notes: { plain: { content: "已准备质量问题测试数据" } },
                              children: {
                                attached: [
                                  {
                                    title: "进入【质量问题台账】页面",
                                    children: {
                                      attached: [{ title: "页面正常加载" }],
                                    },
                                  },
                                  {
                                    title: "点击【详情】按钮",
                                    children: {
                                      attached: [{ title: "详情抽屉展示完整信息" }],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  },
]);

const fallbackArchiveRelativePath = "cases/archive/data-assets/v6.4.10/fallback-tree.md";
const fallbackBulletBody = [
  "## 数据资产",
  "",
  "### 搜索筛选",
  "",
  "- 验证搜索条件组合筛选",
  "  - 输入关键词与状态",
  "  - 返回过滤结果",
  "  - 点击重置",
  "",
].join("\n");

writeFixture(
  fallbackArchiveRelativePath,
  [
    "---",
    "suite_name: fallback-tree",
    "description: fallback-tree",
    "product: data-assets",
    "prd_version: v6.4.10",
    "origin: xmind",
    "create_at: 2026-03-30",
    "status: \"\"",
    "health_warnings: []",
    "---",
    fallbackBulletBody,
  ].join("\n"),
);

const stepsOnlyArchiveRelativePath = "cases/archive/data-assets/v6.4.10/steps-only-tree.md";
const stepsOnlyBulletBody = [
  "## 数据资产",
  "",
  "### 搜索筛选",
  "",
  "- 验证多步骤筛选流程",
  "  - 点击【高级筛选】按钮",
  "  - 选择【已发布】状态",
  "  - 点击【查询】按钮",
  "",
].join("\n");

writeFixture(
  stepsOnlyArchiveRelativePath,
  [
    "---",
    "suite_name: steps-only-tree",
    "description: steps-only-tree",
    "product: data-assets",
    "prd_version: v6.4.10",
    "origin: xmind",
    "create_at: 2026-03-30",
    "status: \"\"",
    "health_warnings: []",
    "---",
    stepsOnlyBulletBody,
  ].join("\n"),
);

const shortBulletCaseArchiveRelativePath = "cases/archive/data-assets/v6.4.10/short-bullet-case.md";
const shortBulletCaseBody = [
  "## 数据资产",
  "",
  "### 详情弹窗",
  "",
  "- 详情弹窗字段",
  "  - 展示字段完整",
  "",
].join("\n");

writeFixture(
  shortBulletCaseArchiveRelativePath,
  [
    "---",
    "suite_name: short-bullet-case",
    "description: short-bullet-case",
    "product: data-assets",
    "prd_version: v6.4.10",
    "origin: xmind",
    "create_at: 2026-03-30",
    "status: \"\"",
    "health_warnings: []",
    "---",
    shortBulletCaseBody,
  ].join("\n"),
);

const implicitHeadingCaseArchiveRelativePath = "cases/archive/data-assets/v6.4.10/implicit-heading-case.md";
const implicitHeadingCaseBody = [
  "## 数据资产",
  "",
  "### 指标资源",
  "",
  "#### 验证前往指标平台",
  "",
  "##### 点击前往指标平台",
  "",
  "- 成功以新窗口打开，单点登录指标平台-指标清单页面",
  "",
].join("\n");

writeFixture(
  implicitHeadingCaseArchiveRelativePath,
  [
    "---",
    "suite_name: implicit-heading-case",
    "description: implicit-heading-case",
    "product: data-assets",
    "prd_version: v6.4.10",
    "origin: xmind",
    "create_at: 2026-03-30",
    "status: \"\"",
    "health_warnings: []",
    "---",
    implicitHeadingCaseBody,
  ].join("\n"),
);

const corruptXmindArchiveRelativePath = "cases/archive/data-assets/v6.4.10/corrupt-xmind-tree.md";
const corruptXmindSourceRelativePath = "cases/xmind/data-assets/v6.4.10/corrupt-xmind-tree.xmind";
const corruptXmindBody = [
  "## 数据资产",
  "",
  "### 搜索筛选",
  "",
  "- 验证损坏 XMind 时仍可回退",
  "  - 输入关键词",
  "  - 返回过滤结果",
  "",
].join("\n");

writeFixture(
  corruptXmindArchiveRelativePath,
  [
    "---",
    "suite_name: corrupt-xmind-tree",
    "description: corrupt-xmind-tree",
    `prd_path: ${corruptXmindSourceRelativePath}`,
    "product: data-assets",
    "prd_version: v6.4.10",
    "origin: xmind",
    "create_at: 2026-03-30",
    "status: \"\"",
    "health_warnings: []",
    "---",
    corruptXmindBody,
  ].join("\n"),
);
writeFixture(corruptXmindSourceRelativePath, "not a zip archive");

const firstStepNeedsCanonicalizationArchiveRelativePath = "cases/archive/data-assets/主流程/详情首步规范化.md";
const firstStepNeedsCanonicalizationSourceRelativePath = "cases/xmind/data-assets/主流程/详情首步规范化.xmind";
const firstStepNeedsCanonicalizationBody = [
  "# 详情首步规范化（XMind）",
  `> 来源：${firstStepNeedsCanonicalizationSourceRelativePath}`,
  "",
  "---",
  "",
  "### 旧标题树",
  "",
  "- 旧步骤",
  "",
].join("\n");

writeFixture(
  firstStepNeedsCanonicalizationArchiveRelativePath,
  [
    "---",
    "suite_name: 详情首步规范化（XMind）",
    "description: 详情首步规范化（XMind）",
    `source: ${firstStepNeedsCanonicalizationSourceRelativePath}`,
    "origin: xmind",
    "product: data-assets",
    "create_at: 2026-03-30",
    "status: \"\"",
    "health_warnings: []",
    "---",
    firstStepNeedsCanonicalizationBody,
  ].join("\n"),
);

createXmindFixture(firstStepNeedsCanonicalizationSourceRelativePath, [
  {
    rootTopic: {
      title: "详情首步规范化",
      children: {
        attached: [
          {
            title: "详情首步规范化（XMind）",
            children: {
              attached: [
                {
                  title: "数据质量",
                  children: {
                    attached: [
                      {
                        title: "质量问题台账",
                        children: {
                          attached: [
                            {
                              title: "列表页",
                              children: {
                                attached: [
                                  {
                                    title: "查看详情抽屉",
                                    markers: [{ markerId: "priority-2" }],
                                    children: {
                                      attached: [
                                        {
                                          title: "点击【详情】按钮",
                                          children: {
                                            attached: [{ title: "详情抽屉展示完整信息" }],
                                          },
                                        },
                                      ],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  },
]);

const multiExpectedXmindArchiveRelativePath = "cases/archive/data-assets/主流程/多预期节点.xmind.md";
const multiExpectedXmindSourceRelativePath = "cases/xmind/data-assets/主流程/多预期节点.xmind";
const multiExpectedXmindBody = [
  "# 多预期节点（XMind）",
  `> 来源：${multiExpectedXmindSourceRelativePath}`,
  "",
  "---",
  "",
  "### 旧标题树",
  "",
  "- 旧步骤",
  "",
].join("\n");

writeFixture(
  multiExpectedXmindArchiveRelativePath,
  [
    "---",
    "suite_name: 多预期节点（XMind）",
    "description: 多预期节点（XMind）",
    `source: ${multiExpectedXmindSourceRelativePath}`,
    "origin: xmind",
    "product: data-assets",
    "create_at: 2026-03-30",
    "status: \"\"",
    "health_warnings: []",
    "---",
    multiExpectedXmindBody,
  ].join("\n"),
);

createXmindFixture(multiExpectedXmindSourceRelativePath, [
  {
    rootTopic: {
      title: "多预期节点",
      children: {
        attached: [
          {
            title: "多预期节点（XMind）",
            children: {
              attached: [
                {
                  title: "数据质量",
                  children: {
                    attached: [
                      {
                        title: "质量问题台账",
                        children: {
                          attached: [
                            {
                              title: "列表页",
                              children: {
                                attached: [
                                  {
                                    title: "验证详情抽屉信息",
                                    markers: [{ markerId: "priority-2" }],
                                    children: {
                                      attached: [
                                        {
                                          title: "进入【质量问题台账】页面",
                                          children: {
                                            attached: [
                                              { title: "详情抽屉展示基础字段" },
                                              { title: "详情抽屉展示扩展字段" },
                                            ],
                                          },
                                        },
                                      ],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  },
]);

const moduleDirectXmindArchiveRelativePath = "cases/archive/data-assets/主流程/module-direct-case.md";
const moduleDirectXmindSourceRelativePath = "cases/xmind/data-assets/主流程/module-direct-case.xmind";
const moduleDirectXmindBody = [
  "# 模块直连用例（XMind）",
  `> 来源：${moduleDirectXmindSourceRelativePath}`,
  "",
  "---",
  "",
  "### 旧标题树",
  "",
  "- 旧步骤",
  "",
].join("\n");

writeFixture(
  moduleDirectXmindArchiveRelativePath,
  [
    "---",
    "suite_name: 模块直连用例（XMind）",
    "description: 模块直连用例（XMind）",
    `source: ${moduleDirectXmindSourceRelativePath}`,
    "origin: xmind",
    "product: data-assets",
    "create_at: 2026-03-30",
    "status: \"\"",
    "health_warnings: []",
    "---",
    moduleDirectXmindBody,
  ].join("\n"),
);

createXmindFixture(moduleDirectXmindSourceRelativePath, [
  {
    rootTopic: {
      title: "模块直连用例",
      children: {
        attached: [
          {
            title: "模块直连用例（XMind）",
            children: {
              attached: [
                {
                  title: "质量问题台账",
                  children: {
                    attached: [
                      {
                        title: "验证模块直连入口",
                        markers: [{ markerId: "priority-2" }],
                        children: {
                          attached: [
                            {
                              title: "进入【质量问题台账】页面",
                              children: {
                                attached: [{ title: "页面正常加载" }],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  },
]);

console.log("\n=== Test: json-to-archive routing resolves to repo-root cases directory ===");
// When modules config is empty or module resolution fails, routing falls back to cases/archive/{version}
const routedDtstackDir = determineOutputDirWithMeta("数据资产", "v6.4.9", "质量问题台账", {});
assert(
  /\/cases\/archive\//.test(routedDtstackDir),
  "默认归档目录应落到 repo-root cases/archive/<version>",
  [routedDtstackDir],
);
const routedByRequirementName = determineOutputDir("通用项目", "v6.4.9", "数据资产-质量问题台账");
assert(
  /\/cases\/archive\//.test(routedByRequirementName),
  "当 projectName 不含模块名时，也能依赖 requirementName 或 fallback 路由到 cases/archive/",
  [routedByRequirementName],
);
const routedByModuleKey = determineOutputDirWithMeta("通用项目", "v6.4.9", "任意需求", {
  module_key: "data-assets",
});
assert(
  /\/cases\/archive\//.test(routedByModuleKey),
  "当 meta.module_key 已给出但配置中未定义时，也应回退到 cases/archive/",
  [routedByModuleKey],
);

console.log("\n=== Test: jsonToMd preserves module-level direct test cases when pages is empty ===");
const moduleLevelJsonMd = jsonToMd(
  {
    meta: {
      project_name: "数据资产",
      requirement_name: "模块直连 JSON",
      version: "v6.4.9",
    },
    modules: [
      {
        name: "模块A",
        pages: [],
        test_cases: [
          {
            title: "验证模块级用例",
            priority: "P1",
            precondition: "已登录系统",
            steps: [
              {
                step: "进入【模块A】页面",
                expected: "页面成功加载",
              },
            ],
          },
        ],
      },
    ],
  },
  resolve(tempRoot, "module-level-direct.json"),
);
assert(
  moduleLevelJsonMd.includes("##### 【P1】验证模块级用例"),
  "jsonToMd 不会因为 pages: [] 而漏掉模块级 direct test_cases",
  [moduleLevelJsonMd],
);

console.log("\n=== Test: rebuild bullet/XMind body from resolved original XMind ===");
const xmindInputBody = readFixture(xmindArchiveRelativePath).split("\n---\n").slice(1).join("\n---\n");
const xmindResult = await normalizeArchiveBody(xmindInputBody, {
  markdownPath: resolve(tempRoot, xmindArchiveRelativePath),
  rootDir: tempRoot,
});
assert(xmindResult.changed, "已解析原始 XMind 时应重建 canonical body");
assert(xmindResult.strategy === "xmind-source", "命中原始 XMind 重建路径", [
  `actual: ${xmindResult.strategy}`,
]);
assert(
  classifyArchiveBodyStructure(xmindResult.body) === ARCHIVE_BODY_STRUCTURE_CATEGORIES.CANONICAL_TABLE,
  "XMind 重建后结构升级为 canonical table",
  [`actual: ${classifyArchiveBodyStructure(xmindResult.body)}`],
);
assert(
  xmindResult.body.includes("## 质量问题台账"),
  "会输出 XMind 中的模块标题",
  [xmindResult.body],
);
assert(
  xmindResult.body.includes("### 列表页"),
  "会输出 XMind 中的页面标题",
  [xmindResult.body],
);
assert(
  xmindResult.body.includes("##### 【P1】验证质量问题详情展示"),
  "优先级与标题从原始 XMind 提取",
  [xmindResult.body],
);
assert(
  xmindResult.body.includes("> 前置条件\n```\n已准备质量问题测试数据\n```"),
  "前置条件从原始 XMind notes 提取",
  [xmindResult.body],
);
assert(
  xmindResult.body.includes("| 1 | 进入【质量问题台账】页面 | 页面正常加载 |")
    && xmindResult.body.includes("| 2 | 点击【详情】按钮 | 详情抽屉展示完整信息 |"),
  "步骤与预期从原始 XMind 提取并格式化为 canonical table",
  [xmindResult.body],
);
assert(
  !xmindResult.body.includes("验证资产盘点首页"),
  "多结果 XMind 只会匹配当前 archive 对应的结果节点",
  [xmindResult.body],
);

console.log("\n=== Test: fall back to conservative bullet-tree regeneration when XMind is unavailable ===");
const fallbackResult = await normalizeArchiveBody(fallbackBulletBody, {
  markdownPath: resolve(tempRoot, fallbackArchiveRelativePath),
  rootDir: tempRoot,
});
assert(fallbackResult.changed, "未解析到原始 XMind 时应退回 bullet tree 重建");
assert(fallbackResult.strategy === "bullet-fallback", "命中 bullet tree fallback 路径", [
  `actual: ${fallbackResult.strategy}`,
]);
assert(
  classifyArchiveBodyStructure(fallbackResult.body) === ARCHIVE_BODY_STRUCTURE_CATEGORIES.CANONICAL_TABLE,
  "fallback 重建后结构升级为 canonical table",
  [`actual: ${classifyArchiveBodyStructure(fallbackResult.body)}`],
);
assert(
  fallbackResult.body.includes("## 数据资产\n\n### 搜索筛选"),
  "fallback 重建会保留可识别的标题上下文",
  [fallbackResult.body],
);
assert(
  fallbackResult.body.includes("##### 【P2】验证搜索条件组合筛选"),
  "fallback 重建会保留当前 bullet tree 中的 case 标题",
  [fallbackResult.body],
);
assert(
  fallbackResult.body.includes("> 前置条件\n```\n```"),
  "fallback 无法确定前置条件时保持空白而不臆造内容",
  [fallbackResult.body],
);
assert(
  fallbackResult.body.includes("| 1 | 输入关键词与状态 | 返回过滤结果 |")
    && fallbackResult.body.includes("| 2 | 点击重置 |  |"),
  "fallback 仅映射当前 bullet tree 中可确认的信息，无法确认的单元格保持空白",
  [fallbackResult.body],
);

console.log("\n=== Test: steps-only bullet list stays conservative instead of pairing steps together ===");
const stepsOnlyResult = await normalizeArchiveBody(stepsOnlyBulletBody, {
  markdownPath: resolve(tempRoot, stepsOnlyArchiveRelativePath),
  rootDir: tempRoot,
});
assert(stepsOnlyResult.changed, "多步骤 bullet tree 应重建为 canonical table");
assert(
  stepsOnlyResult.body.includes("| 1 | 点击【高级筛选】按钮 |  |")
    && stepsOnlyResult.body.includes("| 2 | 选择【已发布】状态 |  |")
    && stepsOnlyResult.body.includes("| 3 | 点击【查询】按钮 |  |"),
  "无法确认预期结果时应保守保留为空，而不是把后续步骤误配成预期",
  [stepsOnlyResult.body],
);

console.log("\n=== Test: short non-验证 bullet titles still rebuild into canonical cases ===");
const shortBulletCaseResult = await normalizeArchiveBody(shortBulletCaseBody, {
  markdownPath: resolve(tempRoot, shortBulletCaseArchiveRelativePath),
  rootDir: tempRoot,
});
assert(shortBulletCaseResult.changed, "短标题 bullet case 也应被识别并重建");
assert(
  shortBulletCaseResult.body.includes("##### 【P2】详情弹窗字段"),
  "短标题 bullet case 不应被整段跳过为 bullet-unchanged",
  [shortBulletCaseResult.body],
);

console.log("\n=== Test: non-验证 heading case titles are still recognized when they own expected bullets ===");
const implicitHeadingCaseResult = await normalizeArchiveBody(implicitHeadingCaseBody, {
  markdownPath: resolve(tempRoot, implicitHeadingCaseArchiveRelativePath),
  rootDir: tempRoot,
});
assert(implicitHeadingCaseResult.changed, "非“验证”前缀标题也应能重建出 case");
assert(
  implicitHeadingCaseResult.body.includes("##### 【P2】点击前往指标平台"),
  "非“验证”前缀的 heading case title 不应被整段跳过",
  [implicitHeadingCaseResult.body],
);
assert(
  implicitHeadingCaseResult.body.includes("| 1 | 进入【指标资源】页面，点击前往指标平台 | 成功以新窗口打开，单点登录指标平台-指标清单页面 |"),
  "只有结果 bullet 时，应把动作标题映射为步骤语义、bullet 保留为预期",
  [implicitHeadingCaseResult.body],
);

console.log("\n=== Test: corrupt XMind falls back instead of aborting normalization ===");
let corruptXmindResult = null;
let corruptXmindError = null;
try {
  corruptXmindResult = await normalizeArchiveBody(corruptXmindBody, {
    markdownPath: resolve(tempRoot, corruptXmindArchiveRelativePath),
    rootDir: tempRoot,
  });
} catch (error) {
  corruptXmindError = error;
}
assert(!corruptXmindError, "原始 XMind 损坏时不应抛错中断，应回退到当前 Markdown 解析", [
  corruptXmindError?.stack || corruptXmindError?.message || String(corruptXmindError),
]);
assert(corruptXmindResult?.strategy === "bullet-fallback", "损坏 XMind 时应进入 bullet-fallback 路径", [
  `actual: ${corruptXmindResult?.strategy || "<undefined>"}`,
]);

console.log("\n=== Test: rebuilt XMind output still normalizes first step into canonical enter-page form ===");
const firstStepNeedsCanonicalizationInputBody = readFixture(firstStepNeedsCanonicalizationArchiveRelativePath)
  .split("\n---\n")
  .slice(1)
  .join("\n---\n");
const firstStepNeedsCanonicalizationResult = await normalizeArchiveBody(firstStepNeedsCanonicalizationInputBody, {
  markdownPath: resolve(tempRoot, firstStepNeedsCanonicalizationArchiveRelativePath),
  rootDir: tempRoot,
});
assert(firstStepNeedsCanonicalizationResult.changed, "原始 XMind 首步非进入态时仍应完成重建");
assert(
  firstStepNeedsCanonicalizationResult.body.includes("| 1 | 进入【质量问题台账-列表页】页面，点击【详情】按钮 | 详情抽屉展示完整信息 |"),
  "XMind 重建后的首步也应满足 canonical enter-page 规范",
  [firstStepNeedsCanonicalizationResult.body],
);

console.log("\n=== Test: module-direct XMind cases are rebuilt as one case instead of page/step inflation ===");
const moduleDirectXmindInputBody = readFixture(moduleDirectXmindArchiveRelativePath)
  .split("\n---\n")
  .slice(1)
  .join("\n---\n");
const moduleDirectXmindResult = await normalizeArchiveBody(moduleDirectXmindInputBody, {
  markdownPath: resolve(tempRoot, moduleDirectXmindArchiveRelativePath),
  rootDir: tempRoot,
});
assert(moduleDirectXmindResult.changed, "module-direct XMind case 仍应完成重建");
assert(
  moduleDirectXmindResult.body.includes("##### 【P1】验证模块直连入口"),
  "module-direct XMind 不应把 case 错拆成 page 或 step 级别条目",
  [moduleDirectXmindResult.body],
);
assert(
  moduleDirectXmindResult.body.includes("| 1 | 进入【质量问题台账】页面 | 页面正常加载 |"),
  "module-direct XMind 应保留单个 case 内的步骤与预期",
  [moduleDirectXmindResult.body],
);

console.log("\n=== Test: legacy enter steps without brackets are canonicalized ===");
const legacyEnterStepBody = [
  "## 数据资产",
  "",
  "### 质量问题台账",
  "",
  "##### 【P1】验证 legacy 进入页面写法",
  "",
  "> 前置条件",
  "```",
  "```",
  "",
  "> 用例步骤",
  "",
  "| 编号 | 步骤 | 预期 |",
  "| --- | --- | --- |",
  "| 1 | 进入质量问题台账页面 | 页面正常加载 |",
  "",
].join("\n");
const legacyEnterStepResult = await normalizeArchiveBody(legacyEnterStepBody, {});
assert(legacyEnterStepResult.changed, "legacy 进入页面写法应被规范化");
assert(
  legacyEnterStepResult.body.includes("| 1 | 进入【质量问题台账】页面 | 页面正常加载 |"),
  "未加【】的 legacy 进入页面步骤也应被 canonical 化",
  [legacyEnterStepResult.body],
);

console.log("\n=== Test: ambiguous enter steps are not over-normalized ===");
const ambiguousEnterStepBody = [
  "## 数据资产",
  "",
  "### 质量问题台账",
  "",
  "##### 【P1】验证含动作尾巴的进入写法",
  "",
  "> 前置条件",
  "```",
  "```",
  "",
  "> 用例步骤",
  "",
  "| 编号 | 步骤 | 预期 |",
  "| --- | --- | --- |",
  "| 1 | 进入详情页查看任务 | 页面正常加载 |",
  "",
].join("\n");
const ambiguousEnterStepResult = await normalizeArchiveBody(ambiguousEnterStepBody, {});
assert(
  ambiguousEnterStepResult.body.includes("| 1 | 进入详情页查看任务 | 页面正常加载 |"),
  "动作尾巴与页面名未分隔时，不应误改写为进入【详情页查看任务】页面",
  [ambiguousEnterStepResult.body],
);

console.log("\n=== Test: multiple expected children from XMind are preserved in one canonical row ===");
const multiExpectedXmindInputBody = readFixture(multiExpectedXmindArchiveRelativePath)
  .split("\n---\n")
  .slice(1)
  .join("\n---\n");
const multiExpectedXmindResult = await normalizeArchiveBody(multiExpectedXmindInputBody, {
  markdownPath: resolve(tempRoot, multiExpectedXmindArchiveRelativePath),
  rootDir: tempRoot,
});
assert(multiExpectedXmindResult.changed, "多预期节点 XMind 仍应完成重建");
assert(
  multiExpectedXmindResult.body.includes("##### 【P1】验证详情抽屉信息"),
  "多个 expected child 不应导致原始 case 标题被错拆成 step 标题",
  [multiExpectedXmindResult.body],
);
assert(
  multiExpectedXmindResult.body.includes("详情抽屉展示基础字段<br>详情抽屉展示扩展字段"),
  "同一步骤下的多个预期节点不应只保留第一条",
  [multiExpectedXmindResult.body],
);

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
