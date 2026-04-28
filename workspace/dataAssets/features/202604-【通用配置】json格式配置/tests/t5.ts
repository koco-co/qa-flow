// META: {"id":"t5","priority":"P2","title":"【P2】验证新增key时数据源类型三种选项可正常切换"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName, selectAntOption } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  clickHeaderButton,
  waitModal,
  fillKeyInput,
  confirmAndWaitClose,
  deleteKey,
  searchKey,
} from "./json-config-helpers";

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P2】验证新增key时数据源类型三种选项可正常切换", async ({ page, step }) => {
    const typeTestKey = uniqueName("typeTestKey");

    try {
      await step("步骤1: 进入json格式校验管理页面 → 页面正常加载，列表显示已有key数据行", async () => {
        await gotoJsonConfigPage(page);
        await expect(
          page.locator(".json-format-check").first(),
        ).toBeVisible({ timeout: 15000 });
      });

      await step("步骤2: 点击新增按钮，打开新建弹窗 → 弹窗出现，数据源类型默认值为 SparkThrift2.x", async () => {
        await clickHeaderButton(page, "新增");
        const modal = await waitModal(page, "新建");

        const dsTypeItem = modal
          .locator(".ant-form-item")
          .filter({ hasText: "数据源类型" });
        const defaultValueLocator = dsTypeItem.locator(".ant-select-selection-item").first();
        await expect(defaultValueLocator).toBeVisible({ timeout: 5000 });
        await expect(defaultValueLocator).toHaveText("SparkThrift2.x");
      });

      const modal = page.locator(".ant-modal").last();

      await step("步骤3: 打开数据源类型下拉 → 下拉列表包含 SparkThrift2.x / Hive2.x / Doris3.x 三个选项", async () => {
        await expect(modal).toBeVisible({ timeout: 5000 });
        const dsTypeItem = modal
          .locator(".ant-form-item")
          .filter({ hasText: "数据源类型" });
        const select = dsTypeItem.locator(".ant-select").first();
        await select.locator(".ant-select-selector").click();
        await page.waitForTimeout(300);

        const dropdown = page.locator(".ant-select-dropdown:visible");
        await expect(dropdown).toBeVisible({ timeout: 5000 });

        const options = dropdown.locator(".ant-select-item-option");
        await expect(options.filter({ hasText: "SparkThrift2.x" })).toBeVisible();
        await expect(options.filter({ hasText: "Hive2.x" })).toBeVisible();
        await expect(options.filter({ hasText: "Doris3.x" })).toBeVisible();
        await expect(options).toHaveCount(3);

        // 按 Escape 关闭 Select 下拉（不会触发弹窗关闭），等待下拉动画结束。
        await page.keyboard.press("Escape");
        // 等待下拉彻底消失后再继续，避免 RAF 在动画期间挂起。
        await page.locator(".ant-select-dropdown").waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
        await page.waitForTimeout(500);
      });

      await step("步骤4: 选择 Hive2.x → 下拉框当前值显示 Hive2.x", async () => {
        await expect(modal).toBeVisible({ timeout: 5000 });
        const dsTypeItem4 = modal
          .locator(".ant-form-item")
          .filter({ hasText: "数据源类型" });
        await selectAntOption(page, dsTypeItem4.locator(".ant-select").first(), "Hive2.x");

        const selectedLocator = dsTypeItem4.locator(".ant-select-selection-item").first();
        await expect(selectedLocator).toHaveText("Hive2.x");
      });

      await step("步骤5: 选择 Doris3.x → 下拉框当前值显示 Doris3.x", async () => {
        await expect(modal).toBeVisible({ timeout: 5000 });
        const dsTypeItem5 = modal
          .locator(".ant-form-item")
          .filter({ hasText: "数据源类型" });
        await selectAntOption(page, dsTypeItem5.locator(".ant-select").first(), "Doris3.x");

        const selectedLocator = dsTypeItem5.locator(".ant-select-selection-item").first();
        await expect(selectedLocator).toHaveText("Doris3.x");
      });

      await step("步骤6: 选回 SparkThrift2.x → 下拉框当前值显示 SparkThrift2.x", async () => {
        await expect(modal).toBeVisible({ timeout: 5000 });
        const dsTypeItem6 = modal
          .locator(".ant-form-item")
          .filter({ hasText: "数据源类型" });
        await selectAntOption(page, dsTypeItem6.locator(".ant-select").first(), "SparkThrift2.x");

        const selectedLocator = dsTypeItem6.locator(".ant-select-selection-item").first();
        await expect(selectedLocator).toHaveText("SparkThrift2.x");
      });

      await step(
        `步骤7: 填写 key=${typeTestKey}，选择数据源类型 Doris3.x，点击确定 → 弹窗关闭，列表新增行数据源类型显示 Doris3.x`,
        async () => {
          await expect(modal).toBeVisible({ timeout: 5000 });

          // 切换到 Doris3.x（当前为 SparkThrift2.x，需切换）
          const dsTypeItem7 = modal
            .locator(".ant-form-item")
            .filter({ hasText: "数据源类型" });
          await selectAntOption(page, dsTypeItem7.locator(".ant-select").first(), "Doris3.x");

          await fillKeyInput(modal, typeTestKey);

          await confirmAndWaitClose(page, modal);

          // 新增后记录可能在非当前页，通过搜索定位。
          await searchKey(page, typeTestKey);
          const newRow = page
            .locator(".ant-table-row")
            .filter({ hasText: typeTestKey })
            .first();
          await expect(newRow).toBeVisible({ timeout: 10000 });
          await expect(newRow).toContainText("Doris3.x");
        },
      );
    } finally {
      await deleteKey(page, typeTestKey).catch(() => {});
    }
  });
});
