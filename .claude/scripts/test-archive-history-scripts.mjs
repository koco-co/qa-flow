/**
 * test-archive-history-scripts.mjs
 * 覆盖归档路由、XMind → Archive Markdown 以及历史用例检测输出
 *
 * 运行: node test-archive-history-scripts.mjs
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import JSZip from "jszip";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const archiveScriptPath = resolve(__dirname, "json-to-archive-md.mjs");
const historyScriptPath = resolve(__dirname, "convert-history-cases.mjs");
const runId = `${process.pid}-${Date.now()}`;
const tempRoot = resolve(__dirname, `__test_archive_history_${runId}`);
const generatedFilePaths = new Set();
const generatedDirPaths = new Set();

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
  for (const filePath of generatedFilePaths) {
    rmSync(filePath, { force: true });
  }
  for (const dirPath of generatedDirPaths) {
    rmSync(dirPath, { recursive: true, force: true });
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

process.on("exit", cleanup);

function ensureTempRoot() {
  mkdirSync(tempRoot, { recursive: true });
}

function runNodeScript(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: __dirname,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  return {
    code: result.status ?? 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function createJsonFixture({ projectName, requirementName, version }) {
  return {
    meta: {
      project_name: projectName,
      requirement_name: requirementName,
      version,
      generated_at: new Date().toISOString(),
      agent_id: "test-archive-history-scripts",
    },
    modules: [
      {
        name: "质量问题台账",
        pages: [
          {
            name: "列表页",
            sub_groups: [
              {
                name: "搜索功能",
                test_cases: [
                  {
                    title: "验证归档路由脚本",
                    priority: "P1",
                    precondition: "已登录系统",
                    steps: [
                      {
                        step: "进入【质量问题台账-列表页】页面",
                        expected: "页面成功加载",
                      },
                      {
                        step: "输入搜索条件并执行查询",
                        expected: "列表返回过滤结果",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function createXmindFixtureBuffer(title) {
  const xmindContent = [
    {
      rootTopic: {
        title: "信永中和",
        children: {
          attached: [
            {
              title,
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
                                title: "搜索功能",
                                children: {
                                  attached: [
                                    {
                                      title: "验证 XMind 归档转换",
                                      markers: [{ markerId: "priority-2" }],
                                      notes: {
                                        plain: {
                                          content: "已登录系统",
                                        },
                                      },
                                      children: {
                                        attached: [
                                          {
                                            title: "输入搜索条件",
                                            children: {
                                              attached: [{ title: "返回过滤结果" }],
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
  ];

  const zip = new JSZip();
  zip.file("content.json", JSON.stringify(xmindContent, null, 2));
  return zip.generateAsync({ type: "nodebuffer" });
}

async function main() {
  ensureTempRoot();

  console.log("\n=== Test: json-to-archive-md.mjs 默认路由到 XYZH 归档目录 ===");
  const xyzhVersion = `vtest-${runId}`;
  const xyzhRequirementName = `__qa-routing-xyzh-${runId}`;
  const xyzhInputPath = resolve(tempRoot, `${xyzhRequirementName}.json`);
  const xyzhOutputDir = resolve(repoRoot, "cases/archive/custom/xyzh", xyzhVersion);
  const xyzhOutputPath = resolve(xyzhOutputDir, `${xyzhRequirementName}.md`);
  writeFileSync(
    xyzhInputPath,
    JSON.stringify(
      createJsonFixture({
        projectName: "信永中和",
        requirementName: xyzhRequirementName,
        version: xyzhVersion,
      }),
      null,
      2,
    ),
    "utf8",
  );
  generatedDirPaths.add(xyzhOutputDir);
  const xyzhResult = runNodeScript(archiveScriptPath, [xyzhInputPath]);
  assert(xyzhResult.code === 0, "XYZH 默认路由执行成功", [
    xyzhResult.stderr.trim(),
    xyzhResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(xyzhOutputPath), "XYZH 默认路由写入 cases/archive/custom/xyzh/<version>/", [
    xyzhOutputPath,
  ]);
  if (existsSync(xyzhOutputPath)) {
    generatedFilePaths.add(xyzhOutputPath);
    const xyzhMd = readFileSync(xyzhOutputPath, "utf8");
    assert(xyzhMd.includes(`# 【${xyzhVersion}】${xyzhRequirementName}`), "XYZH 归档 Markdown 标题正确");
    assert(xyzhMd.includes("##### 验证归档路由脚本 「P1」"), "XYZH 归档 Markdown 包含测试用例内容");
  }

  console.log("\n=== Test: json-to-archive-md.mjs 默认路由到 DTStack 模块归档目录 ===");
  const dtRequirementName = `__qa-routing-data-assets-${runId}`;
  const dtInputPath = resolve(tempRoot, `${dtRequirementName}.json`);
  const dtOutputPath = resolve(repoRoot, "cases/archive/data-assets", `${dtRequirementName}.md`);
  writeFileSync(
    dtInputPath,
    JSON.stringify(
      createJsonFixture({
        projectName: "数据资产",
        requirementName: dtRequirementName,
        version: "vtest-route",
      }),
      null,
      2,
    ),
    "utf8",
  );
  const dtResult = runNodeScript(archiveScriptPath, [dtInputPath]);
  assert(dtResult.code === 0, "DTStack 模块默认路由执行成功", [
    dtResult.stderr.trim(),
    dtResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(dtOutputPath), "DTStack 模块默认路由写入 cases/archive/data-assets/", [
    dtOutputPath,
  ]);
  if (existsSync(dtOutputPath)) {
    generatedFilePaths.add(dtOutputPath);
    const dtMd = readFileSync(dtOutputPath, "utf8");
    assert(dtMd.includes("## 质量问题台账"), "DTStack 归档 Markdown 包含模块标题");
    assert(dtMd.includes("### 列表页"), "DTStack 归档 Markdown 保留页面层级");
  }

  console.log("\n=== Test: json-to-archive-md.mjs --from-xmind ===");
  const xmindTitle = `归档-XMind-${runId}`;
  const xmindPath = resolve(tempRoot, `${xmindTitle}.xmind`);
  const xmindOutputDir = resolve(tempRoot, "from-xmind-output");
  const xmindOutputPath = resolve(xmindOutputDir, `${xmindTitle}.md`);
  writeFileSync(xmindPath, await createXmindFixtureBuffer(xmindTitle));
  generatedDirPaths.add(xmindOutputDir);
  const xmindResult = runNodeScript(archiveScriptPath, ["--from-xmind", xmindPath, xmindOutputDir]);
  assert(xmindResult.code === 0, "--from-xmind 执行成功", [
    xmindResult.stderr.trim(),
    xmindResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(xmindOutputPath), "--from-xmind 生成归档 Markdown", [
    xmindOutputPath,
  ]);
  if (existsSync(xmindOutputPath)) {
    generatedFilePaths.add(xmindOutputPath);
    const xmindMd = readFileSync(xmindOutputPath, "utf8");
    assert(xmindMd.includes(`# ${xmindTitle}`), "--from-xmind 输出标题正确");
    assert(xmindMd.includes("#### 搜索功能"), "--from-xmind 保留子组层级");
    assert(xmindMd.includes("##### 验证 XMind 归档转换 「P1」"), "--from-xmind 保留优先级与用例标题");
  }

  console.log("\n=== Test: convert-history-cases.mjs --detect 输出可解析 JSON ===");
  const detectResult = runNodeScript(historyScriptPath, ["--detect"]);
  assert(detectResult.code === 0, "--detect 退出码为 0", [
    detectResult.stderr.trim(),
    detectResult.stdout.slice(0, 500).trim(),
  ].filter(Boolean));

  let detectReport = null;
  let detectParseError = null;
  try {
    detectReport = JSON.parse(detectResult.stdout);
  } catch (error) {
    detectParseError = error;
  }

  assert(detectParseError === null, "--detect stdout 是可解析 JSON", detectParseError ? [
    detectParseError.message,
    detectResult.stdout.slice(0, 500),
  ] : []);
  assert(Array.isArray(detectReport?.unconverted), "--detect JSON 含有 unconverted 数组");
  assert(typeof detectReport?.already_converted === "number", "--detect JSON 含有 already_converted 数值");
  assert(typeof detectReport?.total_unconverted === "number", "--detect JSON 含有 total_unconverted 数值");
  if (Array.isArray(detectReport?.unconverted) && detectReport.unconverted.length > 0) {
    const sample = detectReport.unconverted[0];
    assert(typeof sample.source === "string", "--detect 样例项含 source 字段");
    assert(typeof sample.target === "string", "--detect 样例项含 target 字段");
    assert(["csv", "xmind"].includes(sample.type), "--detect 样例项含合法 type 字段");
  }

  console.log(`\n══════════════════════════════════════`);
  console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
  console.log(`══════════════════════════════════════`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("❌ 测试脚本执行失败:", error);
  process.exit(1);
});
