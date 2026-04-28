// META: {"id":"t3","priority":"P1","title":"【P1】验证新增key时key字段输入超255字符不可提交"}
import { test, expect } from "../../../shared/fixtures/step-screenshot";
import {
  gotoJsonConfigPage,
  clickHeaderButton,
  waitModal,
  fillKeyInput,
  clickModalConfirm,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证新增key时key字段输入超255字符不可提交", async ({ page, step }) => {
    await step("步骤1: 进入json格式校验管理页面 → 页面正常加载，列表加载完成", async () => {
      await gotoJsonConfigPage(page);
      await expect(page.locator(".json-format-check")).toBeVisible({ timeout: 15000 });
    });

    await step("步骤2: 点击【新增】按钮 → 新建弹窗出现", async () => {
      await clickHeaderButton(page, "新增");
    });

    const modal = await waitModal(page, "新建");

    await step("步骤3: 在key输入框输入256个字符并点击确定 → 表单校验触发，key字段显示超长错误", async () => {
      await fillKeyInput(modal, "a".repeat(256));
      await clickModalConfirm(modal);

      // Ant Design 校验错误以 role=alert 渲染，比 .ant-form-item-explain-error 更稳定
      const keyErrorLocator = modal
        .locator('[role="alert"]')
        .filter({ hasText: "key长度不能超过255个字符" })
        .first();

      await keyErrorLocator.waitFor({ state: "visible", timeout: 8000 });
      await expect(keyErrorLocator).toContainText("255");
    }, modal
      .locator('[role="alert"]')
      .filter({ hasText: "key长度不能超过255个字符" })
      .first());

    const modalLocator = page.locator(".ant-modal:visible").last();
    await step("步骤4: 验证弹窗仍可见（未关闭）→ 弹窗未关闭，数据未提交", async () => {
      await expect(modalLocator).toBeVisible({ timeout: 3000 });
    }, modalLocator);
  });
});
