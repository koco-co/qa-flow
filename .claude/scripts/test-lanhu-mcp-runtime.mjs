/**
 * test-lanhu-mcp-runtime.mjs
 * 验证 lanhu-mcp 运行时包装脚本的路径、URL 和启动配置
 *
 * 运行: node test-lanhu-mcp-runtime.mjs
 */
import {
  getLanhuRuntimeConfig,
  getLanhuMcpUrl,
  getLanhuPythonCommand,
} from "./lanhu-mcp-runtime.mjs";
import { existsSync } from "fs";

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

console.log("\n=== Test: getLanhuRuntimeConfig ===");
const config = getLanhuRuntimeConfig();
assert(config.vendorPath.endsWith("vendor/lanhu-mcp"), "vendorPath 指向 vendor/lanhu-mcp");
assert(existsSync(config.vendorPath), "vendorPath 在仓库中存在");
assert(config.envFile.endsWith("vendor/lanhu-mcp/.env"), "envFile 指向 vendor/lanhu-mcp/.env");
assert(config.entryScript.endsWith("vendor/lanhu-mcp/lanhu_mcp_server.py"), "entryScript 指向 lanhu_mcp_server.py");
assert(config.logFile.endsWith(".claude/tmp/lanhu-mcp.log"), "logFile 指向 .claude/tmp/lanhu-mcp.log");
assert(config.serverUrl === "http://127.0.0.1:8000", "serverUrl 与 config.json 一致");
assert(config.cookieRefreshScript.endsWith(".claude/scripts/refresh-lanhu-cookie.py"), "cookieRefreshScript 指向 refresh-lanhu-cookie.py");
assert(existsSync(config.cookieRefreshScript), "cookieRefreshScript 文件已存在");

console.log("\n=== Test: getLanhuMcpUrl ===");
assert(getLanhuMcpUrl() === "http://127.0.0.1:8000/mcp", "MCP URL 由 serverUrl + /mcp 组成");

console.log("\n=== Test: getLanhuPythonCommand ===");
const pythonCommand = getLanhuPythonCommand();
assert(
  pythonCommand === "python3" || pythonCommand.endsWith("/.venv/bin/python"),
  "Python 命令优先使用 vendor/.venv/bin/python，否则回退到 python3",
);

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
