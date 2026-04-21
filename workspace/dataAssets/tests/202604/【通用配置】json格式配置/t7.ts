// META: {"id":"t7","priority":"P1","title":"【P1】验证编辑key名称、value格式、数据源类型并保存生效"}
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
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(keyword);
  await expect(input).toHaveValue(keyword, { timeout: 5000 });
  await button.click();
  await waitTableLoaded(page);
}

async function clearSearchStrict(page: import("@playwright/test").Page) {
  const input = page.locator(".dt-search input").first();
  const button = page.locator(".dt-search .ant-input-search-button").first();
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill("");
  await button.click();
  await waitTableLoaded(page);
}

function rowByKey(page: import("@playwright/test").Page, key: string) {
  return page.locator(".ant-table-row").filter({ hasText: key }).first();
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证编辑key名称、value格式、数据源类型并保存生效", { tag: "@serial" }, async ({ page, step }) => {
    test.setTimeout(240000);
    const editTarget = uniqueName("editTarget");
    const editTargetV2 = uniqueName("editTargetV2");
    let beforeUpdateAt = "";

    try {
      await step(
        "步骤1: 进入【数据质量 → 通用配置】页面并准备 editTarget 数据 → 页面正常加载，列表显示 editTarget 记录",
        async () => {
          await gotoJsonConfigPage(page);
          await addKey(page, editTarget, {
            chineseName: "编辑前名称",
            valueFormat: "^[a-z]+$",
            dataSourceType: "SparkThrift2.x",
          });
          await searchKeyStrict(page, editTarget);
          const initialRow = rowByKey(page, editTarget);
          await expect(initialRow).toBeVisible({ timeout: 10000 });
          beforeUpdateAt = (
            await initialRow.locator(".ant-table-cell").nth(8).textContent()
          )?.trim() ?? "";
          expect(beforeUpdateAt).not.toBe("");
        },
        rowByKey(page, editTarget),
      );

      await step(
        "步骤2: 在 editTarget 行点击【编辑】 → 弹出编辑弹窗，key/value格式/数据源类型显示当前值",
        async () => {
          const targetRow = rowByKey(page, editTarget);
          await expect(targetRow).toBeVisible({ timeout: 10000 });
          await targetRow.locator(".ant-btn-link").filter({ hasText: "编辑" }).click();

          const modal = await waitModal(page, "编辑");
          await expect(modal.locator("input#jsonKey").first()).toHaveValue(editTarget, {
            timeout: 5000,
          });
          await expect(
            modal.locator("input#value").first(),
          ).toHaveValue("^[a-z]+$", { timeout: 5000 });
          await expect(
            modal.locator(".ant-form-item").filter({ hasText: "数据源类型" }).locator(".ant-select-selection-item"),
          ).toContainText("SparkThrift2.x", { timeout: 5000 });
        },
      );

      await step(
        "步骤3: 修改 key、value格式、数据源类型并点击【确定】 → 弹窗关闭",
        async () => {
          // 步骤2结束时弹窗仍然打开，这里继续在同一弹窗里操作
          const modal = await waitModal(page, "编辑");
          const keyInput = modal.locator("input#jsonKey").first();
          // 通过 id 精确定位 value 格式输入框（EditModal 中该字段 name="value"，Ant Design 渲染为 id="value"）
          const valueInput = modal.locator("input#value").first();

          // 先改 key 名称
          await keyInput.fill(editTargetV2);
          await expect(keyInput).toHaveValue(editTargetV2, { timeout: 5000 });

          // 改 value 格式（使用 fill，Ant Design Form 会更新内部 store）
          await valueInput.fill("^\\d{4}$");
          await expect(valueInput).toHaveValue("^\\d{4}$", { timeout: 5000 });

          // 最后改数据源类型（数据源变更会触发 re-render，放最后避免 reset 其他字段）
          const dataSourceSelect = modal
            .locator(".ant-form-item")
            .filter({ hasText: "数据源类型" })
            .locator(".ant-select")
            .first();
          await dataSourceSelect.locator(".ant-select-selector").click();
          await page
            .locator(".ant-select-dropdown:visible .ant-select-item-option")
            .filter({ hasText: "Doris3.x" })
            .first()
            .click();
          await expect(
            modal
              .locator(".ant-form-item")
              .filter({ hasText: "数据源类型" })
              .locator(".ant-select-selection-item"),
          ).toContainText("Doris3.x", { timeout: 5000 });

          // 数据源改变后可能触发 re-render，重新验证 value 格式仍然是新值
          await expect(valueInput).toHaveValue("^\\d{4}$", { timeout: 5000 });

          await modal.getByRole("button", { name: /^确\s*定$/ }).click();
          await modal.waitFor({ state: "hidden", timeout: 15000 });
          await waitTableLoaded(page);
        },
      );

      await step(
        "步骤4: 搜索 editTargetV2 → 列表显示更新后的key、value格式、数据源类型、更新人和更新时间",
        async () => {
          await searchKeyStrict(page, editTargetV2);
          const updatedRow = rowByKey(page, editTargetV2);
          await expect(updatedRow).toBeVisible({ timeout: 10000 });
          await expect(updatedRow).toContainText(editTargetV2);
          await expect(updatedRow).toContainText("^\\d{4}$");
          await expect(updatedRow).toContainText("Doris3.x");
          await expect(updatedRow).toContainText("admin@dtstack.com");

          const updatedAt = (
            await updatedRow.locator(".ant-table-cell").nth(8).textContent()
          )?.trim() ?? "";
          expect(updatedAt).not.toBe("");
          expect(updatedAt).not.toBe(beforeUpdateAt);
        },
        rowByKey(page, editTargetV2),
      );

      await step(
        "步骤5: 搜索原 key editTarget → 原记录不存在",
        async () => {
          await searchKeyStrict(page, editTarget);
          await expect(page.locator(".ant-table-row").filter({ hasText: editTarget })).toHaveCount(0);
        },
      );
    } finally {
      await clearSearchStrict(page).catch(() => undefined);
      await deleteKey(page, editTargetV2).catch(() => undefined);
      await deleteKey(page, editTarget).catch(() => undefined);
    }
  });
});
