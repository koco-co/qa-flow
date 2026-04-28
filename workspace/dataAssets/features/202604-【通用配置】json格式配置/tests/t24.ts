// META: {"id":"t24","priority":"P1","title":"【P1】验证导入功能正常(重复则覆盖更新, 1~5层key存在相同 -> 报错)"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import { gotoJsonConfigPage, deleteKey, searchKey } from "./json-config-helpers";
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
  await step(`步骤0: 执行导入操作（${duplicateRule}） → 导入流程提交完成`, async () => {
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
  test("【P1】验证导入功能正常(重复则覆盖更新, 1~5层key存在相同 -> 报错)", async ({ page, step }) => {
    const dupKey = uniqueName("dupKey");
    const xlsxPath = path.join("/tmp", `t24_${Date.now()}.xlsx`);

    try {
      // 步骤1：进入 json格式校验管理页面
      await step("步骤1: 进入【数据质量 → 通用配置】页面，等待列表加载完成 → json格式校验管理页面正常打开，列表加载完成", async () => {
        await gotoJsonConfigPage(page);
        const container = page.locator(".json-format-check");
        await expect(container).toBeVisible({ timeout: 15000 });
      });

      // 步骤2：创建含同层级重复 key 的 xlsx 文件
      await step("步骤2: 创建含同层级重复key的xlsx文件 → 文件创建成功", async () => {
        await createImportXlsx(xlsxPath, [
          {
            name: "一层",
            headers: ["*key", "中文名称", "value格式"],
            rows: [
              [dupKey, "重复键一", "^[a-z]+$"],
              [dupKey, "重复键二", "^[0-9]+$"],
            ],
          },
        ]);
        expect(fs.existsSync(xlsxPath)).toBe(true);
      });

      // 步骤3：导入 xlsx（重复则覆盖更新），使用共享的 importXlsx 函数
      await importXlsx(page, step, xlsxPath, "重复则覆盖更新");

      // 步骤4：断言导入失败，错误提示含重复 key 相关文案
      const errorHint = page.locator("body").filter({ hasText: /不可重复|相同/ });
      await step(
        "步骤4: 验证导入失败，系统报错提示「同一个层级下的key名不可重复」→ 导入失败，错误提示可见",
        async () => {
          // 错误提示可能出现在 modal 内或作为 Message toast
          const modalError = page.locator(".ant-modal:visible").filter({ hasText: /同一个层级下的key名不可重复|层级.*重复|重复/ });
          const messageError = page.locator(".ant-message-notice, .ant-notification-notice").filter({ hasText: /同一个层级下的key名不可重复|层级.*重复|重复/ });
          const toastOrModal = page.locator(".ant-modal:visible, .ant-message-notice, .ant-notification-notice, .ant-alert").filter({ hasText: /同一个层级下的key名不可重复|层级.*重复|不可重复|相同/ });

          const anyVisible =
            (await modalError.isVisible({ timeout: 5000 }).catch(() => false)) ||
            (await messageError.isVisible({ timeout: 5000 }).catch(() => false)) ||
            (await toastOrModal.isVisible({ timeout: 5000 }).catch(() => false)) ||
            (await errorHint.isVisible({ timeout: 5000 }).catch(() => false));

          expect(anyVisible, "期望导入失败并出现重复key错误提示").toBe(true);
        },
        errorHint,
      );

      // 步骤5：断言列表数据不变，dupKey 不应出现在列表中
      const dupKeyRows = page.locator(".ant-table-row").filter({ hasText: dupKey });
      await step(
        "步骤5: 验证列表数据不变，dupKey不应出现在列表中 → 列表中不存在dupKey记录",
        async () => {
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
          await gotoJsonConfigPage(page);
          await searchKey(page, dupKey);
          const count = await dupKeyRows.count();
          expect(count, "列表中不应存在dupKey记录（导入失败应回滚）").toBe(0);
        },
      );
    } finally {
      // 清理临时文件
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
      // 若误创建了 dupKey，尝试清理（catch 吞错）
      await deleteKey(page, dupKey).catch(() => {});
    }
  });
});
