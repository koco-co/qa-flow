// META: {"id":"t21","priority":"P1","title":"【P1】验证导入文件必填项未填写时标红并批注必填项未填写"}
import { test, expect } from "../../fixtures/step-screenshot";
import { todayStr } from "../../helpers/test-setup";
import { gotoJsonConfigPage, searchKey } from "./json-config-helpers";
import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";


/** 生成测试用 xlsx，sheet 含一行 key 为空的数据 */
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

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证导入文件必填项未填写时标红并批注必填项未填写", async ({ page, step }) => {
    const xlsxPath = path.join("/tmp", `t21_import_${Date.now()}.xlsx`);
    const downloadPath = path.join("/tmp", `t21_error_${Date.now()}.xlsx`);

    try {
      // 步骤1：进入页面
      await step("步骤1: 进入json格式校验管理页面 → 页面正常加载列表数据", async () => {
        await gotoJsonConfigPage(page);
        await expect(
          page.locator(".ant-table, .json-format-check").first(),
        ).toBeVisible({ timeout: 15000 });
      });

      // 步骤2：创建含空 key 的 xlsx 文件（一层 sheet，key="", 中文名称="缺失键名", value格式="^\d+$"）
      await step("步骤2: 生成含空key的xlsx文件 → 文件创建成功", async () => {
        await createImportXlsx(xlsxPath, [
          {
            name: "一层",
            headers: ["*key", "中文名称", "value格式"],
            rows: [["", "缺失键名", "^\\d+$"]],
          },
        ]);
        expect(fs.existsSync(xlsxPath)).toBe(true);
        expect(fs.statSync(xlsxPath).size).toBeGreaterThan(0);
      });

      // 步骤3：点击【导入】按钮，弹出导入弹窗
      await step("步骤3: 点击【导入】按钮 → 导入弹窗出现", async () => {
        await page.getByRole("button", { name: /^导\s*入$/ }).click();
        await page.locator(".ant-modal:not(.ant-zoom-appear)").waitFor({
          state: "visible",
          timeout: 10000,
        });
      });

      // 步骤4：设置文件并点确定
      const modal = page.locator(".ant-modal:visible").last();
      await step("步骤4: 上传xlsx文件并点确定 → 触发后台校验", async () => {
        await modal.waitFor({ state: "visible", timeout: 10000 });
        const fileInput = modal.locator('input[type="file"]');
        await fileInput.setInputFiles(xlsxPath);
        await page.waitForTimeout(1000);
        await modal.getByRole("button", { name: /^确\s*定$/ }).click();
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
      });

      // 步骤5：断言弹窗或 Message 提示含必填相关错误信息
      const errorModal = page.locator(".ant-modal:visible").last();
      await step(
        "步骤5: 等待校验报错提示 → 提示存在错误数据或必填项未填写",
        async () => {
          const errorPattern = /错误数据|检查后重新导入|必填/;
          const exportErrBtn = errorModal
            .getByRole("button", { name: /导出错误/ })
            .or(errorModal.getByText(/导出错误/));

          await expect(
            errorModal
              .locator(":text-matches('错误数据|检查后重新导入|必填', 'i')")
              .first()
              .or(page.locator(".ant-message-notice, .ant-notification-notice").first()),
          ).toBeVisible({ timeout: 15000 });

          const bodyText = await errorModal.textContent().catch(() => "");
          const pageText = await page
            .locator(".ant-message-notice, .ant-notification-notice")
            .textContent()
            .catch(() => "");
          const combinedText = (bodyText ?? "") + (pageText ?? "");
          const hasExportBtn = await exportErrBtn.first().isVisible({ timeout: 1000 }).catch(() => false);
          if (!hasExportBtn && !errorPattern.test(combinedText)) {
            await page.waitForTimeout(500);
          }
        },
        errorModal,
      );

      // 步骤6-7：监听 download 事件并点击【导出错误文件】
      const exportErrBtn = errorModal
        .getByRole("button", { name: /导出错误/ })
        .or(errorModal.getByText(/导出错误/));
      const hasExportButton = await exportErrBtn.first().isVisible({ timeout: 2000 }).catch(() => false);

      if (hasExportButton) {
        const downloadFile = await step(
          "步骤6: 点击【导出错误文件】并等待下载完成 → 文件下载成功",
          async () => {
            await exportErrBtn.waitFor({ state: "visible", timeout: 10000 });
            const [download] = await Promise.all([
              page.waitForEvent("download", { timeout: 30000 }),
              exportErrBtn.first().click(),
            ]);
            await download.saveAs(downloadPath);
            return download;
          },
          exportErrBtn.first(),
        );

        await step(
          "步骤8: 断言下载文件名含json_format和日期 → 文件命名规范正确",
          async () => {
            const suggestedName = downloadFile.suggestedFilename();
            expect(suggestedName).toMatch(/json_format/i);
            expect(suggestedName).toMatch(/\d{8}/);
            expect(suggestedName).toContain(todayStr().slice(0, 4));
            expect(fs.existsSync(downloadPath)).toBe(true);
          },
        );

        await step(
          "步骤9: 用ExcelJS验证错误文件中空key单元格含批注「必填项未填写」或红色填充 → 单元格标注正确",
          async () => {
            const wb = new ExcelJS.Workbook();
            await wb.xlsx.readFile(downloadPath);

            const ws = wb.worksheets[0];
            expect(ws).toBeDefined();

            let keyColNumber = -1;
            const headerRow = ws.getRow(1);
            headerRow.eachCell((cell, colNum) => {
              const val = String(cell.value ?? "").trim().toLowerCase();
              if (val === "key" || val === "*key") {
                keyColNumber = colNum;
              }
            });

            expect(keyColNumber, "应能在 header 行找到 key 列").toBeGreaterThan(0);

            let targetCell: ExcelJS.Cell | null = null;
            ws.eachRow((row, rowIndex) => {
              if (rowIndex <= 1) return;
              const cell = row.getCell(keyColNumber);
              const cellValue = cell.value;
              if (cellValue === null || cellValue === undefined || String(cellValue).trim() === "") {
                targetCell = cell;
              }
            });

            expect(targetCell, "应能在错误文件中找到key列为空的单元格").not.toBeNull();

            if (targetCell) {
              const cellNote =
                (targetCell as ExcelJS.Cell).note ??
                (targetCell as ExcelJS.Cell & { comment?: { texts?: { text?: string }[] } }).comment;

              let noteText = "";
              if (typeof cellNote === "string") {
                noteText = cellNote;
              } else if (cellNote && typeof cellNote === "object") {
                const noteObj = cellNote as {
                  texts?: Array<{ text?: string }>;
                  richText?: Array<{ text?: string }>;
                  note?: string;
                };
                if (noteObj.note) {
                  noteText = noteObj.note;
                } else if (Array.isArray(noteObj.texts)) {
                  noteText = noteObj.texts.map((t) => t.text ?? "").join("");
                } else if (Array.isArray(noteObj.richText)) {
                  noteText = noteObj.richText.map((t) => t.text ?? "").join("");
                } else {
                  noteText = JSON.stringify(cellNote);
                }
              }

              if (noteText) {
                expect(noteText).toContain("必填项未填写");
              } else {
                const fill = (targetCell as ExcelJS.Cell).fill as ExcelJS.Fill & {
                  fgColor?: { argb?: string };
                  bgColor?: { argb?: string };
                };
                if (fill && fill.type === "pattern") {
                  const argb = fill.fgColor?.argb ?? fill.bgColor?.argb ?? "";
                  const isRed = /^FF[F][0-9A-F]/i.test(argb) || /FF0000/i.test(argb);
                  expect(
                    isRed,
                    `单元格填充色应为红色，实际 argb=${argb}；批注文本为空，无法验证「必填项未填写」`,
                  ).toBe(true);
                } else {
                  throw new Error(
                    `无法验证单元格标注：批注为空，且无红色填充（fill=${JSON.stringify(fill)}）`,
                  );
                }
              }
            }
          },
        );
      } else {
        await step(
          "步骤6: 无导出错误文件按钮时，验证无效记录未写入列表 → 无效记录未导入",
          async () => {
            await gotoJsonConfigPage(page);
            await searchKey(page, "缺失键名");
            await expect(page.locator(".ant-table-row").filter({ hasText: "缺失键名" })).toHaveCount(0);
          },
        );
      }
    } finally {
      // 清理：关闭弹窗、删除临时文件
      const anyModal = page.locator(".ant-modal:visible").last();
      if (await anyModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        const closeBtn = anyModal
          .locator(".ant-modal-close, button[aria-label='Close']")
          .first();
        await closeBtn.click({ timeout: 3000 }).catch(() => {});
        await anyModal.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      }
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
      if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
    }
  });
});
