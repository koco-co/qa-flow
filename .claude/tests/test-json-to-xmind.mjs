/**
 * test-json-to-xmind.mjs
 * 基础测试：验证 json-to-xmind.mjs 的 JSON 结构校验和转换逻辑
 *
 * 运行: node test-json-to-xmind.mjs
 */
import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  lstatSync,
  readlinkSync,
  renameSync,
  symlinkSync,
} from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import JSZip from "jszip";

const __dirname = dirname(fileURLToPath(import.meta.url));
let passed = 0;
let failed = 0;
let testsRun = 0;
const testFilter = process.env.TEST_FILTER?.trim();

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

const jsonToXmindScriptPath = resolve(__dirname, "..", "skills", "xmind-converter", "scripts", "json-to-xmind.mjs");

function runScript(args) {
  try {
    const result = execSync(`node ${jsonToXmindScriptPath} ${args}`, {
      cwd: __dirname,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout: result, stderr: "", code: 0 };
  } catch (err) {
    return { stdout: err.stdout || "", stderr: err.stderr || "", code: err.status };
  }
}

async function runTest(name, fn) {
  if (testFilter && !name.includes(testFilter)) return;
  testsRun++;
  console.log(`\n=== Test: ${name} ===`);
  cleanup();
  await fn();
}

// ─── Test Data ──────────────────────────────────────────────

const validJson = {
  meta: {
    project_name: "测试项目",
    requirement_name: "测试需求",
    version: "v1.0",
    generated_at: new Date().toISOString(),
    agent_id: "test",
  },
  modules: [
    {
      name: "测试模块",
      pages: [
        {
          name: "列表页",
          sub_groups: [
            {
              name: "搜索功能",
              test_cases: [
                {
                  title: "验证搜索功能正常",
                  priority: "P0",
                  case_type: "正常用例",
                  precondition: "已登录系统",
                  steps: [
                    { step: "进入【测试模块-列表页】页面", expected: "页面正常加载" },
                    { step: "在「搜索框」输入\"测试\"", expected: "列表按关键字过滤" },
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

const invalidJsonNoMeta = { modules: [{ name: "test" }] };
const invalidJsonNoModules = { meta: { project_name: "test", requirement_name: "test" } };
const invalidJsonEmptyModules = { meta: { project_name: "test", requirement_name: "test" }, modules: [] };
const dtstackJson = {
  meta: {
    project_name: "数据资产",
    requirement_name: "【内置规则丰富】质量校验不通过时支持发送邮件",
    requirement_ticket: "10307",
    requirement_id: "15602",
    version: "v6.4.10",
    source_standard: "dtstack",
    module_key: "data-assets",
    generated_at: new Date().toISOString(),
    agent_id: "test-dtstack",
  },
  modules: [
    {
      name: "数据质量",
      pages: [
        {
          name: "调度属性配置",
          test_cases: [
            {
              title: "验证「调度属性配置」页面-告警方式选择「邮箱」时显示「是否发送明细数据」选项",
              priority: "P1",
              precondition: "已存在单表校验规则",
              steps: [
                { step: "进入【数据资产】-【数据质量】-【规则任务配置】页面", expected: "页面正常加载" },
              ],
            },
          ],
        },
      ],
    },
  ],
};
const dtstackJsonSecond = {
  meta: {
    ...dtstackJson.meta,
    requirement_name: "【内置规则丰富】一致性，多表数据一致性比对",
    requirement_ticket: "15525",
    requirement_id: "15525",
  },
  modules: [
    {
      name: "数据质量",
      pages: [
        {
          name: "规则集配置",
          test_cases: [
            {
              title: "验证多表数据一致性比对支持联合主键",
              priority: "P0",
              precondition: "已存在三张结构兼容的数据表",
              steps: [
                { step: "进入【数据质量-规则集配置】页面", expected: "页面正常加载" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const repoRoot = resolve(__dirname, "..", "..");
const tmpInput = resolve(__dirname, "_test_input.json");
const tmpInputSecond = resolve(__dirname, "_test_input_second.json");
const tmpOutput = resolve(__dirname, "测试需求.xmind");
const tmpOutputAlt = resolve(__dirname, "Story-20260322.xmind");
const invalidNamedOutput = resolve(__dirname, "202603-测试需求.xmind");
const reservedNamedOutput = resolve(__dirname, "latest-output.xmind");
const legacyAppendOutput = resolve(__dirname, "legacy-output.xmind");
const latestOutputLink = resolve(repoRoot, "latest-output.xmind");
const legacyRootLink = resolve(repoRoot, "legacy-output.xmind");

function captureExistingPath(path) {
  if (!pathExists(path)) return null;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    return { type: "symlink", target: readlinkSync(path) };
  }
  return { type: "file", content: readFileSync(path) };
}

const preservedLatestOutput = captureExistingPath(latestOutputLink);
const preservedLegacyRootLink = captureExistingPath(legacyRootLink);

/** 根据实际输出路径计算根目录快捷链接路径 */
function getDynamicLinkPath(outputPath) {
  return resolve(repoRoot, basename(outputPath));
}

function pathExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function cleanup() {
  [tmpInput, tmpInputSecond, tmpOutput, tmpOutputAlt, invalidNamedOutput, reservedNamedOutput, legacyAppendOutput].forEach(
    (p) => { if (existsSync(p)) unlinkSync(p); }
  );
  [latestOutputLink, legacyRootLink, tmpOutput, tmpOutputAlt, legacyAppendOutput].forEach((p) => {
    const link = getDynamicLinkPath(p);
    if (pathExists(link)) unlinkSync(link);
  });
  if (pathExists(latestOutputLink)) unlinkSync(latestOutputLink);
  if (pathExists(legacyRootLink)) unlinkSync(legacyRootLink);
}

function restorePath(path, snapshot) {
  if (!snapshot) return;
  if (snapshot.type === "symlink") {
    symlinkSync(snapshot.target, path);
    return;
  }
  writeFileSync(path, snapshot.content);
}

process.on("exit", () => {
  cleanup();
  restorePath(latestOutputLink, preservedLatestOutput);
  restorePath(legacyRootLink, preservedLegacyRootLink);
});

function assertLatestOutputPointsTo(expectedOutputPath, label) {
  assert(pathExists(latestOutputLink), `${label}: 创建了 latest-output.xmind 快捷链接`);
  if (!pathExists(latestOutputLink)) return;

  const linkStat = lstatSync(latestOutputLink);
  assert(linkStat.isSymbolicLink(), `${label}: latest-output.xmind 是符号链接`);
  if (linkStat.isSymbolicLink()) {
    assert(
      resolve(repoRoot, readlinkSync(latestOutputLink)) === resolve(expectedOutputPath),
      `${label}: latest-output.xmind 指向实际输出文件`,
    );
  }
  assert(
    !pathExists(getDynamicLinkPath(expectedOutputPath)),
    `${label}: 不再创建根目录同名快捷链接 ${basename(expectedOutputPath)}`,
  );
}

async function readXmindContent(outputPath) {
  const zip = await JSZip.loadAsync(readFileSync(outputPath));
  const contentStr = await zip.file("content.json").async("string");
  return JSON.parse(contentStr);
}

// ─── Tests ──────────────────────────────────────────────────

await runTest("保留输出文件名应被拒绝", () => {
  writeFileSync(tmpInput, JSON.stringify(validJson), "utf8");
  const result = runScript(`${tmpInput} ${reservedNamedOutput}`);
  assert(result.code !== 0, "退出码非 0");
  assert(
    result.stderr.includes("保留输出文件名"),
    "错误消息说明 latest-output.xmind 是保留输出名",
  );
});

await runTest("有效 JSON 生成 XMind", () => {
  writeFileSync(tmpInput, JSON.stringify(validJson), "utf8");
  const r1 = runScript(`${tmpInput} ${tmpOutput}`);
  assert(r1.code === 0, "退出码为 0");
  assert(existsSync(tmpOutput), "生成了 .xmind 文件");
  assert(r1.stdout.includes("XMind 文件已生成"), "输出包含成功消息");
});

await runTest("新建 XMind 输出文件名必须符合命名 contract", () => {
  writeFileSync(tmpInput, JSON.stringify(validJson), "utf8");
  const result = runScript(`${tmpInput} ${invalidNamedOutput}`);
  assert(result.code !== 0, "退出码非 0");
  assert(
    result.stderr.includes("命名 contract") && result.stderr.includes("<功能名>.xmind"),
    "错误消息说明 XMind 命名 contract",
  );
  assert(!pathExists(invalidNamedOutput), "未生成不合规命名的 XMind 文件");
});

await runTest("latest-output.xmind 随成功输出刷新", () => {
  writeFileSync(tmpInput, JSON.stringify(validJson), "utf8");

  const latestCreate = runScript(`${tmpInput} ${tmpOutput}`);
  assert(latestCreate.code === 0, "create 模式退出码为 0");
  assertLatestOutputPointsTo(tmpOutput, "create 模式");

  const latestCreateAlt = runScript(`${tmpInput} ${tmpOutputAlt}`);
  assert(latestCreateAlt.code === 0, "create 模式刷新到新路径时退出码为 0");
  assertLatestOutputPointsTo(tmpOutputAlt, "create 模式刷新");

  const latestAppend = runScript(`--append ${tmpInput} ${tmpOutput}`);
  assert(latestAppend.code === 0, "append 模式退出码为 0");
  assertLatestOutputPointsTo(tmpOutput, "append 模式");

  const latestReplace = runScript(`--replace ${tmpInput} ${tmpOutputAlt}`);
  assert(latestReplace.code === 0, "replace 模式退出码为 0");
  assertLatestOutputPointsTo(tmpOutputAlt, "replace 模式");
});

await runTest("DTStack 输出遵循样例风格的根节点与 L1 元数据", async () => {
  writeFileSync(tmpInput, JSON.stringify(dtstackJson), "utf8");
  const dtOutput = resolve(__dirname, "数据资产v6.4.10.xmind");
  if (existsSync(dtOutput)) unlinkSync(dtOutput);

  const result = runScript(`${tmpInput} ${dtOutput}`);
  assert(result.code === 0, "DTStack XMind 生成成功");
  assert(existsSync(dtOutput), "DTStack XMind 文件已生成");
  if (!existsSync(dtOutput)) {
    return;
  }

  const content = await readXmindContent(dtOutput);
  const root = content[0]?.rootTopic;
  const l1 = root?.children?.attached?.[0];
  const firstCase = l1?.children?.attached?.[0]?.children?.attached?.[0]?.children?.attached?.[0];

  assert(root?.title === "数据资产v6.4.10迭代用例", "DTStack root title 使用 <项目><版本>迭代用例");
  assert(
    l1?.title === "【内置规则丰富】质量校验不通过时支持发送邮件(#10307)",
    "DTStack L1 title 附带 requirement ticket",
  );
  assert(
    Array.isArray(l1?.labels) && l1.labels.includes("(#15602)"),
    "DTStack L1 labels 包含 requirement_id",
  );
  assert(l1?.branch === "folded", "DTStack L1 默认折叠");
  assert(
    Array.isArray(firstCase?.markers) && firstCase.markers.some((marker) => marker.markerId === "priority-2"),
    "DTStack 用例节点保留优先级 marker",
  );

  unlinkSync(dtOutput);
});

await runTest("多输入 DTStack JSON 会在同一 root 下生成多个 L1 节点", async () => {
  writeFileSync(tmpInput, JSON.stringify(dtstackJson), "utf8");
  writeFileSync(tmpInputSecond, JSON.stringify(dtstackJsonSecond), "utf8");
  const dtOutput = resolve(__dirname, "数据资产v6.4.10.xmind");
  if (existsSync(dtOutput)) unlinkSync(dtOutput);

  const result = runScript(`${tmpInput} ${tmpInputSecond} ${dtOutput}`);
  assert(result.code === 0, "多输入 DTStack XMind 生成成功");
  assert(existsSync(dtOutput), "多输入 DTStack XMind 文件已生成");
  if (!existsSync(dtOutput)) {
    return;
  }

  const content = await readXmindContent(dtOutput);
  const root = content[0]?.rootTopic;
  const l1Nodes = root?.children?.attached ?? [];
  const l1Titles = l1Nodes.map((node) => node.title);

  assert(root?.title === "数据资产v6.4.10迭代用例", "多输入 DTStack root title 保持不变");
  assert(l1Nodes.length === 2, "多输入 DTStack 输出包含 2 个 L1 节点");
  assert(
    l1Titles.includes("【内置规则丰富】质量校验不通过时支持发送邮件(#10307)") &&
      l1Titles.includes("【内置规则丰富】一致性，多表数据一致性比对(#15525)"),
    "多输入 DTStack 输出保留每个 requirement 的独立 L1 title",
  );

  unlinkSync(dtOutput);
});

await runTest("append 模式允许更新历史遗留文件名", () => {
  writeFileSync(tmpInput, JSON.stringify(validJson), "utf8");
  const createResult = runScript(`${tmpInput} ${tmpOutput}`);
  assert(createResult.code === 0, "先生成规范命名 XMind");
  renameSync(tmpOutput, legacyAppendOutput);

  const appendResult = runScript(`--append ${tmpInput} ${legacyAppendOutput}`);
  assert(appendResult.code === 0, "append 模式可更新历史遗留文件名");
  assert(pathExists(legacyAppendOutput), "历史遗留文件名的 XMind 仍存在");
  assertLatestOutputPointsTo(legacyAppendOutput, "append 历史遗留文件名");
});

await runTest("缺少 meta 的 JSON 应失败", () => {
  writeFileSync(tmpInput, JSON.stringify(invalidJsonNoMeta), "utf8");
  const r2 = runScript(`${tmpInput} ${tmpOutput}`);
  assert(r2.code !== 0, "退出码非 0");
  assert(r2.stderr.includes("meta") || r2.stdout.includes("meta"), "错误消息提及 meta");
});

await runTest("modules 为空应失败", () => {
  writeFileSync(tmpInput, JSON.stringify(invalidJsonEmptyModules), "utf8");
  const r3 = runScript(`${tmpInput} ${tmpOutput}`);
  assert(r3.code !== 0, "退出码非 0");
  assert(r3.stderr.includes("modules") || r3.stdout.includes("modules"), "错误消息提及 modules");
});

await runTest("参数不足应报错", () => {
  const r4 = runScript("");
  assert(r4.code !== 0, "退出码非 0");
  assert(r4.stderr.includes("Usage"), "输出使用说明");
});

// ─── Cleanup & Summary ──────────────────────────────────────

cleanup();
restorePath(latestOutputLink, preservedLatestOutput);
restorePath(legacyRootLink, preservedLegacyRootLink);

if (testFilter && testsRun === 0) {
  console.error(`\n❌ 未找到匹配测试: ${testFilter}`);
  failed++;
}

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
