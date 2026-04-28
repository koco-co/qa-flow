// META: {"id":"t1","priority":"P0","title":"【P0】验证新增key完整正向流程（含正则测试）"}
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
  confirmAndWaitClose,
  deleteKey,
  searchKey,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P0】验证新增key完整正向流程（含正则测试）", async ({ page, step }) => {
    const keyName = uniqueName("userInfo");
    const chineseName = "用户信息";
    const valueFormat = "^[a-zA-Z]+$";
    const testData = "testValue";

    try {
      // 步骤1：进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成
      const table = page.locator(".ant-table");
      await step(
        "步骤1: 进入json格式校验管理页面 → 页面标题显示「json格式校验管理」，列表正常展示含9列",
        async () => {
          await gotoJsonConfigPage(page);
          await table.waitFor({ state: "visible", timeout: 15000 });
          await expect(page.getByRole("columnheader", { name: "key" })).toBeVisible({ timeout: 5000 });
          await expect(page.getByRole("columnheader", { name: "中文名称" })).toBeVisible({ timeout: 5000 });
          await expect(page.getByRole("columnheader", { name: "value格式" })).toBeVisible({ timeout: 5000 });
          await expect(page.getByRole("columnheader", { name: /数据源类型/ })).toBeVisible({ timeout: 5000 });
          await expect(page.getByRole("columnheader", { name: "创建人" })).toBeVisible({ timeout: 5000 });
          await expect(page.getByRole("columnheader", { name: "创建时间" })).toBeVisible({ timeout: 5000 });
          await expect(page.getByRole("columnheader", { name: "更新人" })).toBeVisible({ timeout: 5000 });
          await expect(page.getByRole("columnheader", { name: "更新时间" })).toBeVisible({ timeout: 5000 });
          await expect(page.getByRole("columnheader", { name: "操作" })).toBeVisible({ timeout: 5000 });
        },
        table,
      );

      // 步骤2：点击列表右上角【新增】按钮，弹出弹窗
      await step(
        "步骤2: 点击【新增】按钮 → 弹出弹窗，包含 key/中文名称/value格式/数据源类型字段，暂不显示测试数据区域",
        async () => {
          await clickHeaderButton(page, "新增");
          const modal = await waitModal(page);
          await expect(
            modal.locator(".ant-form-item").filter({ hasText: /^\*?\s*key$/i }),
          ).toBeVisible({ timeout: 5000 });
          await expect(
            modal.locator(".ant-form-item").filter({ hasText: "中文名称" }),
          ).toBeVisible({ timeout: 5000 });
          await expect(
            modal.locator(".ant-form-item").filter({ hasText: "value格式" }),
          ).toBeVisible({ timeout: 5000 });
          await expect(
            modal.locator(".ant-form-item").filter({ hasText: "数据源类型" }),
          ).toBeVisible({ timeout: 5000 });
          const testDataInput = modal.locator("textarea[id$='testData'], textarea");
          const regexTestBtn = modal.getByRole("button", { name: "正则匹配测试" });
          await expect(testDataInput).toHaveCount(0);
          await expect(regexTestBtn).toHaveCount(0);
        },
        page.locator(".ant-modal:visible"),
      );

      // 步骤3：在新增弹窗中填写表单
      const modal = page.locator(".ant-modal:visible").last();

      await step(
        "步骤3: 填写表单（key/中文名称/value格式/数据源类型=Hive2.x） → 各字段输入正确，value格式填写后动态显示测试数据和正则匹配测试",
        async () => {
          // 先切换数据源类型（切换前其他字段可能被清空，故先切）
          await selectDataSourceType(page, modal, "Hive2.x");
          await fillKeyInput(modal, keyName);
          await fillNameInput(modal, chineseName);
          await fillValueFormat(modal, valueFormat);

          // 验证各字段输入值
          await expect(
            modal
              .locator(".ant-form-item")
              .filter({ hasText: /^\*?\s*key$/i })
              .locator("input")
              .first(),
          ).toHaveValue(keyName, { timeout: 5000 });
          await expect(
            modal
              .locator(".ant-form-item")
              .filter({ hasText: "中文名称" })
              .locator("input")
              .first(),
          ).toHaveValue(chineseName, { timeout: 5000 });
          await expect(
            modal
              .locator(".ant-form-item")
              .filter({ hasText: "value格式" })
              .locator("input")
              .first(),
          ).toHaveValue(valueFormat, { timeout: 5000 });

          // 验证数据源类型已切换为 Hive2.x
          await expect(
            modal
              .locator(".ant-form-item")
              .filter({ hasText: "数据源类型" })
              .locator(".ant-select-selection-item"),
          ).toContainText(/Hive/i, { timeout: 5000 });

          // 验证 value格式 填写后，测试数据输入框和正则匹配测试按钮动态出现
          // RegexTestArea 使用 Input.TextArea，name="testData"，label="测试数据"
          const testDataInput = modal
            .locator("textarea[id$='testData'], textarea")
            .first();
          await expect(testDataInput).toBeVisible({ timeout: 5000 });

          const regexTestBtn = modal
            .getByRole("button", { name: /正则匹配测试/ })
            .or(modal.locator("button").filter({ hasText: /正则.*测试|匹配.*测试/ }))
            .first();
          await expect(regexTestBtn).toBeVisible({ timeout: 5000 });
        },
        modal,
      );

      // 步骤4：在「测试数据」输入框中填写 testValue，点击【正则匹配测试】按钮
      // RegexTestArea 使用 Input.TextArea，name="testData"
      const testDataInput = modal
        .locator("textarea[id$='testData'], textarea")
        .first();
      const regexTestBtn = modal
        .getByRole("button", { name: "正则匹配测试" })
        .first();
      const passResult = modal.getByText("符合正则", { exact: true });

      await step(
        "步骤4: 在测试数据输入框填写 testValue，点击【正则匹配测试】 → 显示匹配结果「匹配成功」",
        async () => {
          await testDataInput.clear();
          await testDataInput.fill(testData);
          await expect(testDataInput).toHaveValue(testData, { timeout: 5000 });
          await regexTestBtn.click();
          await expect(passResult).toBeVisible({ timeout: 10000 });
          await expect(passResult).toContainText("符合正则");
        },
        passResult,
      );

      // 步骤5：点击弹窗【确定】按钮，等待接口响应完成
      await step(
        "步骤5: 点击【确定】 → 弹窗关闭，列表刷新，新增记录出现（数据源类型=hive2.x，中文名称=用户信息，value格式正确）",
        async () => {
          await confirmAndWaitClose(page, modal);
          // 列表数据可能分页，搜索 key 确保能找到新增记录
          await searchKey(page, keyName);
          const newRow = page.locator(".ant-table-row").filter({ hasText: keyName }).first();
          // 验证新增记录出现在列表中
          await expect(newRow).toBeVisible({ timeout: 15000 });
          // 验证数据源类型含 hive
          await expect(newRow).toContainText(/hive/i, { timeout: 5000 });
          // 验证中文名称
          await expect(newRow).toContainText(chineseName, { timeout: 5000 });
          // 验证 value 格式
          await expect(newRow).toContainText(valueFormat, { timeout: 5000 });
          await expect(newRow).toContainText("admin@dtstack.com", { timeout: 5000 });
        },
        page.locator(".ant-table-row").filter({ hasText: keyName }).first(),
      );
    } finally {
      // 清理：先搜索定位 key，再删除，失败不影响测试结论
      await searchKey(page, keyName).catch(() => undefined);
      await deleteKey(page, keyName).catch(() => undefined);
    }
  });
});
