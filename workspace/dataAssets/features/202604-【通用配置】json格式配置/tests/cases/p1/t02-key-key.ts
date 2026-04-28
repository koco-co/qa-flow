// META: {"id":"t2","priority":"P1","title":"【P1】验证新增key时key字段为空不可提交"}
import { test, expect } from "../../../../../shared/fixtures/step-screenshot";
import {
  gotoJsonConfigPage,
  clickHeaderButton,
  waitModal,
  clickModalConfirm,
} from "../../helpers/json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证新增key时key字段为空不可提交", async ({ page, step }) => {
    await step("步骤1: 进入json格式校验管理页面 → 页面正常加载，列表显示已有key数据行", async () => {
      await gotoJsonConfigPage(page);
      await expect(
        page.locator(".json-format-check").first(),
      ).toBeVisible({ timeout: 15000 });
    });

    await step("步骤2: 点击【新增】按钮 → 新建弹窗出现", async () => {
      await clickHeaderButton(page, "新增");
    });

    const modal = await waitModal(page, "新建");

    await step(
      "步骤3: key留空，点击【确定】按钮 → 表单校验触发，key字段下方显示「请输入key」，弹窗不关闭",
      async () => {
        // key 字段保持留空，直接提交
        await clickModalConfirm(modal);

        // 等待表单校验错误出现
        // 校验错误以 role=alert 渲染在 key 字段的 .ant-form-item-explain 区域内
        const keyErrorLocator = modal
          .locator('[role="alert"]')
          .filter({ hasText: "请输入key" })
          .first();

        await keyErrorLocator.waitFor({ state: "visible", timeout: 8000 });
        await expect(keyErrorLocator).toContainText("请输入");

        // 断言弹窗仍可见（未关闭）
        await expect(modal).toBeVisible();
      },
      modal
        .locator('[role="alert"]')
        .filter({ hasText: "请输入key" })
        .first(),
    );
  });
});
