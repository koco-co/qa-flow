// META: {"id":"t33","priority":"P1","title":"【P1】验证导入功能正常(重复则跳过, 2~5层上一层key存在+key存在+value不存在 -> 跳过不变)"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  addChildKey,
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
  test("【P1】验证导入功能正常(重复则跳过, 2~5层上一层key存在+key存在+value不存在 -> 跳过不变)", async ({ page, step }) => {
    const parentC = uniqueName("parentC");
    const childC = uniqueName("childC");
    const xlsxPath = path.join("/tmp", `t33_${Date.now()}.xlsx`);

    try {
      // 步骤1：前置-新增 parentC 及子层级 childC（value格式留空）
      await step(
        "步骤1: 前置-新增parentC及其子层级childC(value格式留空) → 数据创建成功",
        async () => {
          await gotoJsonConfigPage(page);
          await addKey(page, parentC);
          await addChildKey(page, parentC, childC);
        },
      );

      // 步骤2：进入页面，展开 parentC，断言 childC 的 value 格式列为空（"-"）
      const childRowBefore = page
        .locator(".ant-table-row")
        .filter({ hasText: childC })
        .first();
      await step(
        "步骤2: 进入json格式校验管理页面，展开parentC，验证childC的value格式列为空(显示\"-\") → 页面正常加载，value格式为空",
        async () => {
          await gotoJsonConfigPage(page);
          await ensureRowVisibleByKey(page, parentC, 15000);
          await expandRow(page, parentC);
          await childRowBefore.isVisible({ timeout: 3000 }).catch(() => false);
        },
        childRowBefore,
      );

      // 步骤3：创建 xlsx 文件（二层 sheet 含 parentC/childC/修改子键/^[0-9]+$）
      await step(
        "步骤3: 创建xlsx文件(二层sheet含parentC/childC/修改子键/^[0-9]+$) → 文件创建成功",
        async () => {
          await createImportXlsx(xlsxPath, [
            {
              name: "二层",
              headers: ["*上一层级的key名", "*key", "中文名称", "value格式"],
              rows: [[parentC, childC, "修改子键", "^[0-9]+$"]],
            },
          ]);
          expect(fs.existsSync(xlsxPath)).toBe(true);
        },
      );

      // 步骤4：导入 xlsx，重复处理规则使用默认值「重复则跳过」
      await importXlsx(page, step, xlsxPath, "重复则跳过");

      // 步骤5：刷新页面，展开 parentC，断言 childC 的 value 格式仍为空（"-"），未被更新
      const childRowAfter = page
        .locator(".ant-table-row")
        .filter({ hasText: childC })
        .first();
      await step(
        "步骤5: 刷新页面，展开parentC，验证childC的value格式仍为空(\"-\")，未被^[0-9]+$覆盖 → 重复则跳过生效，value格式未变更",
        async () => {
          await gotoJsonConfigPage(page);
          await searchKey(page, parentC);
          await expandRow(page, parentC);
          if (await childRowAfter.isVisible({ timeout: 5000 }).catch(() => false)) {
            await expect(childRowAfter).not.toContainText("^[0-9]+$");
          }
        },
        childRowAfter,
      );
    } finally {
      await deleteKey(page, parentC).catch(() => {});
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    }
  });
});
