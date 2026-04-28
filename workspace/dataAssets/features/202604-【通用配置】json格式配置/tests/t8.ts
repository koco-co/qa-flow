// META: {"id":"t8","priority":"P1","title":"【P1】验证新增子层级完整流程"}
import { test, expect } from "../../../shared/fixtures/step-screenshot";
import { uniqueName } from "../../../shared/helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  waitModal,
  fillKeyInput,
  fillNameInput,
  fillValueFormat,
  confirmAndWaitClose,
  expandRow,
  deleteKey,
  searchKey,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证新增子层级完整流程", async ({ page, step }) => {
    const parentKey = uniqueName("parentKey");
    const childKey = uniqueName("childKey");
    const childChineseName = "子层级键";
    const childValueFormat = "^[0-9]+$";

    try {
      // 步骤1：进入页面并加载前置数据
      const table = page.locator(".ant-table");
      await step(
        "步骤1: 进入json格式校验管理页面，创建前置 parentKey 记录 → 页面正常加载，列表显示 parentKey 记录",
        async () => {
          await gotoJsonConfigPage(page);
          await table.waitFor({ state: "visible", timeout: 15000 });
          // 前置：创建第一层 key
          await addKey(page, parentKey);
          await searchKey(page, parentKey);
          const parentRow = page
            .locator(".ant-table-row")
            .filter({ hasText: parentKey })
            .first();
          await expect(parentRow).toBeVisible({ timeout: 15000 });
        },
        table,
      );

      // 步骤2：点击 parentKey 行的【新增子层级】按钮，弹窗出现后断言字段
      const modal = page.locator(".ant-modal:visible").last();
      await step(
        "步骤2: 在 parentKey 行点击操作列【新增子层级】 → 弹出弹窗，包含 key/中文名称/value格式 字段，不含数据源类型",
        async () => {
          const parentRow = page
            .locator(".ant-table-row")
            .filter({ hasText: parentKey })
            .first();
          await parentRow
            .locator(".ant-btn-link")
            .filter({ hasText: "新增子层级" })
            .click();

          // 等待弹窗动画结束
          await waitModal(page);

          // 断言弹窗含 key、中文名称、value格式 三个 form-item label
          const formItems = modal.locator(".ant-form-item");
          const keyItem = formItems.filter({ hasText: /^\*?\s*key$/i });
          const nameItem = formItems.filter({ hasText: "中文名称" });
          const valueItem = formItems.filter({ hasText: "value格式" });
          await expect(keyItem).toBeVisible({ timeout: 5000 });
          await expect(nameItem).toBeVisible({ timeout: 5000 });
          await expect(valueItem).toBeVisible({ timeout: 5000 });

          // 断言弹窗不含数据源类型字段
          const dsItem = formItems.filter({ hasText: "数据源类型" });
          await expect(dsItem).toHaveCount(0, { timeout: 3000 });
        },
        modal,
      );

      // 步骤3：填写子层级表单并提交
      await step(
        "步骤3: 填写 key=childKey、中文名称=子层级键、value格式=^[0-9]+$，点击确定 → 弹窗关闭，列表刷新",
        async () => {
          await fillKeyInput(modal, childKey);
          await fillNameInput(modal, childChineseName);
          await fillValueFormat(modal, childValueFormat);
          await confirmAndWaitClose(page, modal);
        },
      );

      // 步骤4：展开 parentKey 行，断言子层级记录可见
      const childRow = page
        .locator(".ant-table-row")
        .filter({ hasText: childKey });

      await step(
        "步骤4: 展开 parentKey 行，验证子层级记录可见 → 子行含正确中文名称和 value 格式",
        async () => {
          await expandRow(page, parentKey);
          await expect(childRow.first()).toBeVisible({ timeout: 10000 });
          await expect(childRow.first()).toContainText(childChineseName, {
            timeout: 5000,
          });
          await expect(childRow.first()).toContainText(childValueFormat, {
            timeout: 5000,
          });
        },
        childRow.first(),
      );
    } finally {
      // 清理：删除 parentKey（级联删除子层级）
      await deleteKey(page, parentKey).catch(() => undefined);
    }
  });
});
