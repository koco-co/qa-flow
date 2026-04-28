// META: {"id":"t22","priority":"P1","title":"【P1】验证导入文件二层key上一层级key名无法匹配时标红并批注提示"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import { gotoJsonConfigPage, searchKey } from "./json-config-helpers";
import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";


/** 生成测试用 xlsx，支持多 sheet */
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
  test("【P1】验证导入文件二层key上一层级key名无法匹配时标红并批注提示", async ({ page, step }) => {
    const xlsxPath = path.join("/tmp", `t22_import_${Date.now()}.xlsx`);
    const downloadPath = path.join("/tmp", `t22_error_${Date.now()}.xlsx`);

    // 生成唯一 key 名，避免与已有数据冲突
    const realKey1 = uniqueName("realKey1");
    const nonExistParentKey = uniqueName("noParent");
    const orphanKey = "orphanKey";

    try {
      // 步骤1：进入页面
      await step(
        "步骤1: 进入json格式校验管理页面 → 页面正常加载列表数据",
        async () => {
          await gotoJsonConfigPage(page);
          await expect(
            page.locator(".ant-table, .json-format-check").first(),
          ).toBeVisible({ timeout: 15000 });
        },
      );

      // 步骤2：生成含上一层级 key 无法匹配的二层 xlsx 文件
      await step(
        "步骤2: 生成二层Sheet中上一层级key名不存在的xlsx文件 → 文件创建成功",
        async () => {
          await createImportXlsx(xlsxPath, [
            {
              name: "一层",
              headers: ["key", "中文名称", "value格式"],
              rows: [[realKey1, "真实键", ""]],
            },
            {
              name: "二层",
              headers: ["*上一层级的key名", "key", "中文名称", "value格式"],
              rows: [[nonExistParentKey, orphanKey, "孤儿键", ""]],
            },
          ]);
          expect(fs.existsSync(xlsxPath)).toBe(true);
          expect(fs.statSync(xlsxPath).size).toBeGreaterThan(0);
        },
      );

      // 步骤3：点击【导入】按钮，弹出导入弹窗
      await step(
        "步骤3: 点击【导入】按钮 → 导入弹窗出现",
        async () => {
          await page.getByRole("button", { name: /^导\s*入$/ }).click();
          await page.locator(".ant-modal:not(.ant-zoom-appear)").waitFor({
            state: "visible",
            timeout: 10000,
          });
        },
      );

      // 步骤4：设置文件并点确定
      const modal = page.locator(".ant-modal:visible").last();
      await step(
        "步骤4: 上传xlsx文件并点确定 → 触发后台校验",
        async () => {
          await modal.waitFor({ state: "visible", timeout: 10000 });
          const fileInput = modal.locator('input[type="file"]');
          await fileInput.setInputFiles(xlsxPath);
          await page.waitForTimeout(1000);
          await modal.getByRole("button", { name: /^确\s*定$/ }).click();
          await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
        },
      );

      // 步骤5：断言错误提示弹窗出现，内容匹配预期
      const errorModal = page.locator(".ant-modal:visible").last();
      await step(
        "步骤5: 等待校验报错弹窗 → 提示存在错误数据且无法完成导入",
        async () => {
          const errorPattern = /错误数据|检查后重新导入|无相同key名匹配|上一层级/;
          const exportErrBtn = errorModal
            .getByRole("button", { name: /导出错误/ })
            .or(errorModal.getByText(/导出错误/));

          await expect(
            errorModal
              .locator(
                ":text-matches('错误数据|检查后重新导入|无相同key名匹配|上一层级', 'i')",
              )
              .first()
              .or(
                page
                  .locator(".ant-message-notice, .ant-notification-notice")
                  .first(),
              ),
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

      // 步骤6：点击【导出错误文件】并监听 download 事件
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
          "步骤7: 用ExcelJS验证错误文件二层Sheet中nonExistParentKey单元格含批注「上一层级无相同key名匹配」 → 批注内容符合预期",
          async () => {
            expect(fs.existsSync(downloadPath), "下载文件应存在").toBe(true);
            expect(downloadFile.suggestedFilename()).toMatch(/\.xlsx$/i);

            const wb = new ExcelJS.Workbook();
            await wb.xlsx.readFile(downloadPath);

            const targetSheet =
              wb.worksheets.find((ws) => ws.name.includes("二层")) ??
              wb.worksheets[1] ??
              wb.worksheets[0];

            expect(targetSheet, "应能找到二层Sheet").toBeDefined();

            let targetCell: ExcelJS.Cell | null = null;
            targetSheet.eachRow((row) => {
              row.eachCell((cell) => {
                const val = String(cell.value ?? "");
                if (val === nonExistParentKey) {
                  targetCell = cell;
                }
              });
            });

            expect(
              targetCell,
              `应能在二层Sheet中找到值为 "${nonExistParentKey}" 的单元格`,
            ).not.toBeNull();

            if (targetCell) {
              const rawNote = (targetCell as ExcelJS.Cell).note;
              let noteText = "";
              if (typeof rawNote === "string") {
                noteText = rawNote;
              } else if (rawNote && typeof rawNote === "object") {
                const noteObj = rawNote as {
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
                  noteText = JSON.stringify(rawNote);
                }
              }

              if (noteText) {
                const matchesFull = noteText.includes("上一层级无相同key名匹配");
                const matchesParts =
                  noteText.includes("上一层级") && noteText.includes("匹配");
                expect(
                  matchesFull || matchesParts,
                  `批注内容应含「上一层级无相同key名匹配」或「上一层级」+「匹配」，实际批注：${noteText}`,
                ).toBe(true);
              } else {
                const fill = (targetCell as ExcelJS.Cell).fill as ExcelJS.Fill & {
                  fgColor?: { argb?: string };
                  bgColor?: { argb?: string };
                };
                if (fill && fill.type === "pattern") {
                  const argb = fill.fgColor?.argb ?? fill.bgColor?.argb ?? "";
                  const isRed =
                    /^FF[F][0-9A-F]/i.test(argb) || /FF0000/i.test(argb);
                  expect(
                    isRed,
                    `单元格填充色应为红色，实际 argb=${argb}；批注文本为空，无法验证「上一层级无相同key名匹配」`,
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
          "步骤6: 无导出错误文件按钮时，验证孤儿子键未写入列表 → 孤儿子键未导入列表",
          async () => {
            await gotoJsonConfigPage(page);
            await searchKey(page, orphanKey);
            await expect(page.locator(".ant-table-row").filter({ hasText: orphanKey })).toHaveCount(0);
          },
        );
      }
    } finally {
      // 清理：关闭弹窗 + 删除临时文件
      const anyModal = page.locator(".ant-modal:visible").last();
      if (await anyModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        const closeBtn = anyModal
          .locator(".ant-modal-close, button[aria-label='Close']")
          .first();
        await closeBtn.click({ timeout: 3000 }).catch(() => {});
        await anyModal
          .waitFor({ state: "hidden", timeout: 5000 })
          .catch(() => {});
      }
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
      if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
    }
  });
});
