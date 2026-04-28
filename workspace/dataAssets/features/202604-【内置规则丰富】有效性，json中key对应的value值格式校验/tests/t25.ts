// META: {"id":"t25","priority":"P1","title":"【P1】验证校验不通过时明细数据下载功能中校验字段标红"}
import * as fs from "node:fs";
import * as path from "node:path";
import ExcelJS from "exceljs";
import { expect, test } from "../../../shared/fixtures/step-screenshot";
import {
  ensureExecutedJsonTask,
  openTaskInstanceDetail,
  openTaskRuleDetailDataDrawer,
  waitForVisibleTaskRow,
} from "./json-format-task-helpers";
import { describeByDatasource } from "./suite-case-helpers";
import { P0_FAIL_SCENARIO } from "./test-data";

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
});
test.setTimeout(600000);

function getCellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (typeof value === "object" && value && "result" in value) {
    return String(value.result ?? "").trim();
  }
  return String(value ?? "").trim();
}

function getCellHighlightColor(cell: ExcelJS.Cell): string {
  return (
    cell.font?.color?.argb ??
    (cell.fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb ??
    ""
  );
}

describeByDatasource("校验结果查询", () => {
  test("验证校验不通过时明细数据下载功能中校验字段标红", async ({ page }) => {
    const downloadPath = path.join("/tmp", `t25_${Date.now()}.xlsx`);

    try {
      await ensureExecutedJsonTask(page, P0_FAIL_SCENARIO);
      const instanceRow = await waitForVisibleTaskRow(
        page,
        P0_FAIL_SCENARIO.taskName,
      );
      const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
      const dataDrawer = await openTaskRuleDetailDataDrawer(page, detailDrawer);

      const downloadButton = dataDrawer
        .getByRole("button", { name: /下载明细|下载明细数据/ })
        .first();
      await expect(downloadButton).toBeVisible({ timeout: 10000 });

      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 30000 }),
        downloadButton.click(),
      ]);
      await download.saveAs(downloadPath);

      expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
      expect(fs.existsSync(downloadPath)).toBe(true);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(downloadPath);
      const sheet = workbook.worksheets[0];
      expect(sheet).toBeTruthy();

      const headerTexts = sheet
        .getRow(1)
        .values.slice(1)
        .map((value) => String(value ?? "").trim());
      const infoColumnIndex =
        headerTexts.findIndex((value) => value === "info") + 1;
      const remarkColumnIndex =
        headerTexts.findIndex((value) => value === "remark") + 1;

      expect(infoColumnIndex).toBeGreaterThan(0);
      expect(remarkColumnIndex).toBeGreaterThan(0);

      let invalidRowIndex = -1;
      for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
        const row = sheet.getRow(rowIndex);
        const rowTexts = row.values
          .slice(1)
          .map((value) => String(value ?? "").trim());
        if (
          rowTexts.some(
            (value) => value.includes("Tom") || value.includes("1000"),
          )
        ) {
          invalidRowIndex = rowIndex;
          break;
        }
      }

      expect(invalidRowIndex).toBeGreaterThan(1);

      const invalidRow = sheet.getRow(invalidRowIndex);
      const infoCell = invalidRow.getCell(infoColumnIndex);
      const remarkCell = invalidRow.getCell(remarkColumnIndex);

      expect(getCellText(infoCell)).toMatch(/Tom|1000/);
      expect(getCellText(remarkCell)).not.toBe("");
      expect(getCellHighlightColor(infoCell)).not.toBe("");
    } finally {
      if (fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath);
      }
    }
  });
});
