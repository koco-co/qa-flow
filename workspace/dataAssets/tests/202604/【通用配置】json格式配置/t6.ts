// META: {"id":"t6","priority":"P1","title":"【P1】验证新增key表单中切换数据源类型后其余字段保持不变"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  clickHeaderButton,
  waitModal,
  fillKeyInput,
  fillNameInput,
  fillValueFormat,
  selectDataSourceType,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证新增key表单中切换数据源类型后其余字段保持不变", async ({ page, step }) => {
    test.setTimeout(90000);
    const switchTestKey = uniqueName("switchTest");

    await step("步骤1: 进入json格式校验管理页面 → 页面正常加载，列表加载完成", async () => {
      await gotoJsonConfigPage(page);
      await expect(
        page.locator(".json-format-check").first(),
      ).toBeVisible({ timeout: 15000 });
    });

    await step(
      "步骤2: 点击新增按钮，填写 key、中文名称、value格式（数据源类型保持默认 SparkThrift2.x） → 各字段显示已填写内容",
      async () => {
        await clickHeaderButton(page, "新增");
        const modal = await waitModal(page, "新建");
        // 等待表单完全渲染（包括 setFieldsValue 设置默认数据源类型）
        await page.waitForTimeout(500);

        await fillKeyInput(modal, switchTestKey);
        await fillNameInput(modal, "切换测试");
        await fillValueFormat(modal, "^[a-z]+$");

        // 断言 key 已填入
        await expect(
          modal.locator("input#jsonKey").first(),
        ).toHaveValue(switchTestKey, { timeout: 5000 });

        // 断言中文名称已填入（Ant Design Form name="name"，input id 以 _name 或 name 结尾）
        await expect(
          modal.locator("input[id$='name']").first(),
        ).toHaveValue("切换测试", { timeout: 5000 });

        // 断言 value 格式已填入（Form name="value"）
        await expect(
          modal.locator("input[id$='value']").first(),
        ).toHaveValue("^[a-z]+$", { timeout: 5000 });

        // 断言数据源类型默认值为 SparkThrift2.x
        await expect(
          modal.locator(".ant-select-selection-item").first(),
        ).toHaveText("SparkThrift2.x", { timeout: 5000 });
      },
    );

    await step(
      "步骤3: 将数据源类型切换为 Hive2.x → 数据源类型显示 Hive2.x，key、中文名称、value格式保持原值不变",
      async () => {
        const modal = await waitModal(page);
        await selectDataSourceType(page, modal, "Hive2.x");

        // 断言数据源类型已切换（selectDataSourceType 内部已验证，此处双保险）
        await expect(
          modal.locator(".ant-select-selection-item").first(),
        ).toHaveText("Hive2.x", { timeout: 5000 });

        // 断言 key 保持原值（切换数据源类型不清空其他字段）
        await expect(
          modal.locator("input#jsonKey").first(),
        ).toHaveValue(switchTestKey, { timeout: 5000 });

        // 断言中文名称保持原值
        await expect(
          modal.locator("input[id$='name']").first(),
        ).toHaveValue("切换测试", { timeout: 5000 });

        // 断言 value 格式保持原值
        await expect(
          modal.locator("input[id$='value']").first(),
        ).toHaveValue("^[a-z]+$", { timeout: 5000 });

        // 关闭弹窗，不提交
        await page.keyboard.press("Escape");
        await modal.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      },
    );
  });
});
