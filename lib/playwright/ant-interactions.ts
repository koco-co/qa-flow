/**
 * Ant Design 通用组件交互工具
 *
 * 适用于所有使用 Ant Design 的项目。
 * 按组件分区：Select / Message / Modal / Drawer / Popconfirm /
 *             Table / Form / Tabs / Checkbox & Radio / Dropdown
 */
import type { Locator, Page } from "@playwright/test";

/**
 * Ant Design Select 下拉选择
 *
 * 三级 fallback 策略：
 *   1. 直接在可见选项中精确匹配
 *   2. 通过搜索输入框过滤后匹配
 *   3. 滚动 rc-virtual-list 逐段查找
 *
 * @param page - Playwright Page 实例
 * @param triggerLocator - Select 组件的触发器 Locator（通常是 .ant-select 元素）
 * @param optionText - 要选择的选项文本（字符串精确匹配或正则）
 */
export async function selectAntOption(
  page: Page,
  triggerLocator: Locator,
  optionText: string | RegExp,
): Promise<void> {
  await triggerLocator.click();
  await page.waitForTimeout(300);
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await dropdown.waitFor({ state: "visible", timeout: 5000 });

  const options = dropdown.locator(".ant-select-item-option");
  const waitForOptionsToSettle = async (maxWaitMs = 1200): Promise<void> => {
    const startedAt = Date.now();
    do {
      if ((await options.count()) > 0) {
        await page.waitForTimeout(150);
        return;
      }

      const isLoading = await dropdown
        .locator(".ant-spin-spinning, .ant-select-item-empty .ant-spin-spinning")
        .first()
        .isVisible()
        .catch(() => false);
      if (!isLoading && Date.now() - startedAt >= maxWaitMs / 2) {
        return;
      }

      await page.waitForTimeout(250);
    } while (Date.now() - startedAt < maxWaitMs);
  };

  await waitForOptionsToSettle();

  const optionLocator = async () => {
    if (typeof optionText === "string") {
      const exactMatchIndex = await options.evaluateAll(
        (els, expected) => els.findIndex((el) => el.textContent?.trim() === expected),
        optionText,
      );
      if (exactMatchIndex >= 0) {
        return options.nth(exactMatchIndex);
      }
    }

    return options.filter({ hasText: optionText }).first();
  };

  const clickVisibleOption = async (): Promise<boolean> => {
    const option = await optionLocator();
    if (!(await option.count())) return false;
    if (!(await option.isVisible().catch(() => false))) return false;
    await option.click();
    await page.waitForTimeout(300);
    return true;
  };

  // 策略 1：直接匹配可见选项
  if (await clickVisibleOption()) return;

  // 策略 2：搜索输入框过滤
  if (typeof optionText === "string") {
    const searchInput = triggerLocator
      .locator("input.ant-select-selection-search-input")
      .or(
        page.locator(
          ".ant-select-open input.ant-select-selection-search-input, .ant-select-focused input.ant-select-selection-search-input",
        ),
      )
      .first();
    if ((await searchInput.count()) && (await searchInput.isEditable().catch(() => false))) {
      await searchInput.fill(optionText);
      await waitForOptionsToSettle(2500);
      if (await clickVisibleOption()) return;
    }
  }

  // 策略 3：滚动 rc-virtual-list 查找
  const virtualHolder = dropdown.locator(".rc-virtual-list-holder").first();
  if (await virtualHolder.count()) {
    const metrics = await virtualHolder.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    const step = Math.max(Math.floor(metrics.clientHeight / 2), 120);
    for (let top = 0; top <= metrics.scrollHeight; top += step) {
      await virtualHolder.evaluate((el, nextTop) => {
        el.scrollTop = nextTop;
      }, top);
      await page.waitForTimeout(200);
      if (await clickVisibleOption()) return;
    }
  }

  const visibleOptions = await dropdown
    .locator(".ant-select-item-option")
    .evaluateAll((els) =>
      els.map((el) => el.textContent?.trim()).filter((text): text is string => Boolean(text)),
    );
  throw new Error(
    `Ant Select option not found: ${String(optionText)}. Visible options: ${visibleOptions.join(", ")}`,
  );
}

/**
 * 等待 Ant Design 全局提示消息（Message 或 Notification）
 *
 * @param page - Playwright Page 实例
 * @param text - 期望的消息文本（字符串或正则）
 * @param timeout - 等待超时时间，默认 5000ms
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
 * 等待 Ant Design Modal 弹窗可见并返回其 Locator
 *
 * @param page - Playwright Page 实例
 * @param titleText - 可选，弹窗标题文本，用于精确定位
 * @returns Modal 的 Locator
 */
export async function waitForAntModal(
  page: Page,
  titleText?: string,
): Promise<Locator> {
  const modal = page.locator(".ant-modal:visible");
  await modal.first().waitFor({ state: "visible", timeout: 10000 });
  if (titleText) {
    const { expect } = await import("@playwright/test");
    await expect(modal.filter({ hasText: titleText }).first()).toBeVisible();
  }
  return modal.first();
}

/**
 * 确认 Ant Design Modal 弹窗（点击主按钮）
 *
 * @param page - Playwright Page 实例
 * @param modal - 可选，指定 Modal Locator；不传时自动定位最后一个可见 Modal
 */
export async function confirmAntModal(
  page: Page,
  modal?: Locator,
): Promise<void> {
  const target = modal ?? page.locator(".ant-modal:visible").last();
  const { expect } = await import("@playwright/test");
  await expect(target).toBeVisible({ timeout: 5000 });
  await target.locator(".ant-btn-primary").click();
}

/**
 * 关闭 Ant Design Modal 弹窗（点击取消按钮或关闭图标）
 *
 * @param page - Playwright Page 实例
 * @param modal - 可选，指定 Modal Locator
 */
export async function closeAntModal(
  page: Page,
  modal?: Locator,
): Promise<void> {
  const target = modal ?? page.locator(".ant-modal:visible").last();
  const closeBtn = target.locator(".ant-modal-close").first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  } else {
    await target.locator("button").filter({ hasText: /取消|Cancel/ }).first().click();
  }
  const { expect } = await import("@playwright/test");
  await expect(target).not.toBeVisible({ timeout: 5000 });
}

// ── Drawer 抽屉 ────────────────────────────────────────

/**
 * 等待 Ant Design Drawer 可见并返回其 Locator
 *
 * @param page - Playwright Page 实例
 * @param titleText - 可选，抽屉标题文本
 */
export async function waitForAntDrawer(
  page: Page,
  titleText?: string,
): Promise<Locator> {
  const drawer = page.locator(".ant-drawer:visible");
  await drawer.first().waitFor({ state: "visible", timeout: 10000 });
  if (titleText) {
    const { expect } = await import("@playwright/test");
    await expect(
      drawer.filter({ hasText: titleText }).first(),
    ).toBeVisible();
  }
  return drawer.first();
}

/**
 * 关闭 Ant Design Drawer（点击关闭图标）
 *
 * @param page - Playwright Page 实例
 * @param drawer - 可选，指定 Drawer Locator
 */
export async function closeAntDrawer(
  page: Page,
  drawer?: Locator,
): Promise<void> {
  const target = drawer ?? page.locator(".ant-drawer:visible").first();
  await target.locator(".ant-drawer-close").first().click();
  const { expect } = await import("@playwright/test");
  await expect(target).not.toBeVisible({ timeout: 5000 });
}

/**
 * 等待浮层（Modal 或 Drawer）可见 — 业务中弹窗/抽屉形态不固定时使用
 *
 * @param page - Playwright Page 实例
 * @param titleText - 可选，浮层标题文本
 */
export async function waitForOverlay(
  page: Page,
  titleText?: string,
): Promise<Locator> {
  const overlay = page.locator(".ant-modal:visible, .ant-drawer:visible");
  await overlay.first().waitFor({ state: "visible", timeout: 10000 });
  if (titleText) {
    const { expect } = await import("@playwright/test");
    await expect(
      overlay.filter({ hasText: titleText }).first(),
    ).toBeVisible();
  }
  return overlay.first();
}

// ── Popconfirm / Popover 气泡确认 ─────────────────────

/**
 * 确认 Ant Design Popconfirm 气泡确认框
 *
 * 兼容 ant-popconfirm 和 ant-popover 两种容器。
 *
 * @param page - Playwright Page 实例
 * @param timeout - 等待气泡出现的超时时间，默认 3000ms
 */
export async function confirmPopconfirm(
  page: Page,
  timeout = 3000,
): Promise<void> {
  const popconfirm = page
    .locator(".ant-popconfirm:visible, .ant-popover:visible")
    .first();
  await popconfirm
    .waitFor({ state: "visible", timeout })
    .catch(() => { /* 未弹出则静默跳过 */ });

  const confirmBtn = popconfirm
    .locator(".ant-btn-primary")
    .first();
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click();
    await page.waitForTimeout(300);
  }
}

/**
 * 取消 Ant Design Popconfirm 气泡确认框
 */
export async function cancelPopconfirm(
  page: Page,
  timeout = 3000,
): Promise<void> {
  const popconfirm = page
    .locator(".ant-popconfirm:visible, .ant-popover:visible")
    .first();
  await popconfirm.waitFor({ state: "visible", timeout });
  await popconfirm
    .locator("button")
    .filter({ hasText: /取消|Cancel|No/ })
    .first()
    .click();
}

// ── Table 表格 ─────────────────────────────────────────

/**
 * 等待 Ant Design Table 加载完成（tbody 可见且无 loading 遮罩）
 *
 * @param page - Playwright Page 实例
 * @param tableLocator - 可选，指定 Table 容器；默认取页面第一个 .ant-table
 * @param timeout - 超时时间，默认 15000ms
 */
export async function waitForTableLoaded(
  page: Page,
  tableLocator?: Locator,
  timeout = 15000,
): Promise<Locator> {
  const table = tableLocator ?? page.locator(".ant-table").first();
  const tbody = table.locator(".ant-table-tbody");
  await tbody.waitFor({ state: "visible", timeout });
  // 等待 loading 遮罩消失
  const spinner = table.locator(".ant-spin-spinning");
  if (await spinner.isVisible().catch(() => false)) {
    const { expect } = await import("@playwright/test");
    await expect(spinner).not.toBeVisible({ timeout });
  }
  return table;
}

/**
 * 在 Ant Design Table 中按文本定位某一行
 *
 * @param page - Playwright Page 实例
 * @param rowText - 行中应包含的文本（字符串或正则）
 * @param tableLocator - 可选，指定 Table 容器
 */
export function findTableRow(
  page: Page,
  rowText: string | RegExp,
  tableLocator?: Locator,
): Locator {
  const table = tableLocator ?? page.locator(".ant-table").first();
  return table
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasText: rowText })
    .first();
}

// ── Form 表单 ──────────────────────────────────────────

/**
 * 按标签文本定位 Ant Design 表单字段（ant-form-item）
 *
 * @param container - 表单所在容器（Page、Modal、Drawer 的 Locator）
 * @param label - 字段标签文本（字符串或正则）
 * @returns 对应 ant-form-item 的 Locator
 */
export function locateFormItem(
  container: Page | Locator,
  label: string | RegExp,
): Locator {
  return container
    .locator(".ant-form-item")
    .filter({ hasText: label })
    .first();
}

/**
 * 断言 Ant Design 表单验证错误消息可见
 *
 * @param container - 表单所在容器
 * @param errorText - 可选，期望的错误文本；不传则只检查是否有任何错误
 * @param timeout - 超时时间，默认 5000ms
 */
export async function expectFormError(
  container: Page | Locator,
  errorText?: string | RegExp,
  timeout = 5000,
): Promise<void> {
  const { expect } = await import("@playwright/test");
  const errors = container.locator(".ant-form-item-explain-error");
  if (errorText) {
    await expect(
      errors.filter({ hasText: errorText }).first(),
    ).toBeVisible({ timeout });
  } else {
    await expect(errors.first()).toBeVisible({ timeout });
  }
}

/**
 * 断言 Ant Design 表单无验证错误
 */
export async function expectNoFormError(
  container: Page | Locator,
  timeout = 3000,
): Promise<void> {
  const { expect } = await import("@playwright/test");
  await expect(
    container.locator(".ant-form-item-explain-error"),
  ).not.toBeVisible({ timeout });
}

// ── Tabs 标签页 ────────────────────────────────────────

/**
 * 切换 Ant Design Tabs 标签页
 *
 * @param page - Playwright Page 实例
 * @param tabName - 标签页文本
 * @param container - 可选，Tabs 所在容器
 */
export async function switchAntTab(
  page: Page,
  tabName: string | RegExp,
  container?: Locator,
): Promise<void> {
  const scope = container ?? page;
  const tab = scope
    .locator(".ant-tabs-tab")
    .filter({ hasText: tabName })
    .first();
  await tab.click();
  // 等待 tab 变为 active
  const { expect } = await import("@playwright/test");
  await expect(
    scope
      .locator(".ant-tabs-tab-active")
      .filter({ hasText: tabName })
      .first(),
  ).toBeVisible({ timeout: 5000 });
}

// ── Checkbox & Radio ───────────────────────────────────

/**
 * 勾选 Ant Design Checkbox（如果尚未勾选）
 *
 * @param checkbox - Checkbox 的 Locator（.ant-checkbox-wrapper 或其父级）
 */
export async function checkAntCheckbox(checkbox: Locator): Promise<void> {
  const input = checkbox.locator(
    "input[type='checkbox'], .ant-checkbox-input",
  ).first();
  if (!(await input.isChecked())) {
    await checkbox.click();
  }
}

/**
 * 取消勾选 Ant Design Checkbox
 */
export async function uncheckAntCheckbox(checkbox: Locator): Promise<void> {
  const input = checkbox.locator(
    "input[type='checkbox'], .ant-checkbox-input",
  ).first();
  if (await input.isChecked()) {
    await checkbox.click();
  }
}

/**
 * 点击 Ant Design Radio 选项
 *
 * @param container - Radio Group 所在容器
 * @param label - 要选择的 Radio 文本
 */
export async function clickAntRadio(
  container: Page | Locator,
  label: string | RegExp,
): Promise<void> {
  await container
    .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
    .filter({ hasText: label })
    .first()
    .click();
}

// ── Dropdown 下拉菜单 ──────────────────────────────────

/**
 * 在 Ant Design Dropdown 菜单中点击指定菜单项
 *
 * 适用于右键菜单、按钮下拉菜单等 ant-dropdown 场景（非 Select）。
 *
 * @param page - Playwright Page 实例
 * @param menuItemText - 菜单项文本
 * @param timeout - 等待菜单出现的超时时间，默认 5000ms
 */
export async function clickDropdownMenuItem(
  page: Page,
  menuItemText: string | RegExp,
  timeout = 5000,
): Promise<void> {
  const menu = page.locator(
    ".ant-dropdown:visible, .ant-dropdown-menu:visible",
  );
  await menu.first().waitFor({ state: "visible", timeout });
  await menu
    .locator(".ant-dropdown-menu-item, [role='menuitem']")
    .filter({ hasText: menuItemText })
    .first()
    .click();
}
