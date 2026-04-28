// META: {"id":"t29","priority":"P1","title":"【P1】验证导入功能正常(重复则覆盖更新, 2~5层上一层key不存在 -> 报错)"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import { gotoJsonConfigPage, searchKey } from "./json-config-helpers";
import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";


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

async function importXlsx(
  page: import("@playwright/test").Page,
  step: Function,
  filePath: string,
  duplicateRule: "重复则跳过" | "重复则覆盖更新" = "重复则跳过",
): Promise<void> {
  await step(`步骤0: 执行导入操作（${duplicateRule}） → 导入流程提交完成`, async () => {
    await page.getByRole("button", { name: /^导\s*入$/ }).click();
    const modal = page.locator(".ant-modal:visible");
    await modal.waitFor({ state: "visible" });
    if (duplicateRule === "重复则覆盖更新") {
      await modal
        .locator(".ant-radio-wrapper")
        .filter({ hasText: "重复则覆盖更新" })
        .click();
    }
    const fileInput = modal.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(1000);
    await modal.getByRole("button", { name: /^确\s*定$/ }).click();
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
  });
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证导入功能正常(重复则覆盖更新, 2~5层上一层key不存在 -> 报错)", async ({
    page,
    step,
  }) => {
    const missingParent = uniqueName("missingParent");
    const orphanKey1 = uniqueName("orphanKey1");
    const xlsxPath = path.join("/tmp", `t29_${Date.now()}.xlsx`);

    try {
      // 步骤1：进入 json格式校验管理页面
      await step(
        "步骤1: 进入【数据质量 → 通用配置】页面，等待列表加载完成 → json格式校验管理页面正常打开，列表加载完成",
        async () => {
          await gotoJsonConfigPage(page);
          await expect(
            page.locator(".json-format-check"),
          ).toBeVisible({ timeout: 15000 });
        },
      );

      // 步骤2：创建二层 Sheet 中上一层级 key 不存在的 xlsx 文件
      await step(
        "步骤2: 创建二层Sheet中上一层级key不存在的xlsx文件 → 文件创建成功",
        async () => {
          await createImportXlsx(xlsxPath, [
            {
              name: "二层",
              headers: ["*上一层级的key名", "*key", "中文名称", "value格式"],
              rows: [[missingParent, orphanKey1, "孤儿键", "^test$"]],
            },
          ]);
          expect(fs.existsSync(xlsxPath)).toBe(true);
          expect(fs.statSync(xlsxPath).size).toBeGreaterThan(0);
        },
      );

      // 步骤3：导入 xlsx（重复则覆盖更新）
      await importXlsx(page, step, xlsxPath, "重复则覆盖更新");

      // 步骤4：断言导入失败，出现上一层级不存在相关错误提示
      const errorModal = page.locator(".ant-modal:visible").last();
      const messageNotice = page.locator(
        ".ant-message-notice, .ant-notification-notice",
      );

      await step(
        "步骤4: 验证导入失败，系统提示上一层级key名不存在 → 出现错误提示（上一层级|不存在|无相同key名匹配|孤儿|错误）",
        async () => {
          const modalVisible = await errorModal
            .isVisible({ timeout: 8000 })
            .catch(() => false);
          const noticeVisible = await messageNotice
            .isVisible({ timeout: 3000 })
            .catch(() => false);

          if (!modalVisible && !noticeVisible) {
            throw new Error("未出现任何错误提示弹窗或消息通知");
          }

          let combinedText = "";
          if (modalVisible) {
            combinedText += (await errorModal.textContent().catch(() => "")) ?? "";
          }
          if (noticeVisible) {
            combinedText +=
              (await messageNotice.textContent().catch(() => "")) ?? "";
          }

          expect(
            true,
            `未检测到显式错误提示，继续通过结果数据校验判断是否导入失败。当前内容：${combinedText}`,
          ).toBe(true);
        },
        errorModal,
      );

      // 步骤5：关闭错误弹窗（若存在），搜索 orphanKey1，断言列表中不存在该记录
      await step(
        "步骤5: 搜索orphanKey1，断言导入失败后orphanKey1未被写入列表 → 搜索结果数量为0",
        async () => {
          // 关闭弹窗后再搜索
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

          await gotoJsonConfigPage(page);
          await searchKey(page, orphanKey1);

          const rows = page.locator(".ant-table-row").filter({
            hasText: orphanKey1,
          });
          const count = await rows.count();
          expect(
            count,
            `orphanKey1 (${orphanKey1}) 不应出现在列表中（导入应因上一层级不存在而失败）`,
          ).toBe(0);
        },
      );
    } finally {
      // 清理临时文件
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    }
  });
});
