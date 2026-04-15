/**
 * Ant Design 通用组件交互工具
 *
 * 适用于所有使用 Ant Design 的项目，处理 Select 虚拟滚动、
 * Message 提示、Modal 弹窗等常见交互场景。
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
      await page.waitForTimeout(300);
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
