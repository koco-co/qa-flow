// META: {"id":"t19","priority":"P1","title":"【P1】验证重复处理规则「重复则跳过」对已存在key不覆盖"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import { gotoJsonConfigPage, addKey, deleteKey, searchKey } from "./json-config-helpers";
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
  });
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证重复处理规则「重复则跳过」对已存在key不覆盖", async ({ page, step }) => {
    const skipKey = uniqueName("skipKey");
    const xlsxPath = path.join("/tmp", `t19_${Date.now()}.xlsx`);

    try {
      // 步骤1：前置 - 新增 skipKey 记录（value格式 ^[a-z]+$）
      await step(
        "步骤1: 进入json格式校验管理页面，新增 skipKey 记录(value=^[a-z]+$) → 新增成功",
        async () => {
          await gotoJsonConfigPage(page);
          await addKey(page, skipKey, { valueFormat: "^[a-z]+$" });
        },
      );

      // 步骤2：刷新页面，确认 skipKey 行 value 格式为 ^[a-z]+$
      const skipRow = page.locator(".ant-table-row").filter({ hasText: skipKey }).first();
      await step(
        "步骤2: 刷新页面，断言 skipKey 行 value格式显示 ^[a-z]+$ → value格式正确",
        async () => {
          await page.reload();
          await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
          await searchKey(page, skipKey);
          await skipRow.waitFor({ state: "visible", timeout: 15000 });
          await expect(skipRow).toContainText("^[a-z]+$");
        },
        skipRow,
      );

      // 步骤3：准备导入 xlsx，一层 sheet 含 skipKey，value 格式 ^[A-Z]+$
      await step(
        "步骤3: 创建导入xlsx文件(一层Sheet含 skipKey，value=^[A-Z]+$) → 文件创建成功",
        async () => {
          await createImportXlsx(xlsxPath, [
            {
              name: "一层",
              headers: ["*key", "中文名称", "value格式"],
              rows: [[skipKey, "跳过键", "^[A-Z]+$"]],
            },
          ]);
          expect(fs.existsSync(xlsxPath)).toBe(true);
        },
      );

      // 步骤4：导入 xlsx，重复处理规则使用默认值「重复则跳过」
      await importXlsx(page, step, xlsxPath, "重复则跳过");

      // 步骤5：断言 skipKey 行 value 格式仍为 ^[a-z]+$，未被覆盖
      const skipRowAfter = page.locator(".ant-table-row").filter({ hasText: skipKey }).first();
      await step(
        "步骤5: 断言 skipKey 行 value格式仍为 ^[a-z]+$，未被 ^[A-Z]+$ 覆盖 → value格式未变更",
        async () => {
          await searchKey(page, skipKey);
          await skipRowAfter.waitFor({ state: "visible", timeout: 15000 });
          await expect(skipRowAfter).toContainText("^[a-z]+$");
          await expect(skipRowAfter).not.toContainText("^[A-Z]+$");
        },
        skipRowAfter,
      );
    } finally {
      // 清理：删除测试数据和 xlsx 文件
      await deleteKey(page, skipKey).catch(() => {});
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    }
  });
});
