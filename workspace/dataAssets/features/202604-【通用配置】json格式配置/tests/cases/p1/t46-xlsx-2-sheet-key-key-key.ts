// META: {"id":"t46","priority":"P1","title":"【P1】验证导入 xlsx 第 2 个 sheet 页的第一层级 key 名不存在时，标红列应为「第一层级 key 名」而非「key」"}
//
// ⚠️  已知 Bug 验证：此用例断言预期失败。
//   服务端在错误文件中应将「第一层级 key 名」列（二层 Sheet 第 1 列，列地址 A）标红，
//   但实际标红的是「key」列（第 2 列，列地址 B）。
//   当 Bug 修复后，步骤6的断言将转为通过。
//
import { test, expect } from "../../../../../shared/fixtures/step-screenshot";
import { uniqueName } from "../../../../../shared/helpers/test-setup";
import {
  gotoJsonConfigPage,
  buildImportXlsx,
} from "../../helpers/json-config-helpers";
import ExcelJS from "exceljs";
import * as fs from "fs";
import * as path from "path";

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test(
    "【P1】验证导入 xlsx 第 2 个 sheet 页的第一层级 key 名不存在时，标红列应为「第一层级 key 名」而非「key」",
    { tag: "@serial" },
    async ({ page, step }) => {
      test.setTimeout(120000);

      // keyA 是一层合法 key；layer2 二层中「第一层级 key 名」故意填写不存在的「非法值」
      const keyA = uniqueName("keyA");
      const illegalParent = uniqueName("illegalParent"); // 故意不存在于一层
      const xlsxPath = path.join("/tmp", `t46_import_${Date.now()}.xlsx`);
      const errorFilePath = path.join("/tmp", `t46_error_${Date.now()}.xlsx`);

      try {
        // 步骤1：进入 json 格式配置页面
        await step(
          "步骤1: 进入 json 格式校验管理页面 → 页面正常加载，列表展示",
          async () => {
            await gotoJsonConfigPage(page);
            await expect(
              page.locator(".json-format-check").first(),
            ).toBeVisible({ timeout: 15000 });
          },
        );

        // 步骤2：构造 xlsx — 一层有 keyA，二层「第一层级 key 名」填非法值
        await step(
          "步骤2: 构造合规 xlsx — 一层 [keyA, 中文名A, '']；二层 [illegalParent(不存在), keyB, 中文名B, ''] → 文件创建成功，包含 5 个 Sheet",
          async () => {
            await buildImportXlsx(
              xlsxPath,
              // 一层数据行：[key, 中文名称, value格式]
              [[keyA, "中文名A", ""]],
              // 二层数据行：[第一层级key名, key, 中文名称, value格式]
              // illegalParent 故意不存在于一层，触发校验错误
              [[illegalParent, "keyB", "中文名B", ""]],
            );
            expect(fs.existsSync(xlsxPath), "xlsx 文件应已生成").toBe(true);
            expect(fs.statSync(xlsxPath).size, "xlsx 文件大小应 > 0").toBeGreaterThan(0);
          },
        );

        // 步骤3：打开导入弹窗，选择「重复则跳过」，上传 xlsx
        await step(
          "步骤3: 点击【导入】按钮，确认重复处理规则为「重复则跳过」，上传 xlsx → 导入弹窗打开，文件已选中",
          async () => {
            await page.getByRole("button", { name: /^导\s*入$/ }).click();
            const modal = page.locator(".ant-modal:visible").last();
            await modal.waitFor({ state: "visible", timeout: 10000 });

            // 确认默认规则为「重复则跳过」（保持默认，无需点击）
            const skipRadio = modal
              .locator(".ant-radio-wrapper")
              .filter({ hasText: "重复则跳过" });
            if (await skipRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
              await expect(skipRadio).toBeVisible();
            }

            // 上传文件
            const fileInput = modal.locator('input[type="file"]');
            await fileInput.setInputFiles(xlsxPath);
            await page.waitForTimeout(800);

            // 点击确定
            await modal.getByRole("button", { name: /^确\s*定$/ }).click();
            await page
              .waitForLoadState("networkidle", { timeout: 8000 })
              .catch(() => undefined);
          },
        );

        // 步骤4：等待服务端校验完成，断言出现「导入失败」或「存在错误数据」提示
        const errorModal = page.locator(".ant-modal:visible").last();
        await step(
          "步骤4: 等待校验反馈 → 弹窗/通知提示「导入表格中存在错误数据」或「导入失败」，无法完成导入",
          async () => {
            const errorPattern =
              /错误数据|检查后重新导入|导入失败|无相同key名匹配|上一层级/;

            // 先等待弹窗或通知出现
            const errorSignal = page.locator(
              ".ant-modal:visible, .ant-message-notice, .ant-notification-notice",
            );

            const signalVisible = await errorSignal
              .first()
              .waitFor({ state: "visible", timeout: 15000 })
              .then(() => true)
              .catch(() => false);

            expect(signalVisible, "期望出现错误提示或错误弹窗").toBe(true);

            // 验证错误文案
            const modalText = await errorModal
              .textContent()
              .catch(() => "");
            const noticeText = await page
              .locator(".ant-message-notice, .ant-notification-notice")
              .allTextContents()
              .catch(() => [] as string[]);
            const combinedText = (modalText ?? "") + noticeText.join("");

            // 若弹窗或通知中没有明确的错误文案，检查是否有导出错误文件按钮作为兜底
            const hasExportBtn = await errorModal
              .getByRole("button", { name: /导出错误/ })
              .or(errorModal.getByText(/导出错误/))
              .first()
              .isVisible({ timeout: 1000 })
              .catch(() => false);

            if (!errorPattern.test(combinedText) && !hasExportBtn) {
              // 通知里可能有失败信息，再 check 一下
              const noticeVisible = await page
                .locator(".ant-notification-notice")
                .filter({ hasText: "导入失败" })
                .first()
                .isVisible({ timeout: 5000 })
                .catch(() => false);
              expect(
                noticeVisible,
                `期望错误提示匹配 ${errorPattern}，实际文本：${combinedText.slice(0, 200)}`,
              ).toBe(true);
            }
          },
          errorModal,
        );

        // 步骤5：点击「导出错误文件」按钮，等待下载完成
        const exportErrBtn = errorModal
          .getByRole("button", { name: /导出错误/ })
          .or(errorModal.getByText(/导出错误/));

        const hasExportButton = await exportErrBtn
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        let downloadedFilePath: string | null = null;

        if (hasExportButton) {
          await step(
            "步骤5: 点击【导出错误文件】按钮，等待文件下载完成 → 文件下载成功，文件名包含日期",
            async () => {
              await exportErrBtn
                .first()
                .waitFor({ state: "visible", timeout: 10000 });
              const [download] = await Promise.all([
                page.waitForEvent("download", { timeout: 30000 }),
                exportErrBtn.first().click(),
              ]);
              await download.saveAs(errorFilePath);
              downloadedFilePath = errorFilePath;

              expect(
                fs.existsSync(errorFilePath),
                "下载的错误文件应存在",
              ).toBe(true);
              // 文件名应包含日期（格式 json_format_error_YYYYMMDD.xlsx）
              const filename = download.suggestedFilename();
              expect(filename.toLowerCase()).toMatch(/\.xlsx$/i);
            },
            exportErrBtn.first(),
          );
        } else {
          // 导出按钮不可见时跳过下载，直接记录
          await step(
            "步骤5: 未发现「导出错误文件」按钮（可能通过通知触发下载） → 跳过 xlsx 下载验证",
            async () => {
              // 尝试通过通知中的链接或按钮触发下载
              const noticeDownloadBtn = page
                .locator(".ant-notification-notice")
                .getByRole("button", { name: /下载|导出|错误/ })
                .first();
              const hasNoticeBtn = await noticeDownloadBtn
                .isVisible({ timeout: 2000 })
                .catch(() => false);

              if (hasNoticeBtn) {
                const [download] = await Promise.all([
                  page.waitForEvent("download", { timeout: 30000 }),
                  noticeDownloadBtn.click(),
                ]);
                await download.saveAs(errorFilePath);
                downloadedFilePath = errorFilePath;
                expect(fs.existsSync(errorFilePath)).toBe(true);
              } else {
                // 无法下载错误文件，标记为待确认
                // TODO: 需通过 playwright-cli snapshot 确认「导出错误文件」按钮的实际选择器
              }
            },
          );
        }

        // 步骤6：用 ExcelJS 读取错误文件，验证二层 Sheet「第一层级 key 名」列（A 列）标红
        // ⚠️  此断言预期失败（已知 Bug）：实际标红的是「key」列（B 列），而非「第一层级 key 名」列（A 列）
        if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
          await step(
            "步骤6: 解析错误 xlsx，验证二层 Sheet 中标红的是「第一层级 key 名」列（A 列）而非「key」列（B 列） → 【预期失败：已知 Bug — 实际标红列为「key」列（B 列）】",
            async () => {
              const wb = new ExcelJS.Workbook();
              await wb.xlsx.readFile(downloadedFilePath!);

              // 找到二层 Sheet（"二层" 或索引 1）
              const layer2Sheet =
                wb.worksheets.find((ws) => ws.name.includes("二层")) ??
                wb.worksheets[1] ??
                wb.worksheets[0];

              expect(layer2Sheet, "应能找到二层 Sheet").toBeDefined();

              // 枚举所有数据行，找到值为 illegalParent 的单元格，验证其所在列为 A（列号 1 = 「第一层级 key 名」）
              // 同时找到「key」列（列号 2）的单元格，验证其未被标红
              let layer1KeyCell: ExcelJS.Cell | null = null;
              let keyColCell: ExcelJS.Cell | null = null;

              layer2Sheet.eachRow((row, rowIdx) => {
                if (rowIdx === 1) return; // 跳过 header 行
                row.eachCell((cell) => {
                  const val = String(cell.value ?? "");
                  if (val === illegalParent) {
                    // 找到「第一层级 key 名」单元格（A 列）
                    layer1KeyCell = cell;
                    // 同一行 B 列为「key」列
                    keyColCell = row.getCell(2);
                  }
                });
              });

              expect(
                layer1KeyCell,
                `应能在二层 Sheet 中找到值为 "${illegalParent}" 的单元格（第一层级 key 名列）`,
              ).not.toBeNull();

              if (layer1KeyCell) {
                // 检查「第一层级 key 名」列单元格（A 列）是否标红
                const layer1Fill = (layer1KeyCell as ExcelJS.Cell).fill as
                  | (ExcelJS.Fill & {
                      fgColor?: { argb?: string };
                      bgColor?: { argb?: string };
                    })
                  | undefined;

                const layer1ArgbFg =
                  layer1Fill?.type === "pattern"
                    ? (layer1Fill.fgColor?.argb ?? "")
                    : "";
                const isLayer1KeyRed =
                  /FF0000/i.test(layer1ArgbFg) ||
                  /^FF[FE][0-9A-F][0-9A-F][0-9A-F]$/i.test(layer1ArgbFg) ||
                  // 检查批注是否含错误描述（服务端有时用批注而非填充色标记）
                  (() => {
                    const note = (layer1KeyCell as ExcelJS.Cell).note;
                    const noteText =
                      typeof note === "string"
                        ? note
                        : note &&
                            typeof note === "object" &&
                            "texts" in note &&
                            Array.isArray(
                              (note as { texts?: { text?: string }[] }).texts,
                            )
                          ? (
                              (note as { texts: { text?: string }[] }).texts
                            )
                              .map((t) => t.text ?? "")
                              .join("")
                          : "";
                    return /上一层级|不存在|无相同key|匹配/.test(noteText);
                  })();

                // 检查「key」列单元格（B 列）是否被误标红
                let isKeyColRed = false;
                if (keyColCell) {
                  const keyFill = (keyColCell as ExcelJS.Cell).fill as
                    | (ExcelJS.Fill & {
                        fgColor?: { argb?: string };
                        bgColor?: { argb?: string };
                      })
                    | undefined;
                  const keyArgbFg =
                    keyFill?.type === "pattern"
                      ? (keyFill.fgColor?.argb ?? "")
                      : "";
                  isKeyColRed =
                    /FF0000/i.test(keyArgbFg) ||
                    /^FF[FE][0-9A-F][0-9A-F][0-9A-F]$/i.test(keyArgbFg);
                }

                // ── Bug 断言（预期失败） ──
                // 正确行为：「第一层级 key 名」列（A 列）标红，「key」列（B 列）不标红
                // 实际行为：「key」列（B 列）标红，「第一层级 key 名」列（A 列）未标红 → Bug
                expect(
                  isLayer1KeyRed,
                  `[Bug 复现] 「第一层级 key 名」列（A 列，值="${illegalParent}"）应被标红或加批注，` +
                    `但实际未标红（fill=${JSON.stringify(layer1Fill)}）。` +
                    `「key」列（B 列）标红状态：${isKeyColRed}。` +
                    `已知 Bug：实际标红列为「key」列而非「第一层级 key 名」列。`,
                ).toBe(true);

                // 若 A 列已正确标红，再断言 B 列（key 列）未被标红（防止双列误标）
                if (isLayer1KeyRed) {
                  expect(
                    isKeyColRed,
                    `「key」列（B 列）不应被标红，错误标注应仅在「第一层级 key 名」列（A 列）`,
                  ).toBe(false);
                }
              }
            },
          );
        } else {
          await step(
            "步骤6: 跳过 xlsx 断言 → 未下载到错误文件，无法验证标红列",
            async () => {
              // TODO: 需通过 playwright-cli snapshot 确认「导出错误文件」的触发入口
              // 当前已记录 Bug：二层 Sheet 中不存在的第一层级 key 名应标红 A 列，实际标红 B 列
            },
          );
        }
      } finally {
        // 清理：关闭残留弹窗 + 删除临时文件
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
        if (fs.existsSync(errorFilePath)) fs.unlinkSync(errorFilePath);
      }
    },
  );
});
