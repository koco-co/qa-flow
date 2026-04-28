// META: {"id":"t42","priority":"P1","title":"【P1】验证编辑弹窗与新增弹窗保持一致（value格式有值时展示正则测试控件）"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  waitModal,
  deleteKey,
} from "./json-config-helpers";

async function waitTableLoaded(page: import("@playwright/test").Page) {
  await page
    .locator(".ant-spin-spinning")
    .waitFor({ state: "hidden", timeout: 15000 })
    .catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
}

async function searchKeyStrict(page: import("@playwright/test").Page, keyword: string) {
  const input = page.locator(".dt-search input").first();
  const button = page.locator(".dt-search .ant-input-search-button").first();
  await input.fill(keyword);
  await expect(input).toHaveValue(keyword, { timeout: 5000 });
  await button.click();
  await waitTableLoaded(page);
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证编辑弹窗与新增弹窗保持一致（value格式有值时展示正则测试控件）", { tag: "@serial" }, async ({ page, step }) => {
    test.setTimeout(180000);
    const editRegexKey = uniqueName("editRegexKey");

    try {
      await step("步骤1: 进入页面并新增带 value格式 的 key → 前置数据准备完成", async () => {
        await gotoJsonConfigPage(page);
        await addKey(page, editRegexKey, {
          chineseName: "编辑正则键",
          valueFormat: "^\\d{6}$",
          dataSourceType: "SparkThrift2.x",
        });
      });

      await step("步骤2: 搜索 editRegexKey 并点击【编辑】 → 弹出编辑弹窗", async () => {
        await searchKeyStrict(page, editRegexKey);
        const targetRow = page.locator(".ant-table-row").filter({ hasText: editRegexKey }).first();
        await expect(targetRow).toBeVisible({ timeout: 10000 });
        await targetRow.locator(".ant-btn-link").filter({ hasText: "编辑" }).click();
      });

      await step(
        "步骤3: 查看编辑弹窗 → 字段与新增弹窗保持一致，且 value格式 有值时显示「测试数据」和「正则匹配测试」",
        async () => {
          const modal = await waitModal(page, "编辑");
          await expect(modal.locator("input#jsonKey").first()).toHaveValue(editRegexKey, {
            timeout: 5000,
          });
          await expect(
            modal.locator(".ant-form-item").filter({ hasText: "中文名称" }).locator("input").first(),
          ).toHaveValue("编辑正则键", { timeout: 5000 });
          await expect(
            modal.locator(".ant-form-item").filter({ hasText: "value格式" }).locator("input").first(),
          ).toHaveValue("^\\d{6}$", { timeout: 5000 });
          await expect(
            modal
              .locator(".ant-form-item")
              .filter({ hasText: "数据源类型" })
              .locator(".ant-select-selection-item"),
          ).toContainText("SparkThrift2.x", { timeout: 5000 });
          await expect(
            modal.locator(".ant-form-item").filter({ hasText: "测试数据" }).locator("textarea").first(),
          ).toBeVisible({ timeout: 5000 });
          await expect(modal.getByRole("button", { name: "正则匹配测试" })).toBeVisible({
            timeout: 5000,
          });
        },
      );
    } finally {
      await deleteKey(page, editRegexKey).catch(() => undefined);
    }
  });
});
