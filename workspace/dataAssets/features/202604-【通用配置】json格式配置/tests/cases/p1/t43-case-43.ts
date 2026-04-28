// META: {"id":"t43","priority":"P1","title":"【P1】验证导入失败时仅出现单个错误通知"}
import { test, expect } from "../../../../../shared/fixtures/step-screenshot";
import { gotoJsonConfigPage } from "../../helpers/json-config-helpers";
import ExcelJS from "exceljs";
import * as fs from "fs";
import * as path from "path";

async function createInvalidImportXlsx(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("一层");
  worksheet.addRow(["*key", "中文名称", "value格式"]);
  worksheet.addRow(["b".repeat(256), "超限测试", ""]);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await workbook.xlsx.writeFile(filePath);
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证导入失败时仅出现单个错误通知", { tag: "@serial" }, async ({ page, step }) => {
    const filePath = path.join("/tmp", `t43_${Date.now()}.xlsx`);

    try {
      await step("步骤1: 进入页面并准备非法导入文件 → 页面正常加载，xlsx 文件创建成功", async () => {
        await gotoJsonConfigPage(page);
        await createInvalidImportXlsx(filePath);
        expect(fs.existsSync(filePath)).toBe(true);
        await expect(page.locator(".ant-notification-notice")).toHaveCount(0);
      });

      await step("步骤2: 点击【导入】并上传非法文件 → 导入弹窗正常打开", async () => {
        await page.getByRole("button", { name: /^导\s*入$/ }).click();
        const modal = page.locator(".ant-modal:visible").last();
        await modal.waitFor({ state: "visible", timeout: 10000 });
        await modal.locator('input[type="file"]').setInputFiles(filePath);
        await modal.getByRole("button", { name: /^确\s*定$/ }).click();
      });

      await step("步骤3: 等待导入失败反馈 → 页面仅出现单个导入失败通知", async () => {
        const notificationNotices = page.locator(".ant-notification-notice");
        await expect(notificationNotices.filter({ hasText: "导入失败" }).first()).toBeVisible({
          timeout: 10000,
        });
        let maxNotificationCount = 0;
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          maxNotificationCount = Math.max(
            maxNotificationCount,
            await notificationNotices.count(),
          );
          await page.waitForTimeout(200);
        }
        expect(maxNotificationCount).toBeLessThanOrEqual(1);
        await expect(page.locator(".ant-message-notice")).toHaveCount(0);
      });
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });
});
