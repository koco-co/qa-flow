// META: {"id":"t35","priority":"P1","title":"【P1】验证导入功能正常(重复则跳过, 2~5层上一层key不存在 -> 报错)"}
import { test, expect } from "../../fixtures/step-screenshot";
import {
  uniqueName,
} from "../../helpers/test-setup";
import { gotoJsonConfigPage } from "./json-config-helpers";
import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";

async function createImportXlsx(
  filePath: string,
  sheets: { name: string; headers: string[]; rows: string[][] }[],
) {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);
    ws.addRow(sheet.headers);
    for (const row of sheet.rows) ws.addRow(row);
  }
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await workbook.xlsx.writeFile(filePath);
}

async function importXlsx(
  page: import("@playwright/test").Page,
  step: Function,
  filePath: string,
  duplicateRule: "重复则跳过" | "重复则覆盖更新" = "重复则跳过",
) {
  await step(`步骤0: 执行导入操作（${duplicateRule}） → 导入流程提交完成`, async () => {
    await page.getByRole("button", { name: /^导\s*入$/ }).click();
    const modal = page.locator(".ant-modal:visible");
    await modal.waitFor({ state: "visible" });
    if (duplicateRule === "重复则覆盖更新") {
      await modal.locator(".ant-radio-wrapper").filter({ hasText: "重复则覆盖更新" }).click();
    }
    const fileInput = modal.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(1000);
    await modal.getByRole("button", { name: /^确\s*定$/ }).click();
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
      await dismissWelcomeDialog(page);
  });
}

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
  test("【P1】验证导入功能正常(重复则跳过, 2~5层上一层key不存在 -> 报错)", async ({ page, step }) => {
    // 使用固定的不存在父级名 noParent（不加 uniqueName，确保系统中不存在）
    const noParent = "noParent_" + Date.now();
    const orphanKey2 = uniqueName("orphanKey2");
    // 一层有 someKey，二层上一层级 key = noParent（不存在）
    const someKey = uniqueName("someKey");
    const xlsxPath = path.join("/tmp", `t35_${Date.now()}.xlsx`);

    try {
      await step("步骤1: 进入json格式校验管理页面 → 页面正常加载", async () => {
        await gotoJsonConfigPage(page);
        await expect(
          page.locator(".ant-table, .json-format-check, .json-validation-config, [class*='jsonValid']").first(),
        ).toBeVisible({ timeout: 15000 });
      });

      await step(
        "步骤2: 创建xlsx，一层Sheet含 someKey；二层Sheet上一层级key=noParent(不存在)/orphanKey2 → 文件创建成功",
        async () => {
          await createImportXlsx(xlsxPath, [
            {
              name: "一层",
              headers: ["key", "中文名称", "value格式"],
              rows: [[someKey, "某个键", ""]],
            },
            {
              name: "二层",
              headers: ["上一层级key", "key", "中文名称", "value格式"],
              rows: [[noParent, orphanKey2, "孤立子键", ""]],
            },
          ]);
          expect(fs.existsSync(xlsxPath)).toBe(true);
        },
      );

      await step(
        "步骤3: 导入xlsx(默认重复则跳过) → 提示错误（上一层级key不存在）",
        async () => {
          await importXlsx(page, step, xlsxPath, "重复则跳过");

          // 验证错误提示出现：Message 或 Notification 中包含错误信息
          const errorVisible = await page
            .locator(".ant-message-notice, .ant-notification-notice")
            .filter({ hasText: /错误|不存在|失败/ })
            .first()
            .waitFor({ state: "visible", timeout: 10000 })
            .then(() => true)
            .catch(() => false);

          if (!errorVisible) {
            // fallback: 导入弹窗内显示错误信息（下载错误报告按钮或错误文案）
            const downloadErrBtn = page
              .locator("button, a")
              .filter({ hasText: /下载|错误|报告/ })
              .first();
            const hasDownloadBtn = await downloadErrBtn
              .waitFor({ state: "visible", timeout: 5000 })
              .then(() => true)
              .catch(() => false);
            expect(hasDownloadBtn).toBe(true);
          }
        },
      );
    } finally {
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    }
  });
});
