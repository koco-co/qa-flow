// META: {"id":"t28","priority":"P1","title":"【P1】验证导入功能正常(重复则覆盖更新, 2~5层上一层key存在+key不存在 -> 新增N层key)"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  expandRow,
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
): Promise<void> {
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

async function dismissWelcomeDialog(page: import("@playwright/test").Page): Promise<void> {
  const dialog = page.locator("dialog, .ant-modal").filter({ hasText: "欢迎使用" });
  if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    const btn = dialog.getByRole("button", { name: "知道了" });
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    }
  }
}

async function importXlsx(
  page: import("@playwright/test").Page,
  step: Function,
  filePath: string,
  duplicateRule: "重复则跳过" | "重复则覆盖更新" = "重复则跳过",
): Promise<void> {
  await step(`导入xlsx (${duplicateRule})`, async () => {
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

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证导入功能正常(重复则覆盖更新, 2~5层上一层key存在+key不存在 -> 新增N层key)", async ({ page, step }) => {
    const parentB = uniqueName("parentB");
    const newChild1 = uniqueName("newChild1");
    const xlsxPath = path.join("/tmp", `t28_${Date.now()}.xlsx`);

    try {
      // 步骤1：前置-新增 parentB（无子层级）
      await step("步骤1: 前置-新增parentB记录（无子层级） → 新增成功", async () => {
        await gotoJsonConfigPage(page);
        await addKey(page, parentB);
      });

      // 步骤2：刷新页面，断言 parentB 行无可点击展开图标
      const parentBRow = page.locator(".ant-table-row").filter({ hasText: parentB }).first();
      await step(
        "步骤2: 刷新页面，验证parentB行无展开图标（无子层级） → 展开图标不可点击",
        async () => {
          await gotoJsonConfigPage(page);
          await ensureRowVisibleByKey(page, parentB, 15000);
          await expect(parentBRow).toBeVisible({ timeout: 10000 });
          // 无子层级时展开位置渲染 spaced 占位元素，可点击图标数量为 0
          const clickableExpandIcon = parentBRow.locator(
            ".ant-table-row-expand-icon:not(.ant-table-row-expand-icon-spaced)",
          );
          await expect(clickableExpandIcon).toHaveCount(0);
        },
        parentBRow,
      );

      // 步骤3：创建 XLSX 导入文件（一层 sheet + 二层 sheet）
      await step("步骤3: 创建xlsx文件（一层sheet含parentB，二层sheet含newChild1） → 文件创建成功", async () => {
        await createImportXlsx(xlsxPath, [
          {
            name: "一层",
            headers: ["*key", "中文名称", "value格式"],
            rows: [[parentB, "", ""]],
          },
          {
            name: "二层",
            headers: ["*上一层级的key名", "*key", "中文名称", "value格式"],
            rows: [[parentB, newChild1, "新增子键", "^[a-z]+$"]],
          },
        ]);
        expect(fs.existsSync(xlsxPath)).toBe(true);
      });

      // 步骤4：执行导入，选择「重复则覆盖更新」
      await importXlsx(page, step, xlsxPath, "重复则覆盖更新");

      // 步骤5：断言 parentB 行出现展开图标，展开后 newChild1 子行可见
      const expandedParentBRow = page.locator(".ant-table-row").filter({ hasText: parentB }).first();
      await step(
        "步骤5: 验证parentB行出现展开图标，展开后newChild1子行可见，中文名称=新增子键，value格式=^[a-z]+$ → 子层级新增成功",
        async () => {
          await gotoJsonConfigPage(page);
          await searchKey(page, parentB);
          await expect(expandedParentBRow).toBeVisible({ timeout: 10000 });
          // 展开图标可点击（非 spaced 占位）
          const clickableExpandIcon = expandedParentBRow.locator(
            ".ant-table-row-expand-icon:not(.ant-table-row-expand-icon-spaced)",
          );
          await expect(clickableExpandIcon).toBeVisible({ timeout: 5000 });
          // 展开子层级
          await expandRow(page, parentB);
          // 验证子行内容
          const childRow = page.locator(".ant-table-row").filter({ hasText: newChild1 }).first();
          await expect(childRow).toBeVisible({ timeout: 5000 });
          await expect(childRow).toContainText("新增子键");
          await expect(childRow).toContainText("^[a-z]+$");
        },
        expandedParentBRow,
      );
    } finally {
      await deleteKey(page, parentB).catch(() => {});
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    }
  });
});
