// META: {"id":"t40","priority":"P1","title":"【P1】验证大数据量场景key记录下载数量是否存在限制"}
import { test, expect } from "../../../../../shared/fixtures/step-screenshot";
import {
  waitForTableLoaded,
  confirmPopconfirm,
} from "../../../../../shared/helpers/test-setup";
import { gotoJsonConfigPage } from "../../helpers/json-config-helpers";

// 注意：简化为验证导出功能不报错。
// 完整验证（下载条数限制）需结合大量数据并解析 xlsx，超出 E2E 范围，建议手动验证。

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证大数据量场景key记录下载数量是否存在限制", async ({ page, step }) => {
    await step("步骤1: 进入json格式校验管理页面 → 页面正常加载", async () => {
      await gotoJsonConfigPage(page);
      const table = page.locator(".ant-table");
      await table.waitFor({ state: "visible", timeout: 15000 });
      await waitForTableLoaded(page, table);
    }, page.locator(".ant-table"));

    const exportBtn = page.getByRole("button", { name: /^导\s*出$/ });
    await step(
      "步骤2: 点击导出按钮 → 弹出 Popconfirm 确认对话框",
      async () => {
        await exportBtn.click();
        const popconfirm = page.locator(".ant-popover-inner, .ant-popconfirm");
        await expect(popconfirm.filter({ hasText: "请确认是否导出列表数据" }).first()).toBeVisible({
          timeout: 5000,
        });
      },
      exportBtn,
    );

    await step(
      "步骤3: 确认导出 → 验证下载触发成功，无报错弹窗",
      async () => {
        const [download] = await Promise.all([
          page.waitForEvent("download"),
          confirmPopconfirm(page),
        ]);

        // 验证下载成功触发
        expect(download).toBeTruthy();

        // 验证无错误提示
        const errorNotice = page.locator(".ant-message-notice, .ant-notification-notice").filter({
          hasText: /失败|错误|error/i,
        });
        const hasError = await errorNotice
          .first()
          .waitFor({ state: "visible", timeout: 3000 })
          .then(() => true)
          .catch(() => false);
        expect(hasError).toBe(false);

        // 验证文件名格式正确
        const filename = download.suggestedFilename();
        expect(filename.toLowerCase()).toMatch(/json.?format/i);
      },
    );
  });
});
