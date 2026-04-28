// META: {"id":"t32","priority":"P1","title":"【P1】验证导入功能正常(重复则跳过, 1层key不存在 -> 新增1层key)"}
import { test, expect } from "../../../../../shared/fixtures/step-screenshot";
import {
  uniqueName,
} from "../../../../../shared/helpers/test-setup";
import { gotoJsonConfigPage, searchKey, buildImportXlsx } from "../../helpers/json-config-helpers";
import * as path from "path";
import * as fs from "fs";

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

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证导入功能正常(重复则跳过, 1层key不存在 -> 新增1层key)", { tag: "@serial" }, async ({ page, step }) => {
    const skipNewKey1 = uniqueName("skipNewKey1");
    const xlsxPath = path.join("/tmp", `t32_${Date.now()}.xlsx`);

    try {
      await step("步骤1: 进入json格式校验管理页面 → 页面正常加载", async () => {
        await gotoJsonConfigPage(page);
        await expect(
          page.locator(".ant-table, .json-format-check, .json-validation-config, [class*='jsonValid']").first(),
        ).toBeVisible({ timeout: 15000 });
      });

      await step("步骤2: 创建xlsx文件(含全新key skipNewKey1，中文名称=全新键，value=^\\d+$) → 文件创建成功", async () => {
        await buildImportXlsx(xlsxPath, [[skipNewKey1, "全新键", "^\\d+$"]]);
        expect(fs.existsSync(xlsxPath)).toBe(true);
      });

      await importXlsx(page, step, xlsxPath, "重复则跳过");

      const newRow = page.locator(".ant-table-row").filter({ hasText: skipNewKey1 }).first();
      await step(
        "步骤3: 验证skipNewKey1出现在列表中 → 新增1层key成功",
        async () => {
          await gotoJsonConfigPage(page);
          await searchKey(page, skipNewKey1);
          await expect(newRow).toBeVisible({ timeout: 10000 });
          await expect(newRow).toContainText("全新键");
        },
        newRow,
      );
    } finally {
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    }
  });
});
