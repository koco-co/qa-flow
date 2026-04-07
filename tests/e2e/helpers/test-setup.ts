/**
 * E2E 测试共享 helper
 * 提供环境配置读取、Cookie 注入、URL 构建、菜单导航等通用能力
 */
import type { Page } from '@playwright/test';

type RuntimeEnv = Record<string, string | undefined>;
type ProjectListResponse = { data?: Array<{ id?: number | string }> };

// ── 环境变量 ────────────────────────────────────────────

export function getEnv(name: string): string | undefined {
  return (
    globalThis as typeof globalThis & { process?: { env?: RuntimeEnv } }
  ).process?.env?.[name];
}

function getRawBaseUrl(): string {
  return getEnv('UI_AUTOTEST_BASE_URL') ?? getEnv('E2E_BASE_URL') ?? 'http://172.16.122.52';
}

// ── URL 构建 ────────────────────────────────────────────

export function normalizeBaseUrl(product: string): string {
  const rawBaseUrl = getRawBaseUrl();
  const parsed = new URL(rawBaseUrl);
  const cleanPath = parsed.pathname.replace(/\/$/, '');
  const productIndex = cleanPath.indexOf(`/${product}`);
  const productPath =
    productIndex >= 0
      ? cleanPath.slice(0, productIndex + `/${product}`.length)
      : `${cleanPath}/${product}`.replace(/\/{2,}/g, '/');
  return `${parsed.origin}${productPath || `/${product}`}`;
}

export function normalizeDataAssetsBaseUrl(): string {
  return normalizeBaseUrl('dataAssets');
}

export function normalizeOfflineBaseUrl(): string {
  return normalizeBaseUrl('batch');
}

export function buildDataAssetsUrl(path: string, pid?: number | string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const separator = normalizedPath.includes('?') ? '&' : '?';
  const hashPath = pid ? `${normalizedPath}${separator}pid=${pid}` : normalizedPath;
  return `${normalizeDataAssetsBaseUrl()}/#${hashPath}`;
}

export function buildOfflineUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizeOfflineBaseUrl()}/#${normalizedPath}`;
}

// ── Cookie 注入 ─────────────────────────────────────────

export async function applyRuntimeCookies(page: Page, product = 'dataAssets'): Promise<void> {
  const runtimeCookie = getEnv('UI_AUTOTEST_COOKIE')?.trim();
  if (!runtimeCookie) return;

  const cookieUrl = normalizeBaseUrl(product);
  const cookieMap = new Map<string, string>();
  for (const pair of runtimeCookie.split(/;\s*/)) {
    if (!pair) continue;
    const separatorIndex = pair.indexOf('=');
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
    const response = await fetch('/dassets/v1/valid/project/getProjects', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json;charset=UTF-8', 'Accept-Language': 'zh-CN' },
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
export async function navigateViaMenu(page: Page, menuPath: string[]): Promise<void> {
  const sideMenu = page.locator('.ant-layout-sider').first();
  await sideMenu.waitFor({ state: 'visible', timeout: 10000 });

  for (const menuName of menuPath) {
    const menuItem = sideMenu.getByText(menuName, { exact: false });
    const isVisible = await menuItem.isVisible().catch(() => false);
    if (!isVisible) {
      // 尝试展开父菜单
      const parentMenu = sideMenu.locator('.ant-menu-submenu-title').filter({ hasText: menuName });
      if (await parentMenu.isVisible().catch(() => false)) {
        await parentMenu.click();
        await page.waitForTimeout(300);
      }
    }
    await menuItem.first().click();
    await page.waitForTimeout(500);
  }
  await page.waitForLoadState('networkidle');
}

// ── Ant Design 组件交互 ─────────────────────────────────

/**
 * Ant Design Select 下拉选择
 */
export async function selectAntOption(
  page: Page,
  triggerLocator: import('@playwright/test').Locator,
  optionText: string,
): Promise<void> {
  await triggerLocator.click();
  await page.waitForTimeout(300);
  const dropdown = page.locator('.ant-select-dropdown:visible');
  await dropdown.waitFor({ state: 'visible', timeout: 5000 });
  await dropdown.getByText(optionText, { exact: false }).first().click();
  await page.waitForTimeout(300);
}

/**
 * 等待 Ant Design 全局提示消息
 */
export async function expectAntMessage(page: Page, text: string | RegExp, timeout = 5000): Promise<void> {
  const { expect } = await import('@playwright/test');
  const message = page.locator('.ant-message-notice, .ant-notification-notice');
  await expect(message.filter({ hasText: text }).first()).toBeVisible({ timeout });
}

/**
 * 等待 Ant Design Modal 可见并返回其 locator
 */
export async function waitForAntModal(page: Page, titleText?: string): Promise<import('@playwright/test').Locator> {
  const modal = page.locator('.ant-modal:visible');
  await modal.first().waitFor({ state: 'visible', timeout: 10000 });
  if (titleText) {
    const { expect } = await import('@playwright/test');
    await expect(modal.filter({ hasText: titleText }).first()).toBeVisible();
  }
  return modal.first();
}

// ── 离线开发：执行 SQL 任务 ──────────────────────────────

/**
 * 通过离线开发 UI 执行 SQL（建表等前置操作）
 * @param sqlContent SQL 内容
 * @param taskName 任务名称（自动生成唯一名）
 */
export async function executeSqlViaOfflineDev(
  page: Page,
  sqlContent: string,
  taskName?: string,
): Promise<void> {
  const name = taskName ?? `auto_sql_${Date.now()}`;

  // 导航到离线开发
  await applyRuntimeCookies(page, 'batch');
  await page.goto(buildOfflineUrl('/task/develop'));
  await page.waitForLoadState('networkidle');

  // 右键目录新建任务或使用新建按钮
  const createBtn = page.getByText('新建任务', { exact: false }).first();
  if (await createBtn.isVisible().catch(() => false)) {
    await createBtn.click();
  } else {
    // 尝试右键菜单
    const tree = page.locator('.ant-tree').first();
    await tree.click({ button: 'right' });
    await page.getByText('新建任务').first().click();
  }
  await page.waitForTimeout(500);

  // 选择 SparkSQL 或 SQL 任务类型
  const sqlOption = page.getByText(/SparkSQL|SQL/, { exact: false }).first();
  if (await sqlOption.isVisible().catch(() => false)) {
    await sqlOption.click();
  }

  // 填写任务名
  const nameInput = page.getByPlaceholder(/任务名称|请输入/, { exact: false }).first();
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill(name);
  }

  // 确认创建
  const confirmBtn = page.getByRole('button', { name: /确[定认]/ }).first();
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click();
  }
  await page.waitForLoadState('networkidle');

  // 填写 SQL
  const editor = page.locator('.monaco-editor, .CodeMirror, .dt-editor').first();
  await editor.waitFor({ state: 'visible', timeout: 10000 });
  await editor.click();

  // 使用键盘全选清空 + 粘贴
  const isMac = process.platform === 'darwin';
  const modifier = isMac ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+a`);
  await page.keyboard.press('Delete');

  // 通过 clipboard API 粘贴 SQL
  await page.evaluate((sql) => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.value = sql;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, sqlContent);

  // 如果 evaluate 不行，尝试 type
  await page.keyboard.type(sqlContent, { delay: 0 });
  await page.waitForTimeout(500);

  // 点击运行
  const runBtn = page.getByRole('button', { name: /运行|执行/ }).first();
  await runBtn.click();

  // 等待执行完成
  await page.waitForTimeout(3000);
  const resultArea = page.locator('.task-result, .result-panel, .bottom-panel').first();
  if (await resultArea.isVisible().catch(() => false)) {
    const { expect } = await import('@playwright/test');
    await expect(resultArea).not.toContainText(/失败|错误|error/i, { timeout: 60000 });
  }
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
  await page.goto(buildDataAssetsUrl('/metaDataSync'));
  await page.waitForLoadState('networkidle');

  // 点击新增同步任务
  const addBtn = page.getByText(/新增.*同步/, { exact: false }).first();
  await addBtn.click();
  await page.waitForTimeout(500);

  // 选择数据源类型
  if (datasourceType) {
    const dsTypeSelect = page.locator('.ant-select').filter({ hasText: /数据源类型/ }).first();
    if (await dsTypeSelect.isVisible().catch(() => false)) {
      await selectAntOption(page, dsTypeSelect, datasourceType);
    }
  }

  // 选择数据库
  if (database) {
    const dbSelect = page.locator('.ant-select').filter({ hasText: /数据库/ }).first();
    if (await dbSelect.isVisible().catch(() => false)) {
      await selectAntOption(page, dbSelect, database);
    }
  }

  // 选择数据表
  if (tableName) {
    const tableSelect = page.locator('.ant-select').filter({ hasText: /数据表/ }).first();
    if (await tableSelect.isVisible().catch(() => false)) {
      await selectAntOption(page, tableSelect, tableName);
    }
  }

  // 勾选全部内容
  const allContent = page.getByText('全部内容', { exact: false });
  if (await allContent.isVisible().catch(() => false)) {
    await allContent.click();
  }

  // 点击临时同步 / 添加 / 下一步
  const syncBtn = page.getByRole('button', { name: /临时同步|添加|下一步/ }).first();
  await syncBtn.click();
  await page.waitForTimeout(2000);

  // 等待同步完成
  await page.waitForLoadState('networkidle');
}

// ── 时间戳工具 ──────────────────────────────────────────

export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}
