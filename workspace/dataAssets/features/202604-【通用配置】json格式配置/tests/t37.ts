// META: {"id":"t37","priority":"P1","title":"【P1】验证筛选后导出仅包含筛选结果数据"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import { gotoJsonConfigPage, addKey, deleteKey } from "./json-config-helpers";
import ExcelJS from "exceljs";
import * as fs from "fs";
import * as path from "path";

async function waitTableLoaded(page: import("@playwright/test").Page) {
  await page
    .locator(".ant-spin-spinning")
    .waitFor({ state: "hidden", timeout: 15000 })
    .catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
}

async function applyDataSourceFilter(page: import("@playwright/test").Page, typeName: string) {
  const filterBtn = page.locator(".ant-table-thead").getByRole("button", { name: "filter" });
  await filterBtn.waitFor({ state: "visible", timeout: 10000 });
  await filterBtn.click();

  const dropdown = page.locator(".ant-table-filter-dropdown:visible").last();
  await dropdown.waitFor({ state: "visible", timeout: 5000 });
  await dropdown.locator(".ant-dropdown-menu-item").filter({ hasText: typeName }).first().click();
  await dropdown.getByRole("button", { name: /确\s*定/ }).first().click();
  await waitTableLoaded(page);
}

async function clearDataSourceFilter(page: import("@playwright/test").Page) {
  const filterBtn = page.locator(".ant-table-thead").getByRole("button", { name: "filter" });
  await filterBtn.waitFor({ state: "visible", timeout: 10000 });
  await filterBtn.click();

  const dropdown = page.locator(".ant-table-filter-dropdown:visible").last();
  await dropdown.waitFor({ state: "visible", timeout: 5000 });
  const resetBtn = dropdown.getByRole("button", { name: /重\s*置/ }).first();
  if (await resetBtn.isEnabled().catch(() => false)) {
    await resetBtn.click();
  }
  await dropdown.getByRole("button", { name: /确\s*定/ }).first().click();
  await waitTableLoaded(page);
}

async function readWorksheet(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const rows: string[][] = [];

  for (let i = 2; i <= sheet.rowCount; i++) {
    const rowValues: string[] = [];
    sheet.getRow(i).eachCell((cell) => {
      const value =
        typeof cell.value === "object" && cell.value !== null && "result" in cell.value
          ? String(cell.value.result ?? "").trim()
          : String(cell.value ?? "").trim();
      rowValues.push(value);
    });
    if (rowValues.some(Boolean)) {
      rows.push(rowValues);
    }
  }

  return rows;
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证筛选后导出仅包含筛选结果数据", { tag: "@serial" }, async ({ page, step }) => {
    test.setTimeout(240000);
    const sparkKey = uniqueName("sparkExportKey");
    const hiveKey = uniqueName("hiveExportKey");
    const savePath = path.join("/tmp", `t37_${Date.now()}.xlsx`);

    try {
      await step("步骤1: 进入页面并准备不同数据源类型测试数据 → 页面正常加载", async () => {
        await gotoJsonConfigPage(page);
        await addKey(page, sparkKey, { dataSourceType: "SparkThrift2.x" });
        await addKey(page, hiveKey, { dataSourceType: "Hive2.x" });
        await gotoJsonConfigPage(page);
        await waitTableLoaded(page);
      });

      await step("步骤2: 在数据源类型筛选器中选择 Hive2.x → 列表仅显示 Hive2.x 记录", async () => {
        await applyDataSourceFilter(page, "Hive2.x");
        const visibleRows = page.locator(".ant-table-tbody .ant-table-row");
        const rowCount = await visibleRows.count();
        expect(rowCount).toBeGreaterThan(0);
        for (let i = 0; i < rowCount; i++) {
          await expect(visibleRows.nth(i).locator(".ant-table-cell").nth(4)).toHaveText("Hive2.x");
        }
      });

      await step("步骤3: 点击【导出】并确认下载 → 文件下载成功", async () => {
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 30000 }),
          (async () => {
            await page.getByRole("button", { name: /^导\s*出$/ }).click();
            const popconfirm = page.locator(".ant-popover-inner, .ant-popconfirm");
            await expect(
              popconfirm.filter({ hasText: "请确认是否导出列表数据" }).first(),
            ).toBeVisible({ timeout: 5000 });
            const confirmBtn = popconfirm.getByRole("button", { name: /确\s*认/ }).first();
            if (await confirmBtn.isVisible().catch(() => false)) {
              await confirmBtn.click();
            } else {
              await popconfirm.locator("button.ant-btn-primary").first().click();
            }
          })(),
        ]);
        await download.saveAs(savePath);
      });

      await step("步骤4: 打开导出文件 → 仅包含 Hive2.x 筛选结果数据", async () => {
        expect(fs.existsSync(savePath)).toBe(true);
        const rows = await readWorksheet(savePath);
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.some((row) => row[0] === hiveKey)).toBe(true);
        expect(rows.some((row) => row[0] === sparkKey)).toBe(false);

        for (const row of rows) {
          expect(row[3]).toBe("Hive2.x");
        }
      });
    } finally {
      await clearDataSourceFilter(page).catch(() => undefined);
      await deleteKey(page, sparkKey).catch(() => undefined);
      await deleteKey(page, hiveKey).catch(() => undefined);
      if (fs.existsSync(savePath)) {
        fs.unlinkSync(savePath);
      }
    }
  });
});
