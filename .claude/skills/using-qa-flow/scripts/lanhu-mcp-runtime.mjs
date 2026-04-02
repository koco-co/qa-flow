/**
 * lanhu-mcp-runtime.mjs
 * 统一管理 qa-flow 内置 tools/lanhu-mcp 的路径、探活与启动
 *
 * 用法:
 *   node lanhu-mcp-runtime.mjs paths
 *   node lanhu-mcp-runtime.mjs status
 *   node lanhu-mcp-runtime.mjs start
 *
 * LANHU_COOKIE 读取顺序：process.env → 根目录 .env → tools/lanhu-mcp/.env
 */
import { existsSync, mkdirSync, openSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { spawn } from "child_process";
import { getIntegrationConfig, resolveWorkspacePath, getWorkspaceRoot } from "../../../shared/scripts/load-config.mjs";

/** 从 .env 文件中解析 LANHU_COOKIE（不覆盖已设置的 process.env） */
function loadLanhuCookieFromEnv() {
  if (process.env.LANHU_COOKIE) return process.env.LANHU_COOKIE;

  const tryFiles = [
    resolve(getWorkspaceRoot(), ".env"),
    resolve(getWorkspaceRoot(), "tools/lanhu-mcp/.env"),
  ];
  for (const f of tryFiles) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^LANHU_COOKIE\s*=\s*(.+)$/);
      if (m) return m[1].replace(/^["']|["']$/g, "").trim();
    }
  }
  return null;
}

export function getLanhuRuntimeConfig() {
  const config = getIntegrationConfig("lanhuMcp");
  if (!config) {
    throw new Error("未在 .claude/config.json 中找到 integrations.lanhuMcp 配置");
  }

  return {
    runtimePath: resolveWorkspacePath(config.runtimePath),
    // envFile 已迁移到根目录 .env，此处不再解析
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
  const { runtimePath } = getLanhuRuntimeConfig();
  const venvPython = resolve(runtimePath, ".venv", "bin", "python");
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

  if (!existsSync(config.runtimePath)) {
    throw new Error(`未找到 lanhu-mcp 目录：${config.runtimePath}`);
  }
  if (!existsSync(config.entryScript)) {
    throw new Error(`未找到启动入口：${config.entryScript}`);
  }
  // 从根 .env 或本地 .env 读取 LANHU_COOKIE 并注入到子进程
  const lanhuCookie = loadLanhuCookieFromEnv();
  if (!lanhuCookie) {
    throw new Error("未找到 LANHU_COOKIE。请在根目录 .env 中配置 LANHU_COOKIE=你的蓝湖Cookie");
  }

  mkdirSync(dirname(config.logFile), { recursive: true });
  const logFd = openSync(config.logFile, "a");
  const child = spawn(getLanhuPythonCommand(), [config.entryScript], {
    cwd: config.runtimePath,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: { ...process.env, LANHU_COOKIE: lanhuCookie },
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
