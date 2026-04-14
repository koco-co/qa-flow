/**
 * E2E 测试共享 helper
 * 提供环境配置读取、Cookie 注入、URL 构建、菜单导航等通用能力
 */
import type { Page } from "@playwright/test";

type RuntimeEnv = Record<string, string | undefined>;
type ProjectListResponse = { data?: Array<{ id?: number | string }> };

// ── 环境变量 ────────────────────────────────────────────

export function getEnv(name: string): string | undefined {
  return (globalThis as typeof globalThis & { process?: { env?: RuntimeEnv } })
    .process?.env?.[name];
}

function getRawBaseUrl(): string {
  return (
    getEnv("UI_AUTOTEST_BASE_URL") ??
    getEnv("E2E_BASE_URL") ??
    "http://172.16.122.52"
  );
}

// ── URL 构建 ────────────────────────────────────────────

export function normalizeBaseUrl(product: string): string {
  const rawBaseUrl = getRawBaseUrl();
  const parsed = new URL(rawBaseUrl);
  const cleanPath = parsed.pathname.replace(/\/$/, "");
  const productIndex = cleanPath.indexOf(`/${product}`);
  const productPath =
    productIndex >= 0
      ? cleanPath.slice(0, productIndex + `/${product}`.length)
      : `${cleanPath}/${product}`.replace(/\/{2,}/g, "/");
  return `${parsed.origin}${productPath || `/${product}`}`;
}

export function normalizeDataAssetsBaseUrl(): string {
  return normalizeBaseUrl("dataAssets");
}

export function normalizeOfflineBaseUrl(): string {
  return normalizeBaseUrl("batch");
}

export function buildDataAssetsUrl(
  path: string,
  pid?: number | string,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const separator = normalizedPath.includes("?") ? "&" : "?";
  const hashPath = pid
    ? `${normalizedPath}${separator}pid=${pid}`
    : normalizedPath;
  return `${normalizeDataAssetsBaseUrl()}/#${hashPath}`;
}

export function buildOfflineUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeOfflineBaseUrl()}/#${normalizedPath}`;
}

// ── Cookie 注入 ─────────────────────────────────────────

export async function applyRuntimeCookies(
  page: Page,
  product = "dataAssets",
): Promise<void> {
  const runtimeCookie = getEnv("UI_AUTOTEST_COOKIE")?.trim();
  if (!runtimeCookie) return;

  const cookieUrl = normalizeBaseUrl(product);
  const cookieMap = new Map<string, string>();
  for (const pair of runtimeCookie.split(/;\s*/)) {
    if (!pair) continue;
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) continue;
    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!name) continue;
    cookieMap.set(name, value);
  }

  const baseUrl = getRawBaseUrl();
  await page.context().addCookies(
    Array.from(cookieMap.entries()).map(([name, value]) => ({
      name,
      value,
      url: baseUrl,
    })),
  );

  if (cookieUrl !== baseUrl) {
    await page.context().addCookies(
      Array.from(cookieMap.entries()).map(([name, value]) => ({
        name,
        value,
        url: cookieUrl,
      })),
    );
  }
}

// ── 项目 ID 获取 ────────────────────────────────────────

export async function getAccessibleProjectIds(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    const response = await fetch("/dassets/v1/valid/project/getProjects", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      },
    });
    const result = (await response.json()) as ProjectListResponse;
    return (result.data ?? [])
      .map((item: { id?: number | string }) => Number(item?.id))
      .filter((id: number) => Number.isFinite(id));
  });
}

// ── 菜单导航 ────────────────────────────────────────────

/**
 * 通过侧边栏菜单导航到指定模块
 * @param menuPath 菜单路径数组，如 ['元数据', '数据地图']
 */
export async function navigateViaMenu(
  page: Page,
  menuPath: string[],
): Promise<void> {
  const sideMenu = page.locator(".ant-layout-sider").first();
  await sideMenu.waitFor({ state: "visible", timeout: 10000 });

  for (const menuName of menuPath) {
    const menuItem = sideMenu.getByText(menuName, { exact: false });
    const isVisible = await menuItem.isVisible().catch(() => false);
    if (!isVisible) {
      // 尝试展开父菜单
      const parentMenu = sideMenu
        .locator(".ant-menu-submenu-title")
        .filter({ hasText: menuName });
      if (await parentMenu.isVisible().catch(() => false)) {
        await parentMenu.click();
        await page.waitForTimeout(300);
      }
    }
    await menuItem.first().click();
    await page.waitForTimeout(500);
  }
  await page.waitForLoadState("networkidle");
}

// ── Ant Design 组件交互 ─────────────────────────────────

/**
 * Ant Design Select 下拉选择
 */
export async function selectAntOption(
  page: Page,
  triggerLocator: import("@playwright/test").Locator,
  optionText: string,
): Promise<void> {
  await triggerLocator.click();
  await page.waitForTimeout(300);
  const dropdown = page.locator(".ant-select-dropdown:visible");
  await dropdown.waitFor({ state: "visible", timeout: 5000 });
  await dropdown.getByText(optionText, { exact: false }).first().click();
  await page.waitForTimeout(300);
}

/**
 * 等待 Ant Design 全局提示消息
 */
export async function expectAntMessage(
  page: Page,
  text: string | RegExp,
  timeout = 5000,
): Promise<void> {
  const { expect } = await import("@playwright/test");
  const message = page.locator(".ant-message-notice, .ant-notification-notice");
  await expect(message.filter({ hasText: text }).first()).toBeVisible({
    timeout,
  });
}

/**
 * 等待 Ant Design Modal 可见并返回其 locator
 */
export async function waitForAntModal(
  page: Page,
  titleText?: string,
): Promise<import("@playwright/test").Locator> {
  const modal = page.locator(".ant-modal:visible");
  await modal.first().waitFor({ state: "visible", timeout: 10000 });
  if (titleText) {
    const { expect } = await import("@playwright/test");
    await expect(modal.filter({ hasText: titleText }).first()).toBeVisible();
  }
  return modal.first();
}

// ── 离线开发：项目导航 ──────────────────────────────────

/**
 * 在离线开发(batch)中按名称选择指定项目
 *
 * 流程:
 *   1. 进入 /batch/ 项目列表
 *   2. 在搜索框中搜索项目名称
 *   3. 点击匹配的项目卡片进入
 */
export async function selectBatchProject(
  page: Page,
  projectName: string,
): Promise<void> {
  await applyRuntimeCookies(page, "batch");

  await page.goto(buildOfflineUrl("/projects"));
  await page.waitForURL(/#\/projects$/, { timeout: 30000 });

  const projectTable = page.locator(".projects-table").first();
  await projectTable.waitFor({ state: "visible", timeout: 30000 });

  const targetRow = projectTable
    .locator(".ant-table-row")
    .filter({ hasText: projectName })
    .first();
  await targetRow.waitFor({ state: "visible", timeout: 30000 });

  const projectLink = targetRow.getByText(projectName, { exact: true }).first();
  await projectLink.click();

  await page.waitForURL(/#\/offline\/task/, { timeout: 30000 });
  await page
    .locator(".org-tree-select-wrap, .ant-select-selection-item")
    .filter({ hasText: projectName })
    .first()
    .waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(2000);
}

// ── 离线开发：执行 SQL 任务 ──────────────────────────────

/**
 * 通过离线开发「临时查询」执行 Doris SQL
 *
 * @param projectName 项目名称，默认 "env_rebuild_test"
 *
 * 流程:
 *   1. /batch/ → 搜索并选择指定项目
 *   2. 点击左侧"临时查询"垂直 tab
 *   3. 展开"临时查询"树节点 → 右键 → "新建临时查询"
 *   4. 弹窗中填写名称, 选择"Doris SQL"类型, 确认
 *   5. 编辑器中输入 SQL
 *   6. 点击"运行"
 *   7. 等待执行完成
 */
export async function executeSqlViaBatchDoris(
  page: Page,
  sqlContent: string,
  taskName?: string,
  projectName = "env_rebuild_test",
): Promise<{ resultText: string }> {
  const name = taskName ?? `auto_sql_${Date.now().toString(36)}`;

  // 1. 进入指定项目
  await selectBatchProject(page, projectName);

  // 2. 点击左侧"临时查询"垂直 tab
  const tempQueryTab = page
    .locator(".ant-tabs-tab")
    .filter({ hasText: "临时查询" })
    .first();
  await tempQueryTab.waitFor({ state: "visible", timeout: 10000 });
  await tempQueryTab.click();
  await page
    .locator(".ant-tabs-tab-active")
    .filter({ hasText: "临时查询" })
    .first()
    .waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(3000);

  // 3. 右键"临时查询"树节点
  const treeNode = page
    .locator(".folder-item.folderTreeNodeItem")
    .filter({ hasText: "临时查询" })
    .first();
  await treeNode.waitFor({ state: "visible", timeout: 10000 });
  await treeNode.click({ button: "right" });
  await page.waitForTimeout(500);

  // 4. 点击"新建临时查询"上下文菜单
  const newQueryMenu = page
    .locator(".ant-dropdown-menu-item, [role='menuitem']")
    .filter({ hasText: "新建临时查询" })
    .first();
  await newQueryMenu.waitFor({ state: "visible", timeout: 10000 });
  await newQueryMenu.click();
  await page.waitForTimeout(1500);

  // 5. 处理新建临时查询弹窗
  const modal = page.locator(".ant-modal:visible").first();
  await modal.waitFor({ state: "visible", timeout: 10000 });

  // 填写临时查询名称
  const nameInput = modal.locator("input").first();
  await nameInput.clear();
  await nameInput.fill(name);

  const typeSelect = modal
    .locator(".ant-form-item")
    .filter({ hasText: "临时查询类型" })
    .locator(".ant-select")
    .first();
  await typeSelect.locator(".ant-select-selector").click();
  await page.waitForTimeout(500);
  await page
    .locator(".ant-select-dropdown:visible .ant-select-item-option")
    .filter({ hasText: /Doris\s*SQL/i })
    .first()
    .click();
  await page.waitForTimeout(800);

  const clusterSelect = modal
    .locator(".ant-form-item")
    .filter({ hasText: "集群名称" })
    .locator(".ant-select")
    .first();
  if (await clusterSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await clusterSelect.locator(".ant-select-selector").click();
    await page.waitForTimeout(500);
    const clusterOption = page
      .locator(".ant-select-dropdown:visible .ant-select-item-option")
      .filter({ hasText: /doris/i })
      .first();
    if (await clusterOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clusterOption.click();
    } else {
      await page
        .locator(".ant-select-dropdown:visible .ant-select-item-option")
        .first()
        .click();
    }
    await page.waitForTimeout(500);
  }

  // 点击确认按钮，并确保真正进入编辑器
  const okBtn = modal.locator(".ant-btn-primary").first();
  await okBtn.click();
  await modal.waitFor({ state: "hidden", timeout: 15000 });
  await page.waitForTimeout(2000);

  // 7. 编辑器中输入 SQL
  const editorArea = page
    .locator(".view-lines, .monaco-editor .overflow-guard")
    .first();
  await editorArea.waitFor({ state: "visible", timeout: 20000 });
  await editorArea.click();
  await page.waitForTimeout(300);

  // Ctrl+A 全选 → Delete 清空 → 输入新 SQL
  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${modifier}+a`);
  await page.keyboard.press("Delete");
  await page.waitForTimeout(300);

  // 分块键盘输入 SQL (每块 100 字符以提高可靠性)
  const chunks = sqlContent.match(/.{1,100}/g) ?? [sqlContent];
  for (const chunk of chunks) {
    await page.keyboard.type(chunk, { delay: 0 });
  }
  await page.waitForTimeout(500);

  // 8. 点击运行按钮
  const runBtn = page
    .getByRole("button", { name: /运行/ })
    .or(page.locator("button").filter({ hasText: /运行/ }))
    .first();
  if (await runBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await runBtn.click();
  }
  await page.waitForTimeout(5000);

  // 9. 等待执行结果 (最多等 120 秒)
  await page.waitForLoadState("networkidle");

  let resultText = "";
  const resultArea = page.locator(".ide-console.batch-ide-console").first();
  if (await resultArea.isVisible({ timeout: 15000 }).catch(() => false)) {
    try {
      await page.waitForFunction(
        () => {
          const el = document.querySelector(".ide-console.batch-ide-console");
          return el && !/运行中|executing/i.test(el.textContent ?? "");
        },
        { timeout: 120000 },
      );
    } catch {
      // timeout acceptable for DDL
    }
    resultText = await resultArea.innerText().catch(() => "");
    if (/执行失败|运行失败|语法错误|exception|error/i.test(resultText)) {
      throw new Error(`SQL execution failed: ${resultText.slice(0, 500)}`);
    }
  }
  await page.waitForTimeout(2000);

  return { resultText };
}

// ── 元数据同步 ──────────────────────────────────────────

/**
 * 创建并执行元数据同步任务（周期同步 + 临时同步）
 *
 * 实际弹窗结构（来自 page snapshot）:
 *   - "* 数据源" 单选 combobox
 *   - 表格行: 数据库(combobox) | 数据表(combobox) | 数据表过滤 | 操作
 *   - 底部按钮: 取消 | 临时同步 | 下一步
 *
 * @param datasourceName 数据源名称（如含 Doris 的数据源）
 */
export async function syncMetadata(
  page: Page,
  datasourceName?: string,
  database?: string,
  tableName?: string,
): Promise<void> {
  const readSyncErrorText = async (): Promise<string> => {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    return bodyText.replace(/\s+/g, " ").trim();
  };

  // 导航到元数据同步
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/metaDataSync"));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // 点击新增周期同步任务
  const addBtn = page
    .getByRole("button", { name: /新增周期同步任务/ })
    .or(page.locator("button").filter({ hasText: /新增.*同步/ }))
    .first();
  await addBtn.click();
  await page.waitForTimeout(2000);

  // 等待弹窗出现
  const modal = page.locator(".ant-modal:visible, dialog:visible").first();
  await modal.waitFor({ state: "visible", timeout: 10000 });

  // 选择数据源（弹窗中的第一个 combobox: "* 数据源"）
  if (datasourceName) {
    const dsCombobox = modal.locator(".ant-select").first();
    if (await dsCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dsCombobox.locator(".ant-select-selector").click();
      await page.waitForTimeout(500);
      const dsOption = page
        .locator(".ant-select-dropdown:visible .ant-select-item-option")
        .filter({ hasText: new RegExp(datasourceName, "i") })
        .first();
      if (await dsOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dsOption.click();
        await page.waitForTimeout(1000);
      } else {
        // fallback: 选第一个选项
        const firstOption = page
          .locator(".ant-select-dropdown:visible .ant-select-item-option")
          .first();
        if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await firstOption.click();
          await page.waitForTimeout(1000);
        }
        await page.keyboard.press("Escape");
      }
    }
  }

  // 选择数据库（表格行中的第一个 combobox）
  const dbCombobox = modal.locator(".ant-table-row .ant-select").first();
  if (await dbCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
    await dbCombobox.locator(".ant-select-selector").click();
    await page.waitForTimeout(500);
    const dbOptions = page.locator(
      ".ant-select-dropdown:visible .ant-select-item-option",
    );
    if (database) {
      const dbOption = dbOptions
        .filter({ hasText: database })
        .first();
      if (!(await dbOption.isVisible({ timeout: 5000 }).catch(() => false))) {
        throw new Error(
          `Failed to load metadata databases for ${datasourceName ?? "datasource"}: ${await readSyncErrorText()}`,
        );
      }
      await dbOption.click();
    } else {
      // 选第一个可用数据库
      const firstDb = dbOptions.first();
      if (!(await firstDb.isVisible({ timeout: 5000 }).catch(() => false))) {
        throw new Error(
          `No metadata database options are available: ${await readSyncErrorText()}`,
        );
      }
      await firstDb.click();
    }
    await page.waitForTimeout(1000);
  }

  // 选择数据表（表格行中的第二个 combobox）
  const tableCombobox = modal.locator(".ant-table-row .ant-select").nth(1);
  if (await tableCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
    await tableCombobox.locator(".ant-select-selector").click();
    await page.waitForTimeout(500);
    const tableOptions = page.locator(
      ".ant-select-dropdown:visible .ant-select-item-option",
    );
    if (tableName) {
      const tblOption = tableOptions
        .filter({ hasText: tableName })
        .first();
      if (!(await tblOption.isVisible({ timeout: 5000 }).catch(() => false))) {
        throw new Error(
          `Failed to load metadata tables for ${database ?? "database"}: ${await readSyncErrorText()}`,
        );
      }
      await tblOption.click();
    } else {
      // 选第一个可用数据表
      const firstTbl = tableOptions.first();
      if (!(await firstTbl.isVisible({ timeout: 5000 }).catch(() => false))) {
        throw new Error(
          `No metadata table options are available: ${await readSyncErrorText()}`,
        );
      }
      await firstTbl.click();
    }
    await page.waitForTimeout(1000);
  }

  // 点击"临时同步"按钮
  const syncNowBtn = modal
    .getByRole("button", { name: /临时同步/ })
    .or(modal.locator("button").filter({ hasText: /临时同步/ }))
    .first();
  if (await syncNowBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await syncNowBtn.click();
    await page.waitForTimeout(3000);
  }

  if (await modal.isVisible().catch(() => false)) {
    throw new Error(`Metadata sync dialog did not submit: ${await readSyncErrorText()}`);
  }

  // 等待同步完成（最多120秒）
  await page.waitForLoadState("networkidle");
  try {
    await page.waitForFunction(
      () => {
        const statusEls = document.querySelectorAll(
          '[class*="status"], .ant-tag, .ant-badge-status-text',
        );
        for (let i = 0; i < statusEls.length; i++) {
          if (/运行中|同步中|进行中/.test(statusEls[i].textContent ?? ""))
            return false;
        }
        return true;
      },
      { timeout: 120000 },
    );
  } catch {
    // timeout acceptable
  }
  await page.waitForTimeout(2000);
}

// ── 数据质量项目 ──────────────────────────────────────────

/**
 * 获取数据质量项目列表并返回指定名称的项目 ID
 */
export async function getQualityProjectId(
  page: Page,
  projectName?: string,
): Promise<number | null> {
  const ids = await getAccessibleProjectIds(page);
  if (ids.length === 0) return null;
  if (!projectName) return ids[0];

  // 如果需要按名称查找，先获取所有项目详情
  const result = await page.evaluate(async (name: string) => {
    const response = await fetch("/dassets/v1/valid/project/getProjects", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      },
    });
    const json = (await response.json()) as {
      data?: Array<{
        id?: number | string;
        name?: string;
        projectName?: string;
      }>;
    };
    const project = (json.data ?? []).find((p) =>
      (p.name ?? p.projectName ?? "").includes(name),
    );
    return project ? Number(project.id) : null;
  }, projectName);

  return result ?? ids[0];
}

// ── 时间戳工具 ──────────────────────────────────────────

export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
