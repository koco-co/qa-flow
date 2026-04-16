// META: {"id":"t36","priority":"P0","title":"【P0】验证导出列表数据完整流程及文件命名"}
import { test, expect } from "../../fixtures/step-screenshot";
import {
  waitForTableLoaded,
  confirmPopconfirm,
} from "../../helpers/test-setup";


const BASE_URL =
  "http://shuzhan63-test-ltqc.k8s.dtstack.cn/dataAssets/#/dq/generalConfig/jsonValidationConfig";

async function dismissWelcomeDialog(page: import("@playwright/test").Page) {
  const dialog = page.locator("dialog, .ant-modal").filter({ hasText: "欢迎使用" });
  if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    const btn = dialog.getByRole("button", { name: "知道了" });
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    }
  }
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P0】验证导出列表数据完整流程及文件命名", async ({ page, step }) => {
    await step("步骤1: 进入json格式校验管理页面，确保有数据 → 页面正常加载，表格有数据", async () => {
      await page.goto(BASE_URL);
      await page.waitForLoadState("networkidle");
      await dismissWelcomeDialog(page);
      const table = page.locator(".ant-table");
      await table.waitFor({ state: "visible", timeout: 15000 });
      await waitForTableLoaded(page, table);
      // 确保表格有至少一行数据
      const rows = page.locator(".ant-table-tbody .ant-table-row");
      await expect(rows.first()).toBeVisible({ timeout: 10000 });
    }, page.locator(".ant-table"));

    const exportBtn = page.getByRole("button", { name: /^导\s*出$/ });
    await step(
      "步骤2: 点击【导出】按钮 → 弹出 Popconfirm「请确认是否导出列表数据」",
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
      "步骤3: 监听下载事件，点击确认 → 下载触发成功，文件名包含 json_format",
      async () => {
        const [download] = await Promise.all([
          page.waitForEvent("download"),
          confirmPopconfirm(page),
        ]);

        // 验证下载成功
        expect(download).toBeTruthy();

        // 验证文件名包含 json_format
        const filename = download.suggestedFilename();
        expect(filename.toLowerCase()).toMatch(/json.?format/i);
      },
    );
  });
});
