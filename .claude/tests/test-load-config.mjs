/**
 * test-load-config.mjs
 * 基础测试：验证 load-config.mjs 从 config.json 正确读取配置
 *
 * 运行: node test-load-config.mjs
 *
 * NOTE: This is the legacy test file. New tests use node:test framework at
 * .claude/shared/scripts/load-config.test.mjs
 */
import {
  loadConfig,
  getModuleMap,
  getModuleKeys,
  getWorkspaceRoot,
  getBranchMappingPath,
  getRepoBranchMappingPath,
  resolveTimePeriodPath,
  getCurrentPeriod,
} from "../shared/scripts/load-config.mjs";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

console.log("\n=== Test: loadConfig ===");
const config = loadConfig();
assert(typeof config === "object", "返回对象");
assert(config.modules !== undefined, "包含 modules 字段");
assert(config.repos !== undefined, "包含 repos 字段");
assert(config.project?.name === "qa-flow", "project.name 标记为 qa-flow");
assert(config.integrations?.lanhuMcp?.runtimePath === "tools/lanhu-mcp/", "lanhuMcp runtimePath 配置正确");
// envFile 已迁移到根 .env，config.json 不再保留 envFile 字段
assert(config.integrations?.lanhuMcp?.envFile === undefined, "lanhuMcp envFile 已迁移到根 .env，config.json 不再保留");
// ── reports / assets 路径断言（防止配置误改） ──
assert(config.casesRoot === "cases/", "casesRoot 应为 cases/");
assert(config.reports?.bugs === "reports/bugs/", "reports.bugs 应为 reports/bugs/");
assert(config.reports?.conflicts === "reports/conflicts/", "reports.conflicts 应为 reports/conflicts/");
assert(config.assets?.images === "assets/images/", "assets.images 应为 assets/images/");
// shortcuts 已移除，改为在通知消息中携带文件绝对路径
assert(config.shortcuts === undefined, "shortcuts 已移除（快捷链接机制已废弃）");
assert(config.repoBranchMapping === undefined, "config 不应有 repoBranchMapping 字段（已迁移为 branchMapping）");
assert(config.dataAssetsVersionMap === undefined, "config 不应有 dataAssetsVersionMap 字段");
assert(Object.prototype.hasOwnProperty.call(config, "branchMapping"), "config 应有 branchMapping 字段");

console.log("\n=== Test: getModuleMap ===");
const map = getModuleMap();
assert(typeof map === "object", "getModuleMap() 返回对象");
// With empty modules, map should be empty
assert(Object.keys(map).length === 0, "空 modules 时 getModuleMap() 返回空对象");

console.log("\n=== Test: getModuleKeys ===");
const keys = getModuleKeys();
assert(Array.isArray(keys), "getModuleKeys() 返回数组");
// With empty modules config, should return empty array
assert(keys.length === 0, "空 modules 时 getModuleKeys() 返回空数组");

console.log("\n=== Test: getWorkspaceRoot ===");
const root = getWorkspaceRoot();
assert(existsSync(root), "工作空间根目录存在");
assert(existsSync(resolve(root, "CLAUDE.md")), "工作空间根目录包含 CLAUDE.md");
assert(existsSync(resolve(root, ".claude/config.json")), "工作空间根目录包含 .claude/config.json");
assert(existsSync(resolve(root, ".claude/shared/scripts")), ".claude/shared/scripts 目录存在");
assert(existsSync(resolve(root, ".claude/tests")), ".claude/tests 目录存在");

console.log("\n=== Test: getBranchMappingPath ===");
const mappingPath = getBranchMappingPath();
// With branchMapping: null in config, should return null
assert(mappingPath === null, "branchMapping 为 null 时 getBranchMappingPath() 返回 null");

console.log("\n=== Test: getRepoBranchMappingPath (deprecated alias) ===");
const deprecatedPath = getRepoBranchMappingPath();
assert(deprecatedPath === null, "getRepoBranchMappingPath() 作为 getBranchMappingPath() 的 alias 正常工作");

console.log("\n=== Test: casesTypes 新目录结构 ===");
const casesTypes = config.casesTypes;
assert(Array.isArray(casesTypes), "config.casesTypes 已添加");
assert(casesTypes.includes("prds"), "casesTypes 包含 prds");
assert(casesTypes.includes("archive"), "casesTypes 包含 archive");
assert(casesTypes.includes("xmind"), "casesTypes 包含 xmind");
assert(casesTypes.includes("issues"), "casesTypes 包含 issues");
assert(casesTypes.includes("history"), "casesTypes 包含 history");

console.log("\n=== Test: resolveTimePeriodPath ===");
const archivePath = resolveTimePeriodPath("archive", "202604");
assert(archivePath === "cases/archive/202604/", `resolveTimePeriodPath('archive','202604') = ${archivePath}`);
const prdsPath = resolveTimePeriodPath("prds", 202603);
assert(prdsPath === "cases/prds/202603/", `resolveTimePeriodPath('prds', 202603) = ${prdsPath}`);
const issuesPath = resolveTimePeriodPath("issues", "202604");
assert(issuesPath === "cases/issues/202604/", `resolveTimePeriodPath('issues','202604') = ${issuesPath}`);

console.log("\n=== Test: getCurrentPeriod ===");
const period = getCurrentPeriod();
assert(typeof period === "string", "getCurrentPeriod() 返回字符串");
assert(/^\d{6}$/.test(period), `getCurrentPeriod() 格式正确: ${period}`);

console.log("\n=== Test: Schema — no DTStack-specific fields ===");
const loadConfigSource = readFileSync(resolve(root, ".claude/shared/scripts/load-config.mjs"), "utf8");
assert(!loadConfigSource.includes("export function getDtstackModules"), "getDtstackModules 已从 load-config.mjs 移除");
assert(loadConfigSource.includes("export function getModuleKeys"), "getModuleKeys 已导出");
assert(loadConfigSource.includes("export function getBranchMappingPath"), "getBranchMappingPath 已导出");
assert(loadConfigSource.includes("export function loadConfigFromPath"), "loadConfigFromPath 已导出");
assert(loadConfigSource.includes("export function resetConfigCache"), "resetConfigCache 已导出");
assert(loadConfigSource.includes("config.branchMapping"), "getBranchMappingPath 消费 config.branchMapping 字段");

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
