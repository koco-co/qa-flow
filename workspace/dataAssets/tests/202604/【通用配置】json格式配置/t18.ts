// META: {"id":"t18","priority":"P1","title":"【P1】验证重复处理规则「重复则覆盖更新」生效"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
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

async function importXlsx(
  page: import("@playwright/test").Page,
  step: Function,
  filePath: string,
  duplicateRule: "重复则跳过" | "重复则覆盖更新" = "重复则跳过",
) {
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
  test("【P1】验证重复处理规则「重复则覆盖更新」生效", async ({ page, step }) => {
    test.setTimeout(180000);
    const existKey = uniqueName("existKey");
    const xlsxPath = path.join("/tmp", `t18_${Date.now()}.xlsx`);

    try {
      await step("步骤1: 前置-新增existKey记录(value格式=^[a-z]+$) → 新增成功", async () => {
        await gotoJsonConfigPage(page);
        await addKey(page, existKey, { valueFormat: "^[a-z]+$", chineseName: "原始" });
      });

      await step("步骤2: 刷新页面，验证existKey行value格式显示^[a-z]+$ → 页面正常加载，value格式正确", async () => {
        await gotoJsonConfigPage(page);
        const existRow = await ensureRowVisibleByKey(page, existKey, 20000);
        await expect(existRow).toContainText("^[a-z]+$");
      });

      await step("步骤3: 创建xlsx文件(含existKey，value格式=^[A-Z]+$) → 文件创建成功", async () => {
        await createImportXlsx(xlsxPath, [
          {
            name: "一层",
            headers: ["*key", "中文名称", "value格式"],
            rows: [[existKey, "已有键", "^[A-Z]+$"]],
          },
        ]);
        expect(fs.existsSync(xlsxPath)).toBe(true);
      });

      await importXlsx(page, step, xlsxPath, "重复则覆盖更新");

      const updatedRow = page.locator(".ant-table-row").filter({ hasText: existKey }).first();
      await step(
        "步骤4: 验证existKey行value格式更新为^[A-Z]+$ → 覆盖更新生效",
        async () => {
          await gotoJsonConfigPage(page);
          await ensureRowVisibleByKey(page, existKey, 20000);
          await expect(updatedRow).toBeVisible({ timeout: 10000 });
          await expect(updatedRow).toContainText("^[A-Z]+$");
        },
        updatedRow,
      );
    } finally {
      const anyModal = page.locator(".ant-modal:visible").last();
      if (await anyModal.isVisible({ timeout: 1500 }).catch(() => false)) {
        const closeBtn = anyModal
          .locator(".ant-modal-close, button[aria-label='Close']")
          .first();
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click().catch(() => undefined);
        } else {
          await page.keyboard.press("Escape").catch(() => undefined);
        }
        await anyModal.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
      }
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    }
  });
});
