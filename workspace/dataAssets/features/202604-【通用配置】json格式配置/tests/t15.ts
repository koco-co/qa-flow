// META: {"id":"t15","priority":"P1","title":"【P1】验证value格式有内容时正则测试控件显示及匹配通过失败场景"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  clickHeaderButton,
  waitModal,
  fillKeyInput,
  fillValueFormat,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证value格式有内容时正则测试控件显示及匹配通过失败场景", { tag: "@serial" }, async ({ page, step }) => {
    const keyName = uniqueName("regexTestKey");

    // 步骤1：进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成
    const table = page.locator(".ant-table");
    await step(
      "步骤1: 进入json格式校验管理页面 → 页面正常加载，列表显示已有key数据",
      async () => {
        await gotoJsonConfigPage(page);
        await table.waitFor({ state: "visible", timeout: 15000 });
        await expect(table).toBeVisible({ timeout: 5000 });
      },
      table,
    );

    // 步骤2：点击【新增】按钮，弹出弹窗；填写 key，value格式保持为空
    await step(
      "步骤2: 点击【新增】按钮，填写key，value格式保持为空 → 弹窗中不显示「测试数据」输入框和「正则匹配测试」按钮",
      async () => {
        await clickHeaderButton(page, "新增");
        const modal = await waitModal(page, "新建");

        await fillKeyInput(modal, keyName);

        // value格式 为空 → 测试数据输入框和正则匹配测试按钮不可见
        const testDataInput = modal
          .locator(".ant-form-item")
          .filter({ hasText: /测试数据/ })
          .locator("input, textarea")
          .first();
        const regexTestBtn = modal.getByRole("button", { name: "正则匹配测试" });

        await expect(testDataInput).toHaveCount(0);
        await expect(regexTestBtn).toHaveCount(0);
      },
      page.locator(".ant-modal:visible"),
    );

    // 以下步骤在弹窗内操作，复用同一 modal locator
    const modal = page.locator(".ant-modal:visible").last();

    // 定义控件 locator（供后续步骤复用）
    const testDataInput = modal
      .locator(".ant-form-item")
      .filter({ hasText: /测试数据/ })
      .locator("input, textarea")
      .first();
    const regexTestBtn = modal.getByRole("button", { name: "正则匹配测试" });

    // 步骤3：在value格式输入框中填写 ^\d{6}$
    await step(
      "步骤3: 在value格式输入框填写 ^\\d{6}$ → 弹窗动态显示「测试数据」输入框和「正则匹配测试」按钮",
      async () => {
        await fillValueFormat(modal, "^\\d{6}$");

        // 填写后控件动态出现
        await expect(testDataInput).toBeVisible({ timeout: 5000 });
        await expect(regexTestBtn).toBeVisible({ timeout: 5000 });
      },
      regexTestBtn,
    );

    // 步骤4：测试数据填 "123456"，点击正则匹配测试 → 匹配成功
    const matchResult = modal.getByText("符合正则", { exact: true });
    await step(
      "步骤4: 在「测试数据」输入框填写 123456，点击【正则匹配测试】 → 显示「匹配成功」",
      async () => {
        await testDataInput.clear();
        await testDataInput.fill("123456");
        await expect(testDataInput).toHaveValue("123456", { timeout: 5000 });
        await regexTestBtn.click();
        await expect(matchResult).toBeVisible({ timeout: 10000 });
        await expect(matchResult).toContainText("符合正则");
      },
      matchResult,
    );

    // 步骤5：清空测试数据，填 "abcdef"，再次点击正则匹配测试 → 匹配失败
    const failResult = modal.getByText("不符合正则", { exact: true });
    await step(
      "步骤5: 清空「测试数据」输入框，填写 abcdef，点击【正则匹配测试】 → 显示「匹配失败」",
      async () => {
        await testDataInput.clear();
        await testDataInput.fill("abcdef");
        await expect(testDataInput).toHaveValue("abcdef", { timeout: 5000 });
        await regexTestBtn.click();
        await expect(failResult).toBeVisible({ timeout: 10000 });
        await expect(failResult).toContainText("不符合正则");
      },
      failResult,
    );

    // 步骤6：清空value格式输入框 → 测试数据输入框和正则匹配测试按钮再次隐藏
    await step(
      "步骤6: 清空value格式输入框 → 「测试数据」输入框和「正则匹配测试」按钮隐藏",
      async () => {
        // 使用 triple-click + Delete 确保清空（避免 clear() 在 React 受控输入框失效）
        const valueInput = modal
          .locator(".ant-form-item")
          .filter({ hasText: "value格式" })
          .locator("input")
          .first();
        await valueInput.click({ clickCount: 3 });
        await valueInput.press("Delete");
        await valueInput.press("Backspace");
        await expect(valueInput).toHaveValue("", { timeout: 5000 });

        // 清空后控件隐藏
        await expect(testDataInput).toHaveCount(0, { timeout: 5000 });
        await expect(regexTestBtn).toHaveCount(0, { timeout: 5000 });
      },
      modal.locator(".ant-form-item").filter({ hasText: "value格式" }).locator("input").first(),
    );

    // 步骤7（收尾）：关闭弹窗（点取消）
    await step(
      "步骤7: 关闭弹窗 → 弹窗关闭，返回列表页",
      async () => {
        const cancelBtn = modal
          .locator(".ant-modal-footer button")
          .filter({ hasText: /取\s*消/ })
          .first();
        if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await cancelBtn.click();
        } else {
          await page.keyboard.press("Escape");
        }
        await expect(modal).not.toBeVisible({ timeout: 8000 });
      },
    );
  });
});
