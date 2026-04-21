// META: {"id":"t12","priority":"P1","title":"【P1】验证key名模糊搜索功能（含子层级key命中）"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  addChildKey,
  expandRow,
  deleteKey,
} from "./json-config-helpers";

async function waitTableLoaded(page: import("@playwright/test").Page) {
  await page
    .locator(".ant-spin-spinning")
    .waitFor({ state: "hidden", timeout: 15000 })
    .catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
}

async function clickSearch(page: import("@playwright/test").Page, keyword: string) {
  const input = page.locator(".dt-search input").first();
  const button = page.locator(".dt-search .ant-input-search-button").first();
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(keyword);
  await expect(input).toHaveValue(keyword, { timeout: 5000 });
  await button.click();
  await waitTableLoaded(page);
}

async function clearSearch(page: import("@playwright/test").Page) {
  const input = page.locator(".dt-search input").first();
  const button = page.locator(".dt-search .ant-input-search-button").first();
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill("");
  await button.click();
  await waitTableLoaded(page);
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证key名模糊搜索功能（含子层级key命中）", { tag: "@serial" }, async ({ page, step }) => {
    const orderInfo = uniqueName("orderInfo");
    const orderStatus = uniqueName("orderStatus");

    try {
      await step(
        "步骤0: 创建父 key orderInfo 及子层级 orderStatus → 前置数据准备完成",
        async () => {
          await gotoJsonConfigPage(page);
          await addKey(page, orderInfo);
          await clickSearch(page, orderInfo);
          await addChildKey(page, orderInfo, orderStatus);
          await clearSearch(page);
        },
      );

      await step(
        "步骤1: 进入【数据质量 → 通用配置】页面 → 页面正常加载，列表显示所有第一层级数据",
        async () => {
          await gotoJsonConfigPage(page);
          await waitTableLoaded(page);
          await expect(page.locator(".ant-table")).toBeVisible({ timeout: 10000 });
        },
      );

      await step(
        `步骤2: 在搜索框输入 ${orderInfo} 并点击搜索 → 列表仅显示 key 包含 ${orderInfo} 的第一层级记录`,
        async () => {
          await clickSearch(page, orderInfo);
          const rows = page.locator(".ant-table-row");
          await expect(rows.filter({ hasText: orderInfo }).first()).toBeVisible({ timeout: 10000 });
          const rowTexts = await rows.allTextContents();
          for (const rowText of rowTexts.map((text) => text.trim()).filter(Boolean)) {
            expect(rowText.includes(orderInfo)).toBe(true);
          }
        },
      );

      await step(
        `步骤3: 清空搜索框后重新输入 ${orderStatus} 并再次点击搜索 → 列表展示命中子层级的父级记录 ${orderInfo}`,
        async () => {
          await clearSearch(page);
          await clickSearch(page, orderStatus);
          const parentRow = page.locator(".ant-table-row").filter({ hasText: orderInfo }).first();
          await expect(parentRow).toBeVisible({ timeout: 10000 });
        },
        page.locator(".ant-table-row").filter({ hasText: orderInfo }).first(),
      );

      await step(
        `步骤4: 点击父行「+」展开子层级 → 可见 ${orderStatus} 子层级记录`,
        async () => {
          await expandRow(page, orderInfo);
          const childRow = page.locator(".ant-table-row").filter({ hasText: orderStatus }).first();
          await expect(childRow).toBeVisible({ timeout: 10000 });
          await expect(childRow).toContainText(orderStatus);
        },
        page.locator(".ant-table-row").filter({ hasText: orderStatus }).first(),
      );

      await step(
        "步骤5: 清空搜索框 → 列表恢复显示，搜索输入框为空",
        async () => {
          await clearSearch(page);
          await expect(page.locator(".dt-search input").first()).toHaveValue("", { timeout: 5000 });
          await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 10000 });
        },
      );
    } finally {
      await clearSearch(page).catch(() => undefined);
      await deleteKey(page, orderInfo).catch(() => undefined);
    }
  });
});
