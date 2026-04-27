// META: {"id":"t3","priority":"P0","title":"【P0】验证导出列表数据完整流程及文件命名"}
import { expect, test } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  clickHeaderButton,
  addKey,
  deleteKey,
  ensureRowVisibleByKey,
} from "./json-config-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

const SUITE_NAME = "【通用配置】json格式配置(#15696)";
const PAGE_NAME = "json格式校验管理";

test.describe(`${SUITE_NAME} - ${PAGE_NAME}`, () => {
  const exportKey1 = uniqueName("json_cfg_exp1");
  const exportKey2 = uniqueName("json_cfg_exp2");

  test.beforeEach(async ({ page }) => {
    // 前置条件：创建两条测试记录，确保导出列表中有数据
    await gotoJsonConfigPage(page);
    await addKey(page, exportKey1, {
      chineseName: "导出测试1",
      dataSourceType: "SparkThrift2.x",
    });
    await addKey(page, exportKey2, {
      chineseName: "导出测试2",
      dataSourceType: "Hive2.x",
    });
  });

  test.afterEach(async ({ page }) => {
    await deleteKey(page, exportKey1).catch(() => undefined);
    await deleteKey(page, exportKey2).catch(() => undefined);
  });

  test("验证导出列表数据完整流程及文件命名", async ({ page, step }) => {
    await step("步骤1: 进入json格式校验管理页面，等待列表加载完成（含前置数据）", async () => {
      await gotoJsonConfigPage(page);
      await expect(page.locator(".json-format-check")).toBeVisible({ timeout: 15000 });

      // 验证前置数据在列表中
      await ensureRowVisibleByKey(page, exportKey1, 15000);
      await ensureRowVisibleByKey(page, exportKey2, 15000);
    });

    await step("步骤2: 点击【导出】按钮，验证 Popconfirm 出现，提示文本正确", async () => {
      await clickHeaderButton(page, "导出");

      // 等待 Popconfirm 出现
      const popconfirm = page.locator(".ant-popover:visible, .ant-popconfirm:visible").last();
      await expect(popconfirm).toBeVisible({ timeout: 10000 });

      // 验证提示文本
      await expect(popconfirm).toContainText("请确认是否导出列表数据");

      // 验证含【确认】和【取消】按钮
      const confirmBtn = popconfirm.getByRole("button", { name: /确\s*[认定]/ }).first();
      await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    });

    await step("步骤3: 点击 Popconfirm 中的【确认】，等待文件下载，验证文件命名格式", async () => {
      const popconfirm = page.locator(".ant-popover:visible, .ant-popconfirm:visible").last();
      const confirmBtn = popconfirm.getByRole("button", { name: /确\s*[认定]/ }).first();

      // 监听 download 事件
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 60000 }),
        confirmBtn.click(),
      ]);

      // 验证文件命名格式：json_format_YYYYMMDD.xlsx
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/^json_format_\d{8}\.xlsx$/);

      // 验证文件命名中的日期为今天
      const today = new Date();
      const yyyy = today.getFullYear().toString();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const expectedDateStr = `${yyyy}${mm}${dd}`;
      expect(filename).toContain(expectedDateStr);
    });
  });
});
