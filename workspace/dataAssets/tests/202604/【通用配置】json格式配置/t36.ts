// META: {"id":"t36","priority":"P0","title":"【P0】验证导出列表数据完整流程及文件命名"}
import { test, expect } from "../../fixtures/step-screenshot";
import {
  waitForTableLoaded,
  confirmPopconfirm,
} from "../../helpers/test-setup";
import { gotoJsonConfigPage } from "./json-config-helpers";
import ExcelJS from "exceljs";
import * as fs from "fs";
import * as path from "path";

async function readWorksheet(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const headers: string[] = [];
  const rows: string[][] = [];

  sheet.getRow(1).eachCell((cell) => {
    headers.push(String(cell.value ?? "").trim());
  });

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
          expect(exportedRow?.[1] ?? "").toBe(sampleRow?.name ?? "");
          expect(exportedRow?.[3] ?? "").toBe(sampleRow?.dataSourceType ?? "");
          expect(exportedRow?.[4] ?? "").toBe(sampleRow?.createBy ?? "");
        },
      );
    } finally {
      if (fs.existsSync(savePath)) {
        fs.unlinkSync(savePath);
      }
    }
  });
});
