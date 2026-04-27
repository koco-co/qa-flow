// META: {"id":"t1","priority":"P0","title":"【P0】验证新增key完整正向流程（含正则测试）"}
import { expect, test } from "../../fixtures/step-screenshot";
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
  ensureRowVisibleByKey,
  deleteKey,
} from "./json-config-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

const SUITE_NAME = "【通用配置】json格式配置(#15696)";
const PAGE_NAME = "json格式校验管理";

test.describe(`${SUITE_NAME} - ${PAGE_NAME}`, () => {
  const keyName = uniqueName("json_config_p0_t1");

  test.afterEach(async ({ page }) => {
    await deleteKey(page, keyName).catch(() => undefined);
  });

  test("验证新增key完整正向流程（含正则测试）", async ({ page, step }) => {
    await step("步骤1: 进入json格式校验管理页面，等待列表加载完成", async () => {
      await gotoJsonConfigPage(page);
      const container = page.locator(".json-format-check");
      await expect(container).toBeVisible({ timeout: 15000 });
      // 验证列头存在
      const tableHeader = page.locator(".ant-table-thead");
      await expect(tableHeader).toBeVisible({ timeout: 10000 });
      await expect(tableHeader).toContainText("key");
      await expect(tableHeader).toContainText("中文名称");
      await expect(tableHeader).toContainText("value格式");
      await expect(tableHeader).toContainText("数据源类型");
      await expect(tableHeader).toContainText("创建人");
      await expect(tableHeader).toContainText("操作");
    });

    let modal!: import("@playwright/test").Locator;

    await step("步骤2: 点击【新增】按钮，验证弹窗出现，标题为「新建」", async () => {
      await clickHeaderButton(page, "新增");
      modal = await waitModal(page, "新建");
      // 验证弹窗内字段
      await expect(modal).toContainText("数据源类型");
      await expect(modal).toContainText("key");
      await expect(modal).toContainText("中文名称");
      await expect(modal).toContainText("value格式");
      // 未填 value格式 时，【正则匹配测试】按钮不显示
      const regexBtn = modal.getByRole("button", { name: /正则匹配测试/ });
      const regexBtnVisible = await regexBtn.isVisible({ timeout: 1000 }).catch(() => false);
      expect(regexBtnVisible).toBe(false);
    });

    await step("步骤3: 填写表单（数据源类型=hive2.x, key=uniqueName, 中文名称=用户信息, value格式=^[a-zA-Z]+$），验证value格式填写后正则测试控件显现", async () => {
      await selectDataSourceType(page, modal, "Hive2.x");
      await fillKeyInput(modal, keyName);
      await fillNameInput(modal, "用户信息");
      await fillValueFormat(modal, "^[a-zA-Z]+$");

      // 验证：填写 value格式 后动态显示「测试数据」输入框和【正则匹配测试】按钮
      const regexTestBtn = modal.getByRole("button", { name: /正则匹配测试/ });
      await expect(regexTestBtn).toBeVisible({ timeout: 5000 });

      // 验证测试数据相关 UI 已显现（正则测试按钮可见即代表测试数据行出现）
      // 不单独 assert testDataFormItem，因为 label 文本渲染方式可能不触发 hasText filter
    });

    await step("步骤4: 在测试数据输入框填写 testValue，点击【正则匹配测试】，验证结果为「符合正则」", async () => {
      // 「测试数据」输入框在 value格式 填写后动态渲染。
      // 使用 page 全局定位（不依赖 modal locator 引用），避免 stale 问题。
      const regexTestBtn = page.locator(".ant-modal:visible").last().getByRole("button", { name: /正则匹配测试/ });
      await expect(regexTestBtn).toBeVisible({ timeout: 10000 });

      // 定位测试数据输入框：按 label 文本找 form-item，再找其中的 input 或 textarea
      const visibleModal = page.locator(".ant-modal:visible").last();
      // 测试数据输入框可能是 input 或 textarea；直接定位可见弹窗内最后一个可见 input/textarea
      // （测试数据在 value格式 之后渲染，是弹窗内最后一个输入控件）
      const testDataInput = visibleModal.locator("input:visible, textarea:visible").last();
      await expect(testDataInput).toBeVisible({ timeout: 10000 });
      await testDataInput.fill("testValue");

      await regexTestBtn.click();

      // 验证匹配结果显示「符合正则」
      await expect(visibleModal).toContainText("符合正则", { timeout: 10000 });
    });

    await step("步骤5: 点击【确定】，等待弹窗关闭，验证列表中出现新增的key", async () => {
      await confirmAndWaitClose(page, modal);

      // 验证列表中出现新增的 key 行
      const row = await ensureRowVisibleByKey(page, keyName, 15000);
      await expect(row).toBeVisible();

      // 验证行内数据源类型为 Hive2.x（显示为首字母大写）
      await expect(row).toContainText("Hive2.x");
      // 验证中文名称
      await expect(row).toContainText("用户信息");
      // 验证 value格式
      await expect(row).toContainText("^[a-zA-Z]+$");
    });
  });
});
