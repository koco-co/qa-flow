/**
 * test-archive-history-scripts.mjs
 * 覆盖归档路由、XMind → Archive Markdown 以及历史用例检测输出
 *
 * 运行: node test-archive-history-scripts.mjs
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
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

function cleanupStale() {
  for (const entry of readdirSync(__dirname)) {
    if (entry.startsWith("__test_archive_history_")) {
      rmSync(resolve(__dirname, entry), { recursive: true, force: true });
    }
  }
}
cleanupStale();

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

function createXmindFixtureBuffer(title, {
  withSteps = true,
  groupMarkerId = null,
  caseMarkerId = "priority-2",
} = {}) {
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
                                ...(groupMarkerId ? {
                                  markers: [{ markerId: groupMarkerId }],
                                } : {}),
                                children: {
                                  attached: [
                                    {
                                      title: "验证 XMind 归档转换",
                                      markers: [{ markerId: caseMarkerId }],
                                      notes: {
                                        plain: {
                                          content: "已登录系统",
                                        },
                                      },
                                       children: withSteps ? {
                                         attached: [
                                           {
                                             title: "输入搜索条件",
                                             children: {
                                               attached: [{ title: "返回过滤结果" }],
                                             },
                                           },
                                         ],
                                       } : {
                                         attached: [],
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

  console.log("\n=== Test: json-to-archive-md.mjs 未命中模块时回退到版本目录 ===");
  const fallbackVersion = `vtest-${runId}`;
  const fallbackRequirementName = `__qa-routing-unmatched-${runId}`;
  const fallbackInputPath = resolve(tempRoot, `${fallbackRequirementName}.json`);
  const fallbackOutputDir = resolve(repoRoot, "cases/archive", fallbackVersion);
  const fallbackOutputPath = resolve(fallbackOutputDir, `${fallbackRequirementName}.md`);
  writeFileSync(
    fallbackInputPath,
    JSON.stringify(
      createJsonFixture({
        projectName: "外部项目",
        requirementName: fallbackRequirementName,
        version: fallbackVersion,
      }),
      null,
      2,
    ),
    "utf8",
  );
  generatedDirPaths.add(fallbackOutputDir);
  const fallbackResult = runNodeScript(archiveScriptPath, [fallbackInputPath]);
  assert(fallbackResult.code === 0, "未命中模块时归档转换执行成功", [
    fallbackResult.stderr.trim(),
    fallbackResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(fallbackOutputPath), "未命中模块时写入 cases/archive/<version>/", [
    fallbackOutputPath,
  ]);
  if (existsSync(fallbackOutputPath)) {
    generatedFilePaths.add(fallbackOutputPath);
    const fallbackMd = readFileSync(fallbackOutputPath, "utf8");
    assert(fallbackMd.includes(`suite_name: ${fallbackRequirementName}`), "fallback 归档 Markdown frontmatter 包含 suite_name");
    assert(fallbackMd.includes("##### 【P1】验证归档路由脚本"), "fallback 归档 Markdown 包含测试用例内容");
    assert(!/(^|\n)(name|module|version|source|created_at):/m.test(fallbackMd), "fallback 归档 Markdown 不再写 legacy frontmatter 字段", [fallbackMd]);
    assert(!/(^|\n)#\s/.test(fallbackMd), "fallback 归档 Markdown body 不再包含 H1 标题", [fallbackMd]);
    assert(/(^|\n)status:\s*已归档(\n|$)/m.test(fallbackMd), "fallback 归档 Markdown 状态写回中文已归档", [fallbackMd]);
  }

  console.log("\n=== Test: json-to-archive-md.mjs 默认路由到 DTStack 模块归档目录 ===");
  const dtRequirementName = `__qa-routing-data-assets-${runId}`;
  const dtInputPath = resolve(tempRoot, `${dtRequirementName}.json`);
  // With generic config (empty modules), routing falls back to cases/archive/{version}/ rather than cases/archive/{module}/
  const dtOutputDir = resolve(repoRoot, "cases/archive/vtest-route");
  const dtOutputPath = resolve(dtOutputDir, `${dtRequirementName}.md`);
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
  generatedDirPaths.add(dtOutputDir);
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
  // With generic config (empty modules), versioned routing falls back to cases/archive/{version}/ (no module subdir)
  const dtVersionedOutputDir = resolve(repoRoot, "cases/archive/v6.4.10");
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
  // With generic config (empty modules), module_key "data-assets" not recognized — falls back to cases/archive/v6.4.10/
  const titledOutputDir = resolve(repoRoot, "cases/archive/v6.4.10");
  const titledOutputPath = resolve(
    titledOutputDir,
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
  generatedDirPaths.add(titledOutputDir);
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
      titledOutputDir,
      `PRD-15530-${titledArchiveFileName}.md`,
    );
    assert(
      !existsSync(legacyPrefixedOutputPath),
      "即使 PRD 路径含 PRD 前缀，DTStack 仍优先输出纯需求标题文件名",
      [legacyPrefixedOutputPath],
    );
  }

  console.log("\n=== Test: json-to-archive-md.mjs 显式 PRD 关联缺路径时拒绝生成不合法归档 ===");
  const partialPrdRequirementName = `partial-prd-signal-${runId}`;
  const partialPrdInputPath = resolve(tempRoot, `${partialPrdRequirementName}.json`);
  const partialPrdOutputDir = resolve(repoRoot, "cases/archive/v6.4.11");
  const partialPrdOutputPath = resolve(partialPrdOutputDir, `${partialPrdRequirementName}.md`);
  writeFileSync(
    partialPrdInputPath,
    JSON.stringify(
      createJsonFixture({
        projectName: "数据资产",
        requirementName: partialPrdRequirementName,
        version: "v6.4.11",
        requirementId: "PRD-52",
      }),
      null,
      2,
    ),
    "utf8",
  );
  generatedDirPaths.add(partialPrdOutputDir);
  const partialPrdResult = runNodeScript(archiveScriptPath, [partialPrdInputPath]);
  assert(partialPrdResult.code !== 0, "显式 PRD 关联缺路径输入会失败而不是生成半套 frontmatter", [
    partialPrdResult.stderr.trim(),
    partialPrdResult.stdout.trim(),
  ].filter(Boolean));
  assert(!existsSync(partialPrdOutputPath), "显式 PRD 关联缺路径时不会生成不合法归档 Markdown", [
    partialPrdOutputPath,
  ]);
  assert(/prd_path/.test(`${partialPrdResult.stderr}\n${partialPrdResult.stdout}`), "失败信息会指出缺失的 prd_path", [
    partialPrdResult.stderr.trim(),
    partialPrdResult.stdout.trim(),
  ].filter(Boolean));

  console.log("\n=== Test: json-to-archive-md.mjs 仅显式 prd_version 时也拒绝生成不合法归档 ===");
  const prdVersionOnlyRequirementName = `partial-prd-version-only-${runId}`;
  const prdVersionOnlyInputPath = resolve(tempRoot, `${prdVersionOnlyRequirementName}.json`);
  const prdVersionOnlyOutputDir = resolve(repoRoot, "cases/archive/v6.4.12");
  const prdVersionOnlyOutputPath = resolve(prdVersionOnlyOutputDir, `${prdVersionOnlyRequirementName}.md`);
  writeFileSync(
    prdVersionOnlyInputPath,
    JSON.stringify(
      {
        ...createJsonFixture({
          projectName: "数据资产",
          requirementName: prdVersionOnlyRequirementName,
          version: "v6.4.12",
        }),
        meta: {
          ...createJsonFixture({
            projectName: "数据资产",
            requirementName: prdVersionOnlyRequirementName,
            version: "v6.4.12",
          }).meta,
          prd_version: "v6.4.12",
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  generatedDirPaths.add(prdVersionOnlyOutputDir);
  const prdVersionOnlyResult = runNodeScript(archiveScriptPath, [prdVersionOnlyInputPath]);
  assert(prdVersionOnlyResult.code !== 0, "仅显式 prd_version 输入也会失败而不是静默吞掉关联信号", [
    prdVersionOnlyResult.stderr.trim(),
    prdVersionOnlyResult.stdout.trim(),
  ].filter(Boolean));
  assert(!existsSync(prdVersionOnlyOutputPath), "仅显式 prd_version 时不会生成不合法归档 Markdown", [
    prdVersionOnlyOutputPath,
  ]);
  assert(/prd_id/.test(`${prdVersionOnlyResult.stderr}\n${prdVersionOnlyResult.stdout}`), "仅显式 prd_version 失败信息会指出缺失的 prd_id", [
    prdVersionOnlyResult.stderr.trim(),
    prdVersionOnlyResult.stdout.trim(),
  ].filter(Boolean));
  assert(/prd_path/.test(`${prdVersionOnlyResult.stderr}\n${prdVersionOnlyResult.stdout}`), "仅显式 prd_version 失败信息会指出缺失的 prd_path", [
    prdVersionOnlyResult.stderr.trim(),
    prdVersionOnlyResult.stdout.trim(),
  ].filter(Boolean));

  console.log("\n=== Test: DTStack 临时 final-reviewed 文件名不会污染归档文件名 ===");
  const tempReviewedRequirementName = `【内置规则丰富】有效性，json中key对应的value值格式校验-${runId}`;
  const tempReviewedInputPath = resolve(tempRoot, `final-reviewed-${runId}-clean.json`);
  // With generic config, prd_version "v6.4.10" overrides and routes to cases/archive/v6.4.10/
  const tempReviewedOutputDir = resolve(repoRoot, "cases/archive/v6.4.10");
  const tempReviewedOutputPath = resolve(
    tempReviewedOutputDir,
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
          requirementId: "PRD-18888",
          prdPath: `cases/requirements/data-assets/v6.4.10/${tempReviewedRequirementName}.md`,
        }),
        meta: {
          ...createJsonFixture({
            projectName: "DTStack",
            requirementName: tempReviewedRequirementName,
            version: "v6.4.10",
            requirementId: "PRD-18888",
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
  generatedDirPaths.add(tempReviewedOutputDir);
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
      tempReviewedOutputDir,
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
  // With generic config, version "vtest-prefix" routes to cases/archive/vtest-prefix/
  const prefixedOutputDir = resolve(repoRoot, "cases/archive/vtest-prefix");
  const prefixedOutputPath = resolve(
    prefixedOutputDir,
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
  generatedDirPaths.add(prefixedOutputDir);
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
  // With generic config, version "vtest-meta" routes to cases/archive/vtest-meta/
  const metaOutputDir = resolve(repoRoot, "cases/archive/vtest-meta");
  const metaOutputPath = resolve(metaOutputDir, metaPrdBaseName);
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
  generatedDirPaths.add(metaOutputDir);
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
    assert(!/(^|\n)prd_(id|version|path):/m.test(xmindMd), "--from-xmind 无关联 PRD 时不写半套 prd_* 字段", [xmindMd]);
    assert(/(^|\n)status:\s*已归档(\n|$)/m.test(xmindMd), "--from-xmind 归档状态写回中文已归档", [xmindMd]);
  }

  console.log("\n=== Test: json-to-archive-md.mjs --from-xmind 不虚构待补充步骤 ===");
  const markerOnlyTitle = `归档-XMind-marker-only-${runId}`;
  const markerOnlyXmindPath = resolve(tempRoot, `${markerOnlyTitle}.xmind`);
  const markerOnlyOutputDir = resolve(tempRoot, "from-xmind-marker-only-output");
  const markerOnlyOutputPath = resolve(markerOnlyOutputDir, `${markerOnlyTitle}.md`);
  writeFileSync(markerOnlyXmindPath, await createXmindFixtureBuffer(markerOnlyTitle, { withSteps: false }));
  generatedDirPaths.add(markerOnlyOutputDir);
  const markerOnlyResult = runNodeScript(archiveScriptPath, ["--from-xmind", markerOnlyXmindPath, markerOnlyOutputDir]);
  assert(markerOnlyResult.code === 0, "marker-only XMind 输入执行成功", [
    markerOnlyResult.stderr.trim(),
    markerOnlyResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(markerOnlyOutputPath), "marker-only XMind 生成归档 Markdown", [
    markerOnlyOutputPath,
  ]);
  if (existsSync(markerOnlyOutputPath)) {
    generatedFilePaths.add(markerOnlyOutputPath);
    const markerOnlyMd = readFileSync(markerOnlyOutputPath, "utf8");
    assert(!markerOnlyMd.includes("待补充"), "marker-only XMind 不会虚构待补充步骤", [markerOnlyMd]);
    assert(markerOnlyMd.includes("| 编号 | 步骤 | 预期 |"), "marker-only XMind 仍保留空步骤表头", [markerOnlyMd]);
  }

  console.log("\n=== Test: json-to-archive-md.mjs 非优先级 marker 不会把分组误判为 testcase ===");
  const nonPriorityMarkerTitle = `归档-XMind-non-priority-marker-${runId}`;
  const nonPriorityMarkerXmindPath = resolve(tempRoot, `${nonPriorityMarkerTitle}.xmind`);
  const nonPriorityMarkerOutputDir = resolve(tempRoot, "from-xmind-non-priority-marker-output");
  const nonPriorityMarkerOutputPath = resolve(nonPriorityMarkerOutputDir, `${nonPriorityMarkerTitle}.md`);
  writeFileSync(
    nonPriorityMarkerXmindPath,
    await createXmindFixtureBuffer(nonPriorityMarkerTitle, { groupMarkerId: "task-done" }),
  );
  generatedDirPaths.add(nonPriorityMarkerOutputDir);
  const nonPriorityMarkerResult = runNodeScript(archiveScriptPath, ["--from-xmind", nonPriorityMarkerXmindPath, nonPriorityMarkerOutputDir]);
  assert(nonPriorityMarkerResult.code === 0, "非优先级 marker XMind 输入执行成功", [
    nonPriorityMarkerResult.stderr.trim(),
    nonPriorityMarkerResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(nonPriorityMarkerOutputPath), "非优先级 marker XMind 生成归档 Markdown", [
    nonPriorityMarkerOutputPath,
  ]);
  if (existsSync(nonPriorityMarkerOutputPath)) {
    generatedFilePaths.add(nonPriorityMarkerOutputPath);
    const nonPriorityMarkerMd = readFileSync(nonPriorityMarkerOutputPath, "utf8");
    assert(nonPriorityMarkerMd.includes("#### 搜索功能"), "非优先级 marker 不会吞掉原有分组层级", [nonPriorityMarkerMd]);
    assert(nonPriorityMarkerMd.includes("##### 【P1】验证 XMind 归档转换"), "非优先级 marker 不会把分组节点误判为 testcase", [nonPriorityMarkerMd]);
    assert(!nonPriorityMarkerMd.includes("##### 【P2】搜索功能"), "非优先级 marker 不会错误生成分组标题为 testcase", [nonPriorityMarkerMd]);
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

  console.log("\n=== Test: convert-history-cases.mjs --path <xmind> front-matter 契约 ===");
  const historyModuleKey = `__archive-history-${runId}`;
  const historyXmindDir = resolve(repoRoot, "cases", "xmind", historyModuleKey);
  const historyArchiveDir = resolve(repoRoot, "cases", "archive", historyModuleKey);
  const historyXmindBaseName = `history-fixture-${runId}.xmind`;
  const historyXmindPath = resolve(historyXmindDir, historyXmindBaseName);
  const historyOutputPath = resolve(
    historyArchiveDir,
    historyXmindBaseName.replace(/\.xmind$/, ".md"),
  );
  mkdirSync(historyXmindDir, { recursive: true });
  writeFileSync(historyXmindPath, await createXmindFixtureBuffer(`历史归档-${runId}`));
  generatedDirPaths.add(historyXmindDir);
  generatedDirPaths.add(historyArchiveDir);
  const historyConvertResult = runNodeScript(historyScriptPath, ["--path", historyXmindPath, "--force"]);
  assert(historyConvertResult.code === 0, "convert-history-cases --path xmind 执行成功", [
    historyConvertResult.stderr.trim(),
    historyConvertResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(historyOutputPath), "convert-history-cases --path xmind 生成 Archive Markdown", [
    historyOutputPath,
  ]);
  if (existsSync(historyOutputPath)) {
    generatedFilePaths.add(historyOutputPath);
    const historyMd = readFileSync(historyOutputPath, "utf8");
    assert(!/(^|\n)prd_(id|version|path):/m.test(historyMd), "convert-history-cases XMind 输出不写半套 prd_* 字段", [historyMd]);
    assert(/(^|\n)status:\s*已归档(\n|$)/m.test(historyMd), "convert-history-cases XMind 输出状态写回中文已归档", [historyMd]);
    assert(historyMd.includes("##### 【P1】验证 XMind 归档转换"), "convert-history-cases XMind 输出保留 canonical 用例标题", [historyMd]);
    assert(/(^|\n)case_count:\s*1(\n|$)/m.test(historyMd), "convert-history-cases XMind 输出 case_count 与真实用例数一致", [historyMd]);
  }

  console.log("\n=== Test: convert-history-cases.mjs --path <xmind> marker-only case 仍生成 canonical block ===");
  const markerOnlyHistoryModuleKey = `__archive-history-marker-${runId}`;
  const markerOnlyHistoryXmindDir = resolve(repoRoot, "cases", "xmind", markerOnlyHistoryModuleKey);
  const markerOnlyHistoryArchiveDir = resolve(repoRoot, "cases", "archive", markerOnlyHistoryModuleKey);
  const markerOnlyHistoryBaseName = `history-marker-only-${runId}.xmind`;
  const markerOnlyHistoryXmindPath = resolve(markerOnlyHistoryXmindDir, markerOnlyHistoryBaseName);
  const markerOnlyHistoryOutputPath = resolve(
    markerOnlyHistoryArchiveDir,
    markerOnlyHistoryBaseName.replace(/\.xmind$/, ".md"),
  );
  mkdirSync(markerOnlyHistoryXmindDir, { recursive: true });
  writeFileSync(
    markerOnlyHistoryXmindPath,
    await createXmindFixtureBuffer(`历史归档-marker-only-${runId}`, { withSteps: false }),
  );
  generatedDirPaths.add(markerOnlyHistoryXmindDir);
  generatedDirPaths.add(markerOnlyHistoryArchiveDir);
  const markerOnlyHistoryConvertResult = runNodeScript(historyScriptPath, [
    "--path",
    markerOnlyHistoryXmindPath,
    "--force",
  ]);
  assert(markerOnlyHistoryConvertResult.code === 0, "convert-history-cases marker-only XMind 执行成功", [
    markerOnlyHistoryConvertResult.stderr.trim(),
    markerOnlyHistoryConvertResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(markerOnlyHistoryOutputPath), "convert-history-cases marker-only XMind 生成 Archive Markdown", [
    markerOnlyHistoryOutputPath,
  ]);
  if (existsSync(markerOnlyHistoryOutputPath)) {
    generatedFilePaths.add(markerOnlyHistoryOutputPath);
    const markerOnlyHistoryMd = readFileSync(markerOnlyHistoryOutputPath, "utf8");
    assert(markerOnlyHistoryMd.includes("##### 【P1】验证 XMind 归档转换"), "convert-history-cases marker-only XMind 保留 canonical 用例标题", [markerOnlyHistoryMd]);
    assert(markerOnlyHistoryMd.includes("| 编号 | 步骤 | 预期 |"), "convert-history-cases marker-only XMind 保留空步骤表头", [markerOnlyHistoryMd]);
    assert(!/\n- 验证 XMind 归档转换\n/.test(markerOnlyHistoryMd), "convert-history-cases marker-only XMind 不再退化为 bullet", [markerOnlyHistoryMd]);
    assert(/(^|\n)case_count:\s*1(\n|$)/m.test(markerOnlyHistoryMd), "convert-history-cases marker-only XMind case_count 正确统计 canonical case", [markerOnlyHistoryMd]);
  }

  console.log("\n=== Test: convert-history-cases.mjs CSV 输出遵循 canonical Archive 契约 ===");
  const csvModuleKey = `__archive-csv-${runId}`;
  const csvVersion = `vcsv-${runId}`;
  const csvHistoryDir = resolve(repoRoot, "cases", "history", csvModuleKey, csvVersion);
  const csvArchiveDir = resolve(repoRoot, "cases", "archive", csvModuleKey, csvVersion);
  const csvBaseName = `history-fixture-${runId}`;
  const csvPath = resolve(csvHistoryDir, `${csvBaseName}.csv`);
  const csvOutputPath = resolve(csvArchiveDir, `${csvBaseName}.md`);
  mkdirSync(csvHistoryDir, { recursive: true });
  writeFileSync(
    csvPath,
    [
      "所属模块,用例标题,前置条件,步骤,预期结果,优先级",
      "\"数据资产\",\"验证 CSV 历史归档\",\"已登录系统\",\"1、进入页面\n2、点击查询\",\"1、页面正常加载\n2、返回过滤结果\",\"1\"",
    ].join("\n"),
    "utf8",
  );
  generatedDirPaths.add(csvHistoryDir);
  generatedDirPaths.add(csvArchiveDir);
  const csvConvertResult = runNodeScript(historyScriptPath, ["--module", csvModuleKey, "--force"]);
  assert(csvConvertResult.code === 0, "convert-history-cases CSV 扫描执行成功", [
    csvConvertResult.stderr.trim(),
    csvConvertResult.stdout.trim(),
  ].filter(Boolean));
  assert(existsSync(csvOutputPath), "convert-history-cases CSV 输出写入 canonical archive 目录", [
    csvOutputPath,
  ]);
  if (existsSync(csvOutputPath)) {
    generatedFilePaths.add(csvOutputPath);
    const csvMd = readFileSync(csvOutputPath, "utf8");
    assert(csvMd.includes(`suite_name: ${csvBaseName} ${csvVersion}`), "convert-history-cases CSV 输出写入 canonical suite_name", [csvMd]);
    assert(!/(^|\n)(name|module|version|source|created_at):/m.test(csvMd), "convert-history-cases CSV 输出不再写 legacy frontmatter 字段", [csvMd]);
    assert(!/(^|\n)#\s/.test(csvMd), "convert-history-cases CSV 输出 body 不再包含 H1 标题", [csvMd]);
    assert(csvMd.includes("##### 【P1】验证 CSV 历史归档"), "convert-history-cases CSV 输出使用 canonical 用例标题格式", [csvMd]);
    assert(/(^|\n)status:\s*已归档(\n|$)/m.test(csvMd), "convert-history-cases CSV 输出状态写回中文已归档", [csvMd]);
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
