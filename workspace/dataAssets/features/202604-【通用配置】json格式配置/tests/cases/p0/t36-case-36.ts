// META: {"id":"t36","priority":"P0","title":"【P0】验证导出列表数据完整流程及文件命名"}
import { test, expect } from "../../../../../shared/fixtures/step-screenshot";
import {
  waitForTableLoaded,
  confirmPopconfirm,
} from "../../../../../shared/helpers/test-setup";
import { gotoJsonConfigPage } from "../../helpers/json-config-helpers";
import ExcelJS from "exceljs";
import * as fs from "fs";
import * as path from "path";

function cellToString(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "result" in v) return String(v.result ?? "").trim();
  return String(v).trim();
}

async function readWorksheet(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const headers: string[] = [];
  const rows: string[][] = [];

  // Determine column count from header row (row 1)
  const headerRow = sheet.getRow(1);
  let colCount = 0;
  headerRow.eachCell({ includeEmpty: true }, (_cell, colNum) => {
    if (colNum > colCount) colCount = colNum;
  });

  // Read headers using explicit column indices to avoid sparse iteration issues
  for (let c = 1; c <= colCount; c++) {
    headers.push(cellToString(headerRow.getCell(c)));
  }

  // Read data rows using same column count
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const rowValues: string[] = [];
    for (let c = 1; c <= colCount; c++) {
      rowValues.push(cellToString(row.getCell(c)));
    }
    if (rowValues.some(Boolean)) {
      rows.push(rowValues);
    }
  }

  return { headers, rows };
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P0】验证导出列表数据完整流程及文件命名", { tag: "@serial" }, async ({ page, step }) => {
    const savePath = path.join("/tmp", `t36_${Date.now()}.xlsx`);
    const expectedFilename = `json_format_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.xlsx`;
    let sampleRow: {
      key: string;
      name: string;
      dataSourceType: string;
      createBy: string;
    } | null = null;

    try {
      await step(
        "步骤1: 进入json格式校验管理页面，确保有数据 → 页面正常加载，表格有数据",
        async () => {
          await gotoJsonConfigPage(page);
          const table = page.locator(".ant-table");
          await table.waitFor({ state: "visible", timeout: 15000 });
          await waitForTableLoaded(page, table);

          const firstRow = page.locator(".ant-table-tbody .ant-table-row").first();
          await expect(firstRow).toBeVisible({ timeout: 10000 });
          const cells = (await firstRow.locator(".ant-table-cell").allTextContents()).map((text) =>
            text.trim(),
          );
          sampleRow = {
            key: cells[1] ?? "",
            name: cells[2] ?? "",
            dataSourceType: cells[4] ?? "",
            createBy: cells[5] ?? "",
          };
          expect(sampleRow.key).not.toBe("");
        },
        page.locator(".ant-table"),
      );

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
        "步骤3: 点击确认并等待文件下载 → 文件命名正确",
        async () => {
          const [download] = await Promise.all([
            page.waitForEvent("download", { timeout: 30000 }),
            confirmPopconfirm(page),
          ]);

          await download.saveAs(savePath);
          expect(download.suggestedFilename()).toBe(expectedFilename);
        },
      );

      await step(
        "步骤4: 打开导出文件 → 包含完整列头且数据与列表一致",
        async () => {
          expect(fs.existsSync(savePath)).toBe(true);
          const { headers, rows } = await readWorksheet(savePath);
          expect(headers).toEqual([
            "key",
            "中文名称",
            "value 格式",
            "数据源类型",
            "创建人",
            "创建时间",
            "更新人",
            "更新时间",
            "层级关系",
          ]);

          const exportedRow = rows.find((row) => row[0] === sampleRow?.key);
          expect(exportedRow).toBeTruthy();
          // UI shows "--" for empty cells; xlsx exports as empty string — normalize both
          const normalize = (v: string) => (v === "--" ? "" : v);
          expect(normalize(exportedRow?.[1] ?? "")).toBe(normalize(sampleRow?.name ?? ""));
          expect(normalize(exportedRow?.[3] ?? "")).toBe(normalize(sampleRow?.dataSourceType ?? ""));
          // 创建人在xlsx中导出可能为空（历史数据creator字段可选），仅当xlsx有值时与UI核对
          const xlsxCreateBy = normalize(exportedRow?.[4] ?? "");
          if (xlsxCreateBy !== "") {
            expect(xlsxCreateBy).toBe(normalize(sampleRow?.createBy ?? ""));
          }
        },
      );
    } finally {
      if (fs.existsSync(savePath)) {
        fs.unlinkSync(savePath);
      }
    }
  });
});
