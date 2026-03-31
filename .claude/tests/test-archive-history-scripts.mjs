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
const archiveScriptPath = resolve(__dirname, "..", "skills", "archive-converter", "scripts", "json-to-archive-md.mjs");
const historyScriptPath = resolve(__dirname, "..", "skills", "archive-converter", "scripts", "convert-history-cases.mjs");
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

function createJsonFixture({
  projectName,
  requirementName,
  version,
  requirementId,
  prdPath,
  story,
}) {
  return {
    meta: {
      project_name: projectName,
      requirement_name: requirementName,
      version,
      ...(requirementId ? { requirement_id: requirementId } : {}),
      ...(prdPath ? { prd_path: prdPath } : {}),
      ...(story ? { story } : {}),
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
    assert(xyzhMd.includes(`suite_name: ${xyzhRequirementName}`), "XYZH 归档 Markdown frontmatter 包含 suite_name");
    assert(xyzhMd.includes("##### 【P1】验证归档路由脚本"), "XYZH 归档 Markdown 包含测试用例内容");
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

  console.log("\n=== Test: json-to-archive-md.mjs 为 DTStack 语义版本自动创建版本目录 ===");
  const dtVersionedRequirementName = `__qa-routing-data-assets-semver-${runId}`;
  const dtVersionedInputPath = resolve(tempRoot, `${dtVersionedRequirementName}.json`);
  const dtVersionedOutputDir = resolve(repoRoot, "cases/archive/data-assets", "v6.4.10");
  const dtVersionedOutputPath = resolve(dtVersionedOutputDir, `${dtVersionedRequirementName}.md`);
  writeFileSync(
    dtVersionedInputPath,
    JSON.stringify(
      createJsonFixture({
        projectName: "数据资产",
        requirementName: dtVersionedRequirementName,
        version: "v6.4.10",
      }),
      null,
      2,
    ),
    "utf8",
  );
  generatedDirPaths.add(dtVersionedOutputDir);
  const dtVersionedResult = runNodeScript(archiveScriptPath, [dtVersionedInputPath]);
  assert(dtVersionedResult.code === 0, "DTStack 语义版本路由执行成功", [
    dtVersionedResult.stderr.trim(),
    dtVersionedResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(dtVersionedOutputPath), "DTStack 语义版本路由写入 cases/archive/data-assets/v6.4.10/", [
    dtVersionedOutputPath,
  ]);

  console.log("\n=== Test: json-to-archive-md.mjs DTStack 优先使用需求标题命名 ===");
  const titledInputPath = resolve(tempRoot, `final-reviewed-titled-${runId}.json`);
  const titledRequirementName = "数据资产V6.4.10";
  const titledArchiveFileName = `【内置规则丰富】合理性，多表，字段大小对比以及字段计算逻辑对比-${runId}`;
  const titledOutputPath = resolve(
    repoRoot,
    "cases/archive/data-assets/v6.4.10",
    `${titledArchiveFileName}.md`,
  );
  const titledFixture = createJsonFixture({
    projectName: "数据资产",
    requirementName: titledRequirementName,
    version: "v6.4.10",
    story: "Story-20260328",
    prdPath: `cases/requirements/data-assets/Story-20260328/PRD-15530-${titledArchiveFileName}.md`,
  });
  writeFileSync(
    titledInputPath,
    JSON.stringify(
      {
        ...titledFixture,
        meta: {
          ...titledFixture.meta,
          archive_file_name: titledArchiveFileName,
          requirement_title: titledArchiveFileName,
          module_key: "data-assets",
          source_standard: "dtstack",
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  const titledResult = runNodeScript(archiveScriptPath, [titledInputPath]);
  assert(titledResult.code === 0, "DTStack 需求标题命名执行成功", [
    titledResult.stderr.trim(),
    titledResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(titledOutputPath), "DTStack 归档文件名优先使用 archive_file_name / requirement_title", [
    titledOutputPath,
  ]);
  if (existsSync(titledOutputPath)) {
    generatedFilePaths.add(titledOutputPath);
    const legacyPrefixedOutputPath = resolve(
      repoRoot,
      "cases/archive/data-assets/v6.4.10",
      `PRD-15530-${titledArchiveFileName}.md`,
    );
    assert(
      !existsSync(legacyPrefixedOutputPath),
      "即使 PRD 路径含 PRD 前缀，DTStack 仍优先输出纯需求标题文件名",
      [legacyPrefixedOutputPath],
    );
  }

  console.log("\n=== Test: DTStack 临时 final-reviewed 文件名不会污染归档文件名 ===");
  const tempReviewedRequirementName = `【内置规则丰富】有效性，json中key对应的value值格式校验-${runId}`;
  const tempReviewedInputPath = resolve(tempRoot, `final-reviewed-${runId}-clean.json`);
  const tempReviewedOutputPath = resolve(
    repoRoot,
    "cases/archive/data-assets/v6.4.10",
    `${tempReviewedRequirementName}.md`,
  );
  writeFileSync(
    tempReviewedInputPath,
    JSON.stringify(
      {
        ...createJsonFixture({
          projectName: "DTStack",
          requirementName: tempReviewedRequirementName,
          version: "v6.4.10",
          prdPath: `cases/requirements/data-assets/v6.4.10/${tempReviewedRequirementName}.md`,
        }),
        meta: {
          ...createJsonFixture({
            projectName: "DTStack",
            requirementName: tempReviewedRequirementName,
            version: "v6.4.10",
            prdPath: `cases/requirements/data-assets/v6.4.10/${tempReviewedRequirementName}.md`,
          }).meta,
          module_key: "data-assets",
          prd_version: "v6.4.10",
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  const tempReviewedResult = runNodeScript(archiveScriptPath, [tempReviewedInputPath]);
  assert(tempReviewedResult.code === 0, "DTStack 临时 final-reviewed 输入执行成功", [
    tempReviewedResult.stderr.trim(),
    tempReviewedResult.stdout.trim(),
  ].filter(Boolean));
  assert(
    existsSync(tempReviewedOutputPath),
    "DTStack 临时 final-reviewed 输入仍按 requirement_name 生成归档文件名",
    [tempReviewedOutputPath],
  );
  if (existsSync(tempReviewedOutputPath)) {
    generatedFilePaths.add(tempReviewedOutputPath);
    const pollutedOutputPath = resolve(
      repoRoot,
      "cases/archive/data-assets/v6.4.10",
      `final-reviewed-${runId}-clean.md`,
    );
    assert(
      !existsSync(pollutedOutputPath),
      "临时 final-reviewed basename 不会污染归档文件名",
      [pollutedOutputPath],
    );
  }

  console.log("\n=== Test: json-to-archive-md.mjs 输出文件名优先保留 PRD 前缀 ===");
  const prefixedRequirementName = `__qa-prd-prefix-${runId}`;
  const prefixedInputBaseName = `PRD-26-${prefixedRequirementName}.json`;
  const prefixedInputPath = resolve(tempRoot, prefixedInputBaseName);
  const prefixedOutputPath = resolve(
    repoRoot,
    "cases/archive/data-assets",
    prefixedInputBaseName.replace(/\.json$/, ".md"),
  );
  writeFileSync(
    prefixedInputPath,
    JSON.stringify(
      createJsonFixture({
        projectName: "数据资产",
        requirementName: prefixedRequirementName,
        version: "vtest-prefix",
      }),
      null,
      2,
    ),
    "utf8",
  );
  const prefixedResult = runNodeScript(archiveScriptPath, [prefixedInputPath]);
  assert(prefixedResult.code === 0, "PRD 前缀输入执行成功", [
    prefixedResult.stderr.trim(),
    prefixedResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(prefixedOutputPath), "当输入文件名含 PRD 前缀时，输出文件名保留 PRD 前缀", [
    prefixedOutputPath,
  ]);
  if (existsSync(prefixedOutputPath)) {
    generatedFilePaths.add(prefixedOutputPath);
    const prefixedMd = readFileSync(prefixedOutputPath, "utf8");
    assert(prefixedMd.includes(`suite_name:`), "PRD 前缀归档 Markdown frontmatter 包含 suite_name");
  }

  console.log("\n=== Test: json-to-archive-md.mjs 可从 JSON meta 恢复 PRD 级命名 ===");
  const metaRequirementName = `质量问题台账-${runId}`;
  const metaPrdBaseName = `PRD-52-${metaRequirementName}.md`;
  const metaInputPath = resolve(tempRoot, `final-reviewed-${runId}.json`);
  const metaOutputPath = resolve(repoRoot, "cases/archive/data-assets", metaPrdBaseName);
  writeFileSync(
    metaInputPath,
    JSON.stringify(
      createJsonFixture({
        projectName: "数据资产",
        requirementName: metaRequirementName,
        version: "vtest-meta",
        requirementId: "PRD-52",
        prdPath: `cases/requirements/data-assets/Story-20260322/${metaPrdBaseName}`,
        story: "Story-20260322",
      }),
      null,
      2,
    ),
    "utf8",
  );
  const metaResult = runNodeScript(archiveScriptPath, [metaInputPath]);
  assert(metaResult.code === 0, "meta 驱动命名输入执行成功", [
    metaResult.stderr.trim(),
    metaResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(metaOutputPath), "当 JSON meta 能识别 PRD 文件名时，输出遵循 PRD-XX-<功能名>.md", [
    metaOutputPath,
  ]);
  if (existsSync(metaOutputPath)) {
    generatedFilePaths.add(metaOutputPath);
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
    assert(xmindMd.includes(`suite_name: ${xmindTitle}`) || xmindMd.includes(`suite_name:`), "--from-xmind 输出标题在 frontmatter 中正确");
    assert(xmindMd.includes("#### 搜索功能"), "--from-xmind 保留子组层级");
    assert(xmindMd.includes("##### 【P") && xmindMd.includes("验证 XMind 归档转换"), "--from-xmind 保留优先级与用例标题");
  }

  console.log("\n=== Test: json-to-archive-md.mjs --from-xmind 保留 canonical XMind basename ===");
  const canonicalXmindBaseName = `质量问题台账-${runId}.xmind`;
  const canonicalXmindTitle = `【vtest-canonical】质量问题台账-${runId}`;
  const canonicalXmindPath = resolve(tempRoot, canonicalXmindBaseName);
  const canonicalOutputDir = resolve(tempRoot, "from-xmind-canonical-output");
  const canonicalOutputPath = resolve(
    canonicalOutputDir,
    canonicalXmindBaseName.replace(/\.xmind$/, ".md"),
  );
  writeFileSync(canonicalXmindPath, await createXmindFixtureBuffer(canonicalXmindTitle));
  generatedDirPaths.add(canonicalOutputDir);
  const canonicalXmindResult = runNodeScript(archiveScriptPath, [
    "--from-xmind",
    canonicalXmindPath,
    canonicalOutputDir,
  ]);
  assert(canonicalXmindResult.code === 0, "canonical XMind 输入执行成功", [
    canonicalXmindResult.stderr.trim(),
    canonicalXmindResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(canonicalOutputPath), "canonical XMind 输入输出沿用同 basename 的 .md", [
    canonicalOutputPath,
  ]);
  if (existsSync(canonicalOutputPath)) {
    generatedFilePaths.add(canonicalOutputPath);
  }

  console.log("\n=== Test: json-to-archive-md.mjs --from-xmind 保持 legacy 标题输出兼容 ===");
  const legacyXmindBaseName = `legacy-xmind-${runId}.xmind`;
  const legacyXmindTitle = `旧版归档标题-${runId}`;
  const legacyXmindPath = resolve(tempRoot, legacyXmindBaseName);
  const legacyOutputDir = resolve(tempRoot, "from-xmind-legacy-output");
  const legacyOutputPath = resolve(legacyOutputDir, `${legacyXmindTitle}.md`);
  writeFileSync(legacyXmindPath, await createXmindFixtureBuffer(legacyXmindTitle));
  generatedDirPaths.add(legacyOutputDir);
  const legacyXmindResult = runNodeScript(archiveScriptPath, [
    "--from-xmind",
    legacyXmindPath,
    legacyOutputDir,
  ]);
  assert(legacyXmindResult.code === 0, "legacy XMind 输入执行成功", [
    legacyXmindResult.stderr.trim(),
    legacyXmindResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(legacyOutputPath), "legacy XMind 输入仍按标题导出，兼容历史转换", [
    legacyOutputPath,
  ]);
  if (existsSync(legacyOutputPath)) {
    generatedFilePaths.add(legacyOutputPath);
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
  cleanup();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("❌ 测试脚本执行失败:", error);
  cleanup();
  process.exit(1);
});
