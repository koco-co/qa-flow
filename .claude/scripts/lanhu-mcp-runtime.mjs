/**
 * lanhu-mcp-runtime.mjs
 * 统一管理 qa-flow 内置 vendor/lanhu-mcp 的路径、探活与启动
 *
 * 用法:
 *   node lanhu-mcp-runtime.mjs paths
 *   node lanhu-mcp-runtime.mjs status
 *   node lanhu-mcp-runtime.mjs start
 */
import { existsSync, mkdirSync, openSync } from "fs";
import { dirname, resolve } from "path";
import { spawn } from "child_process";
import { getIntegrationConfig, resolveWorkspacePath } from "./load-config.mjs";

export function getLanhuRuntimeConfig() {
  const config = getIntegrationConfig("lanhuMcp");
  if (!config) {
    throw new Error("未在 .claude/config.json 中找到 integrations.lanhuMcp 配置");
  }

  return {
    vendorPath: resolveWorkspacePath(config.vendorPath),
    envFile: resolveWorkspacePath(config.envFile),
    setupScript: resolveWorkspacePath(config.setupScript),
    quickstartScript: resolveWorkspacePath(config.quickstartScript),
    entryScript: resolveWorkspacePath(config.entryScript),
    serverHost: config.serverHost,
    serverPort: config.serverPort,
    serverUrl: config.serverUrl,
    mcpPath: config.mcpPath,
    logFile: resolveWorkspacePath(config.logFile),
    cookieRefreshScript: resolveWorkspacePath(config.cookieRefreshScript),
  };
}

export function getLanhuMcpUrl() {
  const config = getLanhuRuntimeConfig();
  return `${config.serverUrl.replace(/\/$/, "")}${config.mcpPath}`;
}

export function getLanhuPythonCommand() {
  const { vendorPath } = getLanhuRuntimeConfig();
  const venvPython = resolve(vendorPath, ".venv", "bin", "python");
  return existsSync(venvPython) ? venvPython : "python3";
}

export async function getLanhuStatus() {
  const { serverUrl } = getLanhuRuntimeConfig();
  try {
    const response = await fetch(serverUrl, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return {
      reachable: true,
      statusCode: response.status,
      serverUrl,
    };
  } catch {
    return {
      reachable: false,
      statusCode: null,
      serverUrl,
    };
  }
}

export async function startLanhuMcp() {
  const config = getLanhuRuntimeConfig();
  const status = await getLanhuStatus();
  if (status.reachable) {
    return {
      started: false,
      alreadyRunning: true,
      ...status,
      logFile: config.logFile,
    };
  }

  if (!existsSync(config.vendorPath)) {
    throw new Error(`未找到 vendor 目录：${config.vendorPath}`);
  }
  if (!existsSync(config.entryScript)) {
    throw new Error(`未找到启动入口：${config.entryScript}`);
  }
  if (!existsSync(config.envFile)) {
    throw new Error(`未找到 .env 配置：${config.envFile}`);
  }

  mkdirSync(dirname(config.logFile), { recursive: true });
  const logFd = openSync(config.logFile, "a");
  const child = spawn(getLanhuPythonCommand(), [config.entryScript], {
    cwd: config.vendorPath,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();

  return {
    started: true,
    alreadyRunning: false,
    pid: child.pid,
    logFile: config.logFile,
    serverUrl: config.serverUrl,
    mcpUrl: getLanhuMcpUrl(),
  };
}

async function main() {
  const command = process.argv[2] || "paths";
  if (command === "paths") {
    console.log(JSON.stringify({
      ...getLanhuRuntimeConfig(),
      mcpUrl: getLanhuMcpUrl(),
      pythonCommand: getLanhuPythonCommand(),
    }, null, 2));
    return;
  }

  if (command === "status") {
    console.log(JSON.stringify(await getLanhuStatus(), null, 2));
    return;
  }

  if (command === "start") {
    console.log(JSON.stringify(await startLanhuMcp(), null, 2));
    return;
  }

  console.error("Usage: node lanhu-mcp-runtime.mjs [paths|status|start]");
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
