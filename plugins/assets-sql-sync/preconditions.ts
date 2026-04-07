/**
 * plugins/dtstack-preconditions/preconditions.ts
 *
 * DTStack 平台前置条件 TS 桥接层
 *
 * 从 Playwright page 上下文提取 cookie，通过 `uv run python -m dtstack_pre.cli`
 * 调用 tools/dtstack-preconditions Python CLI，完成：
 *   1. 离线建表   — 通过 Batch DDL API
 *   2. 引入数据源 — 将数据源中心的数据源引入到数据资产
 *   3. 元数据同步 — 创建同步任务并轮询等待完成
 *
 * ─── 用法 ──────────────────────────────────────────────────────────────────
 *
 * ```typescript
 * import { setupOfflineTablesToAssets } from '../../plugins/dtstack-preconditions/preconditions';
 *
 * test.beforeAll(async ({ browser }) => {
 *   const page = await browser.newPage();
 *   await applyRuntimeCookies(page, 'batch');
 *   await page.goto(`${normalizeBaseUrl('batch')}/batch/`, { waitUntil: 'domcontentloaded' });
 *
 *   await setupOfflineTablesToAssets(page, {
 *     sqls: [SQL_BASE_TABLES, SQL_QUALITY_TABLES],
 *     batch:  { batchProject: 'env_rebuild_test', datasourceType: 'Doris' },
 *     import: { datasourceName: 'ci78_doris_auto' },
 *     sync:   { datasourceName: 'ci78_doris_auto', timeoutSeconds: 180 },
 *   });
 *   await page.close();
 * });
 * ```
 *
 * ─── 架构 ──────────────────────────────────────────────────────────────────
 *
 *   test spec                    (传 page + 业务参数)
 *      ↓
 *   preconditions.ts (本文件)    (提取 cookie，调用 Python CLI)
 *      ↓  execSync
 *   tools/dtstack-preconditions  (Python CLI，纯 HTTP，不依赖浏览器)
 *      ↓  HTTP API
 *   DTStack 平台
 */

import { execSync, type StdioOptions } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ─── 工具目录（相对于本文件）────────────────────────────────────
const TOOL_DIR = resolve(__dirname, "../../tools/dtstack-preconditions");

// ─── Types ──────────────────────────────────────────────────────

export interface BatchTableConfig {
  /** 离线开发项目名称，默认 "env_rebuild_test" */
  batchProject?: string;
  /** 数据源类型（大小写不敏感），默认 "Doris" */
  datasourceType?: string;
  /** 目标 schema（数据库名），默认取数据源自身的 schema */
  schema?: string;
}

export interface DatasourceImportConfig {
  /** 数据资产中要引入的数据源名称（必填） */
  datasourceName: string;
  /** 是否跳过"已引入"检查强制重新引入，默认 false */
  forceImport?: boolean;
}

export interface MetadataSyncConfig {
  /** 数据资产中已引入的数据源名称（必填） */
  datasourceName: string;
  /** 要同步的 database 名称；不传则同步第一个 */
  database?: string;
  /** 轮询超时（秒），默认 180 */
  timeoutSeconds?: number;
}

export interface SetupOptions {
  /**
   * DDL SQL 列表，每条可包含多个语句（用分号分隔）。
   * 按顺序依次执行；为空则跳过建表。
   */
  sqls?: string[];
  batch?: BatchTableConfig;
  import?: DatasourceImportConfig;
  sync?: MetadataSyncConfig;
  /**
   * 控制各步骤是否执行，默认全开。
   * 例：只建表可传 { importDatasource: false, syncMetadata: false }
   */
  steps?: {
    createTables?: boolean;
    importDatasource?: boolean;
    syncMetadata?: boolean;
  };
}

interface CliResult {
  success: boolean;
  steps: Record<string, string>;
  error?: string;
  step?: string;
}

// ─── 内部工具 ────────────────────────────────────────────────────

function getBaseUrl(): string {
  return (
    process.env.UI_AUTOTEST_BASE_URL ??
    process.env.E2E_BASE_URL ??
    "http://172.16.122.52"
  );
}

async function extractCookies(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

// ─── 主入口 ──────────────────────────────────────────────────────

/**
 * 一键完成前置条件：离线建表 + 数据资产引入数据源 + 元数据同步
 *
 * 进度日志由 Python CLI 输出到 stderr（测试运行时实时可见），
 * 最终 JSON 结果输出到 stdout（TS 层解析并在失败时抛出错误）。
 *
 * @param page  已完成 cookie 注入并加载过页面的 Playwright Page
 * @param opts  配置选项
 */
export async function setupOfflineTablesToAssets(
  page: Page,
  opts: SetupOptions = {},
): Promise<void> {
  const baseUrl = getBaseUrl();
  const cookie = await extractCookies(page);

  // JSON config to Python CLI (import → import_ field name mapping handled by Python)
  const config = JSON.stringify({ ...opts, baseUrl });

  // Python CLI 调用：uv run python -m dtstack_pre.cli setup
  // cookie 通过环境变量传入，避免 shell 引号转义问题
  const cmd = `uv run python -m dtstack_pre.cli setup --base-url "${baseUrl}"`;

  let stdout: string;
  try {
    stdout = execSync(cmd, {
      cwd: TOOL_DIR,
      input: config,
      encoding: "utf8",
      timeout: 600_000, // 10 分钟上限
      env: {
        ...process.env,
        DTSTACK_COOKIE: cookie,
      },
      // stderr inherit: Python 进度日志实时输出到测试终端
      stdio: ["pipe", "pipe", "inherit"] as StdioOptions,
    });
  } catch (err) {
    const e = err as { message?: string; stdout?: string; status?: number };
    // execSync 在非零退出时抛错，stdout 中包含 Python CLI 的 JSON 结果
    const rawOut = e.stdout ?? "";
    if (rawOut) {
      try {
        const result: CliResult = JSON.parse(rawOut.trim());
        throw new Error(
          `[preconditions] 前置条件失败 step=${result.step ?? "unknown"}: ${result.error}`,
        );
      } catch (parseErr) {
        if ((parseErr as Error).message.startsWith("[preconditions]")) throw parseErr;
      }
    }
    throw new Error(`[preconditions] Python CLI 执行失败: ${e.message ?? String(err)}`);
  }

  const result: CliResult = JSON.parse(stdout.trim());
  if (!result.success) {
    throw new Error(
      `[preconditions] 前置条件失败 step=${result.step ?? "unknown"}: ${result.error}`,
    );
  }

  console.log("[preconditions] 🎉 所有前置条件设置完成", result.steps);
}
