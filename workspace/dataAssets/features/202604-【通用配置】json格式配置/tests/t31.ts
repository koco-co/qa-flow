// META: {"id":"t31","priority":"P1","title":"【P1】验证导入功能正常(重复则跳过, 1层key已存在 -> 跳过不变)"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  deleteKey,
  searchKey,
  ensureRowVisibleByKey,
} from "./json-config-helpers";
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
  test("【P1】验证导入功能正常(重复则跳过, 1层key已存在 -> 跳过不变)", async ({ page, step }) => {
    const skipExist1 = uniqueName("skipExist1");
    const xlsxPath = path.join("/tmp", `t31_${Date.now()}.xlsx`);

    try {
      // 步骤1：前置 - 新增 skipExist1 记录（value格式 ^[a-z]+$，中文名称「原始键」）
      await step(
        "步骤1: 前置-新增skipExist1记录(value格式=^[a-z]+$, 中文名称=原始键) → 新增成功",
        async () => {
          await gotoJsonConfigPage(page);
          await addKey(page, skipExist1, { valueFormat: "^[a-z]+$", chineseName: "原始键" });
        },
      );

      // 步骤2：刷新页面，确认 skipExist1 行 value 格式和中文名称正确
      const skipRow = page.locator(".ant-table-row").filter({ hasText: skipExist1 }).first();
      await step(
        "步骤2: 刷新页面，验证skipExist1行value格式显示^[a-z]+$，中文名称显示「原始键」 → 数据正确",
        async () => {
          await gotoJsonConfigPage(page);
          await ensureRowVisibleByKey(page, skipExist1, 20000);
          await expect(skipRow).toBeVisible({ timeout: 10000 });
          await expect(skipRow).toContainText("^[a-z]+$");
          await expect(skipRow).toContainText("原始键");
        },
        skipRow,
      );

      // 步骤3：创建导入 xlsx，一层 sheet 含 skipExist1，中文名称「修改键」，value 格式 ^[A-Z]+$
      await step(
        "步骤3: 创建xlsx文件(一层Sheet含skipExist1，中文名称=修改键，value格式=^[A-Z]+$) → 文件创建成功",
        async () => {
          await createImportXlsx(xlsxPath, [
            {
              name: "一层",
              headers: ["*key", "中文名称", "value格式"],
              rows: [[skipExist1, "修改键", "^[A-Z]+$"]],
            },
          ]);
          expect(fs.existsSync(xlsxPath)).toBe(true);
        },
      );

      // 步骤4：导入 xlsx，重复处理规则使用默认值「重复则跳过」
      await importXlsx(page, step, xlsxPath, "重复则跳过");

      // 步骤5：断言 skipExist1 行 value 格式仍为 ^[a-z]+$，中文名称仍为「原始键」，未被修改
      const skipRowAfter = page.locator(".ant-table-row").filter({ hasText: skipExist1 }).first();
      await step(
        "步骤5: 验证skipExist1行value格式仍为^[a-z]+$，中文名称仍为「原始键」，未被跳过规则修改 → 跳过生效，数据不变",
        async () => {
          await gotoJsonConfigPage(page);
          await ensureRowVisibleByKey(page, skipExist1, 20000);
          await expect(skipRowAfter).toBeVisible({ timeout: 10000 });
          await expect(skipRowAfter).toContainText("^[a-z]+$");
          await expect(skipRowAfter).not.toContainText("^[A-Z]+$");
          await expect(skipRowAfter).toContainText("原始键");
          await expect(skipRowAfter).not.toContainText("修改键");
        },
        skipRowAfter,
      );
    } finally {
      // 清理：删除测试数据和 xlsx 文件
      await deleteKey(page, skipExist1).catch(() => {});
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    }
  });
});
