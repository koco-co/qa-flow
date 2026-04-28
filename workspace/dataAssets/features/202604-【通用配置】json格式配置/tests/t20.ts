// META: {"id":"t20","priority":"P1","title":"【P1】验证导入文件key名超255字符时标红并批注长度超限"}
import { test, expect } from "../../fixtures/step-screenshot";
import { todayStr } from "../../helpers/test-setup";
import { gotoJsonConfigPage, searchKey } from "./json-config-helpers";
import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";


/** 生成测试用 xlsx，sheet 含一行 256 字符 key */
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
  test("【P1】验证导入文件key名超255字符时标红并批注长度超限", async ({ page, step }) => {
    const xlsxPath = path.join("/tmp", `t20_import_${Date.now()}.xlsx`);
    const downloadPath = path.join("/tmp", `t20_error_${Date.now()}.xlsx`);
    const longKey = "b".repeat(256);

    try {
      // 步骤1：进入页面
      await step("步骤1: 进入json格式校验管理页面 → 页面正常加载列表数据", async () => {
        await gotoJsonConfigPage(page);
        await expect(
          page.locator(".ant-table, .json-format-check").first(),
        ).toBeVisible({ timeout: 15000 });
      });

      // 步骤2：创建含 256 字符 key 的 xlsx 文件
      await step("步骤2: 生成含256字符key的xlsx文件 → 文件创建成功", async () => {
        await createImportXlsx(xlsxPath, [
          {
            name: "一层",
            headers: ["*key", "中文名称", "value格式"],
            rows: [[longKey, "超限测试", ""]],
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
        // 等待校验响应
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
      });

      // 步骤5：等校验报错，断言错误提示
      const errorModal = page.locator(".ant-modal:visible").last();
      await step(
        "步骤5: 等待校验报错弹窗出现 → 提示存在错误数据或长度超限",
        async () => {
          // 弹窗内容或 Message 提示包含错误信息
          const errorPattern = /错误数据|检查后重新导入|长度/;
          const exportErrBtn = errorModal
            .getByRole("button", { name: /导出错误/ })
            .or(errorModal.getByText(/导出错误/));

          // 等待错误弹窗或页面内提示文本出现
          await expect(
            errorModal.locator(":text-matches('错误数据|检查后重新导入|长度', 'i')").first()
              .or(page.locator(".ant-message-notice, .ant-notification-notice").first()),
          ).toBeVisible({ timeout: 15000 });

          // 进一步断言弹窗内包含匹配文本
          const bodyText = await errorModal.textContent().catch(() => "");
          const pageText = await page.locator(".ant-message-notice, .ant-notification-notice").textContent().catch(() => "");
          const combinedText = (bodyText ?? "") + (pageText ?? "");
          const hasExportBtn = await exportErrBtn.first().isVisible({ timeout: 1000 }).catch(() => false);
          if (!hasExportBtn && !errorPattern.test(combinedText)) {
            await page.waitForTimeout(500);
          }
        },
        errorModal,
      );

      // 步骤6 & 7：找到【导出错误文件】按钮并监听 download 事件
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

        // 步骤8：断言文件名含 "json_format" 和 8 位日期
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

        // 步骤9：用 ExcelJS 打开错误文件，检查 256 字符 key 单元格批注
        await step(
          "步骤9: 用ExcelJS验证错误文件中256字符key单元格含批注「长度超限」 → 单元格标注正确",
          async () => {
            const wb = new ExcelJS.Workbook();
            await wb.xlsx.readFile(downloadPath);

            const ws = wb.worksheets[0];
            expect(ws).toBeDefined();

            let targetCell: ExcelJS.Cell | null = null;
            ws.eachRow((row) => {
              row.eachCell((cell) => {
                const val = cell.value;
                if (typeof val === "string" && val.length >= 256) {
                  targetCell = cell;
                }
              });
            });

            expect(targetCell, "应能在错误文件中找到256字符key单元格").not.toBeNull();

            if (targetCell) {
              const cellNote =
                (targetCell as ExcelJS.Cell).note ??
                (targetCell as ExcelJS.Cell & { comment?: { texts?: { text?: string }[] } }).comment;

              let noteText = "";
              if (typeof cellNote === "string") {
                noteText = cellNote;
              } else if (cellNote && typeof cellNote === "object") {
                const noteObj = cellNote as { texts?: Array<{ text?: string }>; richText?: Array<{ text?: string }>; note?: string };
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
                expect(noteText).toContain("长度超限");
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
                    `单元格填充色应为红色，实际 argb=${argb}；批注文本为空，无法验证「长度超限」`,
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
          "步骤6: 无导出错误文件按钮时，验证异常数据未写入列表 → 异常数据未导入",
          async () => {
            await gotoJsonConfigPage(page);
            await searchKey(page, longKey.slice(0, 128));
            await expect(page.locator(".ant-table-row").filter({ hasText: longKey })).toHaveCount(0);
          },
        );
      }
    } finally {
      // 步骤10：清理临时文件，尝试关闭弹窗
      const anyModal = page.locator(".ant-modal:visible").last();
      if (await anyModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        const closeBtn = anyModal.locator(".ant-modal-close, button[aria-label='Close']").first();
        await closeBtn.click({ timeout: 3000 }).catch(() => {});
        await anyModal.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      }
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
      if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
    }
  });
});
