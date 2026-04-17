/**
 * 【通用配置】json格式校验管理 - 套件专属 helpers
 *
 * 基于实际 DOM snapshot 编写的稳定操作函数
 */
import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

const PAGE_URL =
  "http://shuzhan63-test-ltqc.k8s.dtstack.cn/dataAssets/#/dq/generalConfig/jsonValidationConfig";

async function dismissTopModal(page: Page): Promise<boolean> {
  const modalWrap = page.locator(".ant-modal-wrap:visible").last();
  if (!(await modalWrap.isVisible({ timeout: 800 }).catch(() => false))) {
    return false;
  }

  const closeBtn = modalWrap
    .locator(".ant-modal-close, button[aria-label='Close']")
    .first();
  if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await closeBtn.click().catch(() => undefined);
  } else {
    await page.keyboard.press("Escape").catch(() => undefined);
  }
  await modalWrap.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
  return true;
}

/** 进入 json格式校验管理页面并关闭可能出现的欢迎弹窗 */
export async function gotoJsonConfigPage(page: Page): Promise<void> {
  await page.goto(PAGE_URL);
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);

  // 关闭欢迎弹窗
  const welcomeDialog = page
    .locator("dialog, .ant-modal")
    .filter({ hasText: "欢迎使用" });
  if (await welcomeDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    const knowBtn = welcomeDialog.getByRole("button", { name: "知道了" });
    if (await knowBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await knowBtn.click();
      await welcomeDialog
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }
  }

  // 清理可能遗留的导入/错误弹窗，避免后续搜索按钮被遮挡。
  await dismissTopModal(page).catch(() => undefined);

  // 等待表格加载
  const container = page.locator(".json-format-check");
  await container.waitFor({ state: "visible", timeout: 15000 });

  // 重置列表查询与分页，避免上一次测试残留状态影响当前断言。
  const searchInput = page.locator(".dt-search input").first();
  if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    const keyword = (await searchInput.inputValue().catch(() => "")).trim();
    if (keyword) {
      await searchInput.clear();
      const searchBtn = page.locator(".dt-search .ant-input-search-button").first();
      if (await searchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchBtn.click();
      } else {
        await searchInput.press("Enter");
      }
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
    }
  }

  const pageOne = page.locator(".ant-pagination-item").filter({ hasText: /^1$/ }).first();
  if (await pageOne.isVisible({ timeout: 2000 }).catch(() => false)) {
    const className = (await pageOne.getAttribute("class")) ?? "";
    if (!className.includes("ant-pagination-item-active")) {
      await pageOne.click();
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
    }
  }
}

/** 点击顶部操作栏按钮 (新增/导入/导出) */
export async function clickHeaderButton(
  page: Page,
  name: string,
): Promise<void> {
  // 按钮文本可能含内部空格（如"新 增"），用精确正则匹配完整按钮名称，排除"新增子层级"等包含子串的行内按钮
  const exactPattern = new RegExp(
    `^${name.split("").join("\\s*")}$`,
  );
  const button = page.getByRole("button", { name: exactPattern }).first();
  await button.waitFor({ state: "visible", timeout: 10000 });
  await button.click();
}

/** 等待弹窗出现（动画结束后）并返回 locator */
export async function waitModal(
  page: Page,
  titleText?: string,
): Promise<Locator> {
  const visibleModal = page.locator(".ant-modal:visible").last();
  await expect(visibleModal).toBeVisible({ timeout: 10000 });
  const modal = page.locator(".ant-modal:visible").last();
  await modal.locator(".ant-modal-content").first().waitFor({
    state: "visible",
    timeout: 5000,
  });
  if (titleText) {
    await expect(
      modal.locator(".ant-modal-title"),
    ).toContainText(titleText, { timeout: 5000 });
  }
  return modal;
}

/** 在弹窗内填写 key 输入框 */
export async function fillKeyInput(
  modal: Locator,
  value: string,
): Promise<void> {
  const keyInput = modal
    .locator(".ant-form-item")
    .filter({ hasText: /^\*?\s*key$/i })
    .locator("input")
    .first();
  await keyInput.waitFor({ state: "visible", timeout: 5000 });
  await keyInput.clear({ timeout: 5000 });
  await keyInput.fill(value, { timeout: 5000 });
}

/** 在弹窗内填写中文名称 */
export async function fillNameInput(
  modal: Locator,
  value: string,
): Promise<void> {
  const nameInput = modal
    .locator(".ant-form-item")
    .filter({ hasText: "中文名称" })
    .locator("input")
    .first();
  await nameInput.clear({ timeout: 5000 });
  await nameInput.fill(value, { timeout: 5000 });
}

/** 在弹窗内填写 value 格式 */
export async function fillValueFormat(
  modal: Locator,
  value: string,
): Promise<void> {
  const valueInput = modal
    .locator(".ant-form-item")
    .filter({ hasText: "value格式" })
    .locator("input")
    .first();
  await valueInput.clear({ timeout: 5000 });
  await valueInput.fill(value, { timeout: 5000 });
}

/** 在弹窗内选择数据源类型 */
export async function selectDataSourceType(
  page: Page,
  modal: Locator,
  typeName: string,
): Promise<void> {
  const dsFormItem = modal
    .locator(".ant-form-item")
    .filter({ hasText: "数据源类型" });
  const select = dsFormItem.locator(".ant-select").first();
  await select.locator(".ant-select-selector").click();
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await dropdown.waitFor({ state: "visible", timeout: 5000 });
  const option = dropdown.locator(".ant-select-item-option").filter({ hasText: typeName }).first();
  await option.waitFor({ state: "visible", timeout: 5000 });
  await option.click();
  await expect(select.locator(".ant-select-selection-item").first()).toContainText(typeName, {
    timeout: 5000,
  });
}

/** 点击弹窗内的确定按钮 */
export async function clickModalConfirm(modal: Locator): Promise<void> {
  // 优先使用 role=button 语义化定位，避免对 ant-modal-footer CSS 类的强依赖
  const confirmBtn = modal
    .getByRole("button", { name: /确\s*定/ })
    .first();
  await confirmBtn.waitFor({ state: "visible", timeout: 5000 });
  await confirmBtn.click();
}

/** 点击弹窗确定并等待关闭 */
export async function confirmAndWaitClose(
  page: Page,
  modal: Locator,
): Promise<void> {
  await clickModalConfirm(modal);

  // 等待弹窗关闭：轮询检查（最多 10 秒，每 500ms 一次）
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(500);
    const modalWrap = page.locator(".ant-modal-wrap:visible");
    const count = await modalWrap.count();
    if (count === 0) {
      break;
    }
    // 检查是否有表单校验错误或 API 错误消息，有则抛出以便调用方感知
    const hasValidationError = await page
      .locator(".ant-modal:visible .ant-form-item-explain-error, .ant-modal:visible .ant-alert, .ant-modal:visible [role='alert']")
      .first()
      .isVisible()
      .catch(() => false);
    if (hasValidationError) {
      const errText = await page
        .locator(".ant-modal:visible .ant-form-item-explain-error, .ant-modal:visible .ant-alert, .ant-modal:visible [role='alert']")
        .first()
        .textContent()
        .catch(() => "unknown validation error");
      throw new Error(`弹窗表单校验失败，无法关闭：${errText}`);
    }
    // 检查全局 message 错误提示（API 请求失败时显示在弹窗外）
    const hasMessageError = await page
      .locator(".ant-message-error")
      .first()
      .isVisible()
      .catch(() => false);
    if (hasMessageError) {
      const errText = await page
        .locator(".ant-message-error")
        .first()
        .textContent()
        .catch(() => "API error");
      throw new Error(`提交失败（全局消息错误）：${errText}`);
    }
  }

  // 若弹窗在超时后仍未关闭（前端状态异常），尝试按 Escape 强制关闭
  const stillOpen = await page.locator(".ant-modal-wrap:visible").count();
  if (stillOpen > 0) {
    await page.keyboard.press("Escape");
    await page.locator(".ant-modal-wrap:visible").waitFor({ state: "hidden", timeout: 3000 }).catch(() => undefined);
  }

  // networkidle 限时 8s，避免后台轮询请求阻塞测试进程
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
  await page.waitForTimeout(300);
}

/** 完整的新增 key 操作 */
export async function addKey(
  page: Page,
  keyName: string,
  opts?: {
    chineseName?: string;
    valueFormat?: string;
    dataSourceType?: string;
  },
): Promise<void> {
  await clickHeaderButton(page, "新增");
  const modal = await waitModal(page, "新建");

  // 检查数据源类型是否已有值，若无则选择默认值（SparkThrift2.x），避免表单校验失败
  const dsFormItem = modal.locator(".ant-form-item").filter({ hasText: "数据源类型" });
  const dsSelect = dsFormItem.locator(".ant-select").first();
  const dsSelectionItem = dsSelect.locator(".ant-select-selection-item").first();
  const hasDataSource = await dsSelectionItem.isVisible({ timeout: 1000 }).catch(() => false);
  const targetDataSourceType = opts?.dataSourceType ?? "SparkThrift2.x";
  if (!hasDataSource) {
    await selectDataSourceType(page, modal, targetDataSourceType);
  } else if (opts?.dataSourceType) {
    await selectDataSourceType(page, modal, opts.dataSourceType);
  }

  await fillKeyInput(modal, keyName);

  if (opts?.chineseName) {
    await fillNameInput(modal, opts.chineseName);
  }

  if (opts?.valueFormat) {
    await fillValueFormat(modal, opts.valueFormat);
  }

  await confirmAndWaitClose(page, modal);

  // 新建后尝试按 key 定位记录，避免后续步骤因表格状态未刷新而误判。
  await ensureRowVisibleByKey(page, keyName, 15000).catch(() => undefined);
}

async function ensureRowVisibleByKey(
  page: Page,
  keyName: string,
  timeout = 15000,
): Promise<Locator> {
  const row = page.locator(".ant-table-row").filter({ hasText: keyName }).first();
  if (await row.isVisible({ timeout: 1500 }).catch(() => false)) {
    return row;
  }

  await searchKey(page, keyName);
  if (await row.isVisible({ timeout: Math.min(timeout, 10000) }).catch(() => false)) {
    return row;
  }

  await clearSearch(page);
  await expect(row).toBeVisible({ timeout: Math.max(2000, timeout - 10000) });
  return row;
}

/** 为指定 key 行新增子层级 */
export async function addChildKey(
  page: Page,
  parentKeyName: string,
  childKeyName: string,
  opts?: { chineseName?: string; valueFormat?: string },
): Promise<void> {
  const parentRow = await ensureRowVisibleByKey(page, parentKeyName, 15000);
  const addChildBtn = parentRow
    .locator(".ant-btn-link")
    .filter({ hasText: "新增子层级" })
    .first();
  await expect(addChildBtn).toBeVisible({ timeout: 5000 });
  await parentRow
    .locator(".ant-btn-link")
    .filter({ hasText: "新增子层级" })
    .click();

  const modal = await waitModal(page, "新建子层级");
  await fillKeyInput(modal, childKeyName);

  if (opts?.chineseName) {
    await fillNameInput(modal, opts.chineseName);
  }

  if (opts?.valueFormat) {
    await fillValueFormat(modal, opts.valueFormat);
  }

  await confirmAndWaitClose(page, modal);
}

/** 展开指定 key 的子层级（仅在折叠状态时点击，避免意外收起） */
export async function expandRow(
  page: Page,
  keyName: string,
): Promise<void> {
  const row = page
    .locator(".ant-table-row")
    .filter({ hasText: keyName })
    .first();
  const collapsedIcon = row.locator(".ant-table-row-expand-icon-collapsed");
  if (await collapsedIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
    await collapsedIcon.click();
    await page.waitForTimeout(500);
  }
}

/** 删除指定 key（单条删除 + Popconfirm 确认） */
export async function deleteKey(page: Page, keyName: string): Promise<void> {
  if (process.env.UI_AUTOTEST_SKIP_CLEANUP === "true") {
    return;
  }

  if (page.isClosed()) {
    return;
  }

  try {
    await searchKey(page, keyName);

    const row = page.locator(".ant-table-row").filter({ hasText: keyName }).first();
    if (!(await row.isVisible({ timeout: 2000 }).catch(() => false))) {
      await clearSearch(page).catch(() => undefined);
      return;
    }

    const deleteBtn = row.locator(".ant-btn-link").filter({ hasText: "删除" }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 3000 });
    await deleteBtn.click();

    const popconfirm = page.locator(".ant-popover:visible, .ant-popconfirm:visible").last();
    if (await popconfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
      const okBtn = popconfirm.locator(".ant-btn-primary").first();
      await okBtn.click();
    }
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
    await clearSearch(page).catch(() => undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Target page, context or browser has been closed/i.test(message)) {
      return;
    }
    throw error;
  }
}

/** 触发搜索：优先点击 .ant-input-search-button，回退到 press("Enter")，然后等待 spin 消失 */
async function triggerSearch(page: Page): Promise<void> {
  await dismissTopModal(page).catch(() => undefined);

  const searchBtn = page.locator(".dt-search .ant-input-search-button").first();
  if (await searchBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    try {
      await searchBtn.click();
    } catch {
      await dismissTopModal(page).catch(() => undefined);
      await searchBtn.click();
    }
  } else {
    const searchInput = page.locator(".dt-search input").first();
    await searchInput.press("Enter");
  }
  await page
    .locator(".ant-spin-spinning")
    .waitFor({ state: "hidden", timeout: 10000 })
    .catch(() => undefined);
  // networkidle 限时 8s，避免后台轮询请求阻塞测试进程
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
  await page.waitForTimeout(300);
}

/** 搜索 key */
export async function searchKey(page: Page, keyword: string): Promise<void> {
  if (page.isClosed()) {
    return;
  }
  const searchInput = page.locator(".dt-search input").first();
  if (!(await searchInput.isVisible({ timeout: 3000 }).catch(() => false))) {
    return;
  }
  await searchInput.clear();
  await searchInput.fill(keyword);
  await triggerSearch(page);
}

/** 清空搜索 */
export async function clearSearch(page: Page): Promise<void> {
  if (page.isClosed()) {
    return;
  }
  const searchInput = page.locator(".dt-search input").first();
  if (!(await searchInput.isVisible({ timeout: 3000 }).catch(() => false))) {
    return;
  }
  await searchInput.clear();
  await triggerSearch(page);
}
