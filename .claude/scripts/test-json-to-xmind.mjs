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
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

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

function runScript(args) {
  try {
    const result = execSync(`node ${resolve(__dirname, "json-to-xmind.mjs")} ${args}`, {
      cwd: __dirname,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout: result, stderr: "", code: 0 };
  } catch (err) {
    return { stdout: err.stdout || "", stderr: err.stderr || "", code: err.status };
  }
}

function runTest(name, fn) {
  if (testFilter && !name.includes(testFilter)) return;
  testsRun++;
  console.log(`\n=== Test: ${name} ===`);
  cleanup();
  fn();
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

const repoRoot = resolve(__dirname, "..", "..");
const tmpInput = resolve(__dirname, "_test_input.json");
const tmpOutput = resolve(__dirname, "_test_output.xmind");
const tmpOutputAlt = resolve(__dirname, "_test_output_alt.xmind");
const explicitLatestOutput = resolve(__dirname, "latest-output.xmind");
const latestOutputLink = resolve(repoRoot, "latest-output.xmind");
const latestOutputBackup = resolve(__dirname, `_latest-output-backup-${process.pid}.xmind`);
const explicitLatestOutputBackup = resolve(
  __dirname,
  `_explicit-latest-output-backup-${process.pid}.xmind`,
);
let latestOutputBackedUp = false;
let explicitLatestOutputBackedUp = false;

preserveLatestOutput();
preserveExplicitLatestOutput();
process.on("exit", () => {
  cleanup();
  restoreLatestOutput();
  restoreExplicitLatestOutput();
});

function pathExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function cleanup() {
  if (existsSync(tmpInput)) unlinkSync(tmpInput);
  if (existsSync(tmpOutput)) unlinkSync(tmpOutput);
  if (existsSync(tmpOutputAlt)) unlinkSync(tmpOutputAlt);
  if (existsSync(explicitLatestOutput)) unlinkSync(explicitLatestOutput);
}

function preserveLatestOutput() {
  if (pathExists(latestOutputLink)) {
    renameSync(latestOutputLink, latestOutputBackup);
    latestOutputBackedUp = true;
  }
}

function preserveExplicitLatestOutput() {
  if (pathExists(explicitLatestOutput)) {
    renameSync(explicitLatestOutput, explicitLatestOutputBackup);
    explicitLatestOutputBackedUp = true;
  }
}

function restoreLatestOutput() {
  if (pathExists(latestOutputLink)) unlinkSync(latestOutputLink);
  if (latestOutputBackedUp && pathExists(latestOutputBackup)) {
    renameSync(latestOutputBackup, latestOutputLink);
    latestOutputBackedUp = false;
  } else if (pathExists(latestOutputBackup)) {
    unlinkSync(latestOutputBackup);
  }
}

function restoreExplicitLatestOutput() {
  if (pathExists(explicitLatestOutput)) unlinkSync(explicitLatestOutput);
  if (explicitLatestOutputBackedUp && pathExists(explicitLatestOutputBackup)) {
    renameSync(explicitLatestOutputBackup, explicitLatestOutput);
    explicitLatestOutputBackedUp = false;
  } else if (pathExists(explicitLatestOutputBackup)) {
    unlinkSync(explicitLatestOutputBackup);
  }
}

function assertLatestOutputPointsTo(expectedOutputPath, label) {
  assert(pathExists(latestOutputLink), `${label}: 创建了仓库根目录 latest-output.xmind`);
  if (!pathExists(latestOutputLink)) return;

  const linkStat = lstatSync(latestOutputLink);
  assert(linkStat.isSymbolicLink(), `${label}: latest-output.xmind 是符号链接`);
  if (!linkStat.isSymbolicLink()) return;

  const linkedPath = resolve(repoRoot, readlinkSync(latestOutputLink));
  assert(linkedPath === expectedOutputPath, `${label}: latest-output.xmind 指向实际输出文件`);
}

// ─── Tests ──────────────────────────────────────────────────

runTest("显式输出 latest-output.xmind 应被拒绝", () => {
  writeFileSync(tmpInput, JSON.stringify(validJson), "utf8");
  const result = runScript(`${tmpInput} latest-output.xmind`);
  assert(result.code !== 0, "退出码非 0");
  assert(
    result.stderr.includes("latest-output.xmind") &&
      result.stderr.includes("保留输出文件名"),
    "错误消息清楚说明 latest-output.xmind 为保留输出文件名",
  );
  assert(!pathExists(explicitLatestOutput), "未创建显式 latest-output.xmind 输出文件");
  assert(!pathExists(latestOutputLink), "未刷新仓库根目录 latest-output.xmind 符号链接");
});

runTest("有效 JSON 生成 XMind", () => {
  writeFileSync(tmpInput, JSON.stringify(validJson), "utf8");
  const r1 = runScript(`${tmpInput} ${tmpOutput}`);
  assert(r1.code === 0, "退出码为 0");
  assert(existsSync(tmpOutput), "生成了 .xmind 文件");
  assert(r1.stdout.includes("XMind 文件已生成"), "输出包含成功消息");
});

runTest("latest-output.xmind 随成功输出刷新", () => {
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

runTest("缺少 meta 的 JSON 应失败", () => {
  writeFileSync(tmpInput, JSON.stringify(invalidJsonNoMeta), "utf8");
  const r2 = runScript(`${tmpInput} ${tmpOutput}`);
  assert(r2.code !== 0, "退出码非 0");
  assert(r2.stderr.includes("meta") || r2.stdout.includes("meta"), "错误消息提及 meta");
});

runTest("modules 为空应失败", () => {
  writeFileSync(tmpInput, JSON.stringify(invalidJsonEmptyModules), "utf8");
  const r3 = runScript(`${tmpInput} ${tmpOutput}`);
  assert(r3.code !== 0, "退出码非 0");
  assert(r3.stderr.includes("modules") || r3.stdout.includes("modules"), "错误消息提及 modules");
});

runTest("参数不足应报错", () => {
  const r4 = runScript("");
  assert(r4.code !== 0, "退出码非 0");
  assert(r4.stderr.includes("Usage"), "输出使用说明");
});

// ─── Cleanup & Summary ──────────────────────────────────────

cleanup();

if (testFilter && testsRun === 0) {
  console.error(`\n❌ 未找到匹配测试: ${testFilter}`);
  failed++;
}

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
