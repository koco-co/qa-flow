/**
 * test-load-config.mjs
 * 基础测试：验证 load-config.mjs 从 config.json 正确读取配置
 *
 * 运行: node test-load-config.mjs
 */
import {
  loadConfig,
  getModuleMap,
  getDtstackModules,
  getWorkspaceRoot,
  getRepoBranchMappingPath,
} from "../shared/scripts/load-config.mjs";
import { existsSync } from "fs";
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
assert(config.modules.xyzh?.zh === "信永中和", "xyzh 模块中文名正确");
assert(config.project?.name === "qa-flow", "project.name 标记为 qa-flow");
assert(config.repos?.["dt-center-assets"] === ".repos/dt-insight-web/dt-center-assets/", "repos 路径已切换到 .repos");
assert(config.integrations?.lanhuMcp?.runtimePath === "tools/lanhu-mcp/", "lanhuMcp runtimePath 配置正确");
assert(config.integrations?.lanhuMcp?.envFile === "tools/lanhu-mcp/.env", "lanhuMcp envFile 配置正确");
assert(config.shortcuts?.latestEnhancedPrd === "latest-prd-enhanced.md", "latestEnhancedPrd 快捷链接名正确");
assert(config.shortcuts?.latestBugReport === "latest-bug-report.html", "latestBugReport 快捷链接名正确");
assert(config.shortcuts?.latestConflictReport === "latest-conflict-report.html", "latestConflictReport 快捷链接名正确");

console.log("\n=== Test: getModuleMap ===");
const map = getModuleMap();
assert(map["离线开发"] === "batch-works", "中文→英文映射正确");
assert(map["batch-works"] === "batch-works", "英文→英文映射正确");
assert(map["信永中和"] === "custom/xyzh", "信永中和映射为 custom/xyzh（从 xmind 路径推导）");
assert(map["数据资产"] === "data-assets", "数据资产映射正确");
assert(map["xyzh"] === "custom/xyzh", "xyzh key 也映射为 custom/xyzh");
assert(map["custom/xyzh"] === "custom/xyzh", "custom/xyzh 自映射正确");

console.log("\n=== Test: getDtstackModules ===");
const { zh, en } = getDtstackModules();
assert(zh.includes("离线开发"), "中文列表含离线开发");
assert(en.includes("batch-works"), "英文列表含 batch-works");
assert(!zh.includes("信永中和"), "中文列表不含信永中和 (custom 类型)");
assert(!en.includes("xyzh"), "英文列表不含 xyzh (custom 类型)");
assert(zh.length === en.length, "中英文列表长度一致");

console.log("\n=== Test: getWorkspaceRoot ===");
const root = getWorkspaceRoot();
const scriptDir = dirname(fileURLToPath(import.meta.url));
assert(existsSync(root), "工作空间根目录存在");
assert(existsSync(resolve(root, "CLAUDE.md")), "工作空间根目录包含 CLAUDE.md");
assert(existsSync(resolve(root, ".claude/config.json")), "工作空间根目录包含 .claude/config.json");
assert(resolve(root, ".claude/tests") === scriptDir, "工作空间根目录与 .claude/tests 相对位置正确");

console.log("\n=== Test: getRepoBranchMappingPath ===");
const mappingPath = getRepoBranchMappingPath();
assert(mappingPath === resolve(root, "config/repo-branch-mapping.yaml"), "repo-branch-mapping.yaml 路径固定在 config/ 目录");
assert(existsSync(mappingPath), "repo-branch-mapping.yaml 文件存在");

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
