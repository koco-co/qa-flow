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

// ── 离线开发：执行 SQL 任务 ──────────────────────────────

/**
 * 通过离线开发「临时查询」执行 Doris SQL
 *
 * 流程:
 *   1. /batch/ → 点击第一个项目(.left-card__proj-item)
 *   2. 点击左侧"临时查询"垂直 tab
 *   3. 展开"临时查询"树节点 → 右键 → "新建临时查询"
 *   4. 弹窗中填写名称, 选择"Doris SQL"类型, 选择"citest"集群, 确认
 *   5. 编辑器中 Ctrl+End 跳到末尾, 键盘输入 SQL
 *   6. 点击"运行"
 *   7. 等待执行完成
 */
export async function executeSqlViaBatchDoris(
  page: Page,
  sqlContent: string,
  taskName?: string,
): Promise<void> {
  const name = taskName ?? `auto_sql_${Date.now().toString(36)}`;
  const baseUrl = getRawBaseUrl();

  await applyRuntimeCookies(page, "batch");

  // 1. 进入 batch 项目列表
  await page.goto(`${baseUrl}/batch/`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // 2. 点击第一个项目卡片
  const projectCard = page.locator(".left-card__proj-item").first();
  if (await projectCard.isVisible({ timeout: 10000 }).catch(() => false)) {
    await projectCard.click();
  } else {
    // fallback: any card-like element
    const fallbackCard = page
      .locator("[class*='proj-item'], [class*='card'], .ant-card")
      .first();
    await fallbackCard.click();
  }
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // 3. 点击左侧"临时查询"垂直 tab
  const tempQueryTab = page.getByText("临时查询").first();
  await tempQueryTab.click();
  await page.waitForTimeout(2000);

  // 4. 展开"临时查询"树节点 (点击 switcher)
  const treeNode = page.locator(".ant-tree-title").filter({ hasText: "临时查询" }).first();
  const switcher = treeNode.locator("xpath=ancestor::*[contains(@class,'ant-tree-treenode')]//span[contains(@class,'ant-tree-switcher')]").first();
  if (await switcher.isVisible({ timeout: 3000 }).catch(() => false)) {
    const isClosed = await switcher.evaluate(
      (el) => el.classList.contains("ant-tree-switcher_close"),
    ).catch(() => false);
    if (isClosed) {
      await switcher.click();
      await page.waitForTimeout(1000);
    }
  }

  // 5. 右键"临时查询"树节点标题
  await treeNode.click({ button: "right" });
  await page.waitForTimeout(500);

  // 6. 点击"新建临时查询"上下文菜单
  const newQueryMenu = page.getByText("新建临时查询").first();
  await newQueryMenu.click();
  await page.waitForTimeout(1500);

  // 7. 处理新建临时查询弹窗
  const modal = page.locator(".ant-modal:visible").first();
  await modal.waitFor({ state: "visible", timeout: 10000 });

  // 填写临时查询名称
  const nameInput = modal.locator("input").first();
  await nameInput.clear();
  await nameInput.fill(name);

  // 选择"Doris SQL"类型
  const typeSelect = modal.locator(".ant-select").nth(0);
  if (await typeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await typeSelect.locator(".ant-select-selector").click();
    await page.waitForTimeout(500);
    const dorisOption = page
      .locator(".ant-select-dropdown:visible .ant-select-item-option")
      .filter({ hasText: /Doris\s*SQL/i })
      .first();
    if (await dorisOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dorisOption.click();
      await page.waitForTimeout(500);
    }
  }

  // 选择集群名称 "citest"
  const clusterSelect = modal.locator(".ant-select").nth(1);
  if (await clusterSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await clusterSelect.locator(".ant-select-selector").click();
    await page.waitForTimeout(500);
    const citestOption = page
      .locator(".ant-select-dropdown:visible .ant-select-item-option")
      .filter({ hasText: "citest" })
      .first();
    if (await citestOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await citestOption.click();
      await page.waitForTimeout(500);
    }
  }

  // 点击确认按钮
  const okBtn = modal.locator(".ant-btn-primary").first();
  await okBtn.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // 8. 编辑器中输入 SQL
  // window.monaco 不可用, 必须用键盘输入
  // 点击编辑器区域, Ctrl+End 到末尾, 然后逐块输入
  const editorArea = page.locator(".view-lines, .monaco-editor .overflow-guard").first();
  if (await editorArea.isVisible({ timeout: 10000 }).catch(() => false)) {
    await editorArea.click();
    await page.waitForTimeout(300);
  }

  // Ctrl+End 到末尾, 然后 Ctrl+A 全选, Delete 清空
  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${modifier}+End`);
  await page.keyboard.press(`${modifier}+a`);
  await page.keyboard.press("Delete");
  await page.waitForTimeout(300);

  // 分块键盘输入 SQL (每块 100 字符以提高可靠性)
  const chunks = sqlContent.match(/.{1,100}/gs) ?? [sqlContent];
  for (const chunk of chunks) {
    await page.keyboard.type(chunk, { delay: 0 });
  }
  await page.waitForTimeout(500);

  // 9. 点击运行按钮
  const runBtn = page
    .getByRole("button", { name: /运行/ })
    .or(page.locator("button").filter({ hasText: /运行/ }))
    .first();
  if (await runBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await runBtn.click();
  }
  await page.waitForTimeout(5000);

  // 10. 等待执行结果 (最多等 120 秒)
  await page.waitForLoadState("networkidle");

  const resultArea = page
    .locator('[class*="result"], [class*="console"], [class*="log"], .bottom-panel')
    .first();
  if (await resultArea.isVisible({ timeout: 15000 }).catch(() => false)) {
    try {
      await page.waitForFunction(
        () => {
          const el = document.querySelector(
            '[class*="result"], [class*="console"], [class*="log"], .bottom-panel',
          );
          return el && !/运行中|executing/i.test(el.textContent ?? "");
        },
        { timeout: 120000 },
      );
    } catch {
      // timeout acceptable for DDL
    }
  }
  await page.waitForTimeout(2000);
}

// ── 元数据同步 ──────────────────────────────────────────

/**
 * 创建并执行元数据同步任务
 * @param tableName 要同步的表名
 */
export async function syncMetadata(
  page: Page,
  datasourceType?: string,
  database?: string,
  tableName?: string,
): Promise<void> {
  // 导航到元数据同步
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/metaDataSync"));
  await page.waitForLoadState("networkidle");

  // 点击新增同步任务
  const addBtn = page.getByText(/新增.*同步/, { exact: false }).first();
  await addBtn.click();
  await page.waitForTimeout(500);

  // 选择数据源类型
  if (datasourceType) {
    const dsTypeSelect = page
      .locator(".ant-select")
      .filter({ hasText: /数据源类型/ })
      .first();
    if (await dsTypeSelect.isVisible().catch(() => false)) {
      await selectAntOption(page, dsTypeSelect, datasourceType);
    }
  }

  // 选择数据库
  if (database) {
    const dbSelect = page
      .locator(".ant-select")
      .filter({ hasText: /数据库/ })
      .first();
    if (await dbSelect.isVisible().catch(() => false)) {
      await selectAntOption(page, dbSelect, database);
    }
  }

  // 选择数据表
  if (tableName) {
    const tableSelect = page
      .locator(".ant-select")
      .filter({ hasText: /数据表/ })
      .first();
    if (await tableSelect.isVisible().catch(() => false)) {
      await selectAntOption(page, tableSelect, tableName);
    }
  }

  // 勾选全部内容
  const allContent = page.getByText("全部内容", { exact: false });
  if (await allContent.isVisible().catch(() => false)) {
    await allContent.click();
  }

  // 点击临时同步 / 添加 / 下一步
  const syncBtn = page
    .getByRole("button", { name: /临时同步|添加|下一步/ })
    .first();
  await syncBtn.click();
  await page.waitForTimeout(2000);

  // 等待同步完成
  await page.waitForLoadState("networkidle");
}

// ── 时间戳工具 ──────────────────────────────────────────

export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
