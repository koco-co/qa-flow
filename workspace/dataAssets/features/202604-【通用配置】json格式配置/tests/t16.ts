// META: {"id":"t16","priority":"P0","title":"【P0】验证导入正确文件全流程（重复则跳过）"}
import { test, expect } from "../../../shared/fixtures/step-screenshot";
import { uniqueName } from "../../../shared/helpers/test-setup";
import {
  gotoJsonConfigPage,
  expandRow,
  deleteKey,
  searchKey,
  clearSearch,
  buildImportXlsx,
} from "./json-config-helpers";
import * as path from "path";
import * as fs from "fs";

async function importXlsx(
  page: import("@playwright/test").Page,
  step: Function,
  filePath: string,
  duplicateRule: "重复则跳过" | "重复则覆盖更新" = "重复则跳过",
) {
  await step(`步骤0: 执行导入操作（${duplicateRule}） → 导入流程提交完成`, async () => {
    // 等待导入按钮可点击（上一个弹窗关闭后页面稳定）
    const importBtn = page.getByRole("button", { name: /^导\s*入$/ });
    await importBtn.waitFor({ state: "visible", timeout: 10000 });
    await importBtn.click();
    const modal = page.locator(".ant-modal:visible");
    await modal.waitFor({ state: "visible", timeout: 10000 });
    if (duplicateRule === "重复则覆盖更新") {
      await modal
        .locator(".ant-radio-wrapper")
        .filter({ hasText: "重复则覆盖更新" })
        .click();
    }
    const fileInput = modal.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    // 等待文件显示在上传列表中
    await modal.locator(".ant-upload-list-item").waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    await modal.getByRole("button", { name: /^确\s*定$/ }).click();
    // 等待弹窗关闭（表示导入已提交），再等表格刷新
    await modal.waitFor({ state: "hidden", timeout: 30000 });
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(2000);
  });
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P0】验证导入正确文件全流程（重复则跳过）", { timeout: 180000, tag: "@serial" }, async ({ page, step }) => {
    const importKey1 = uniqueName("importKey1");
    const importKey2 = uniqueName("importKey2");
    const subImport1 = uniqueName("subImport1");
    const xlsxPath = path.join("/tmp", `t16_${Date.now()}.xlsx`);

    try {
      // 步骤1：进入json格式校验管理页面
      await step(
        "步骤1: 进入【数据质量 → 通用配置】页面 → json格式校验管理页面打开，列表显示已有key数据",
        async () => {
          await gotoJsonConfigPage(page);
          await expect(
            page.locator(".ant-table, .json-format-check").first(),
          ).toBeVisible({ timeout: 15000 });
        },
      );

      // 步骤2：创建xlsx文件（按模板列结构：一层 key/中文名称/value格式，二层 第一层级key名/key/中文名称/value格式）
      await step(
        "步骤2: 创建包含两个Sheet的xlsx文件 → 文件创建成功",
        async () => {
          await buildImportXlsx(
            xlsxPath,
            [
              [importKey1, "导入键一", "^[a-z]+$"],
              [importKey2, "导入键二", ""],
            ],
            [[importKey1, subImport1, "子导入键一", "^\\d+$"]],
          );
          expect(fs.existsSync(xlsxPath)).toBe(true);
        },
      );

      // 步骤3+4：点击导入按钮 → 验证弹窗默认状态，然后上传文件并确认
      await step(
        "步骤3: 点击导入按钮 → 弹出导入弹窗，标题含「导入」，重复处理规则默认选中「重复则跳过」，上传文件并导入",
        async () => {
          const importBtn = page.getByRole("button", { name: /^导\s*入$/ });
          await importBtn.waitFor({ state: "visible", timeout: 10000 });
          await importBtn.click();
          const modal = page.locator(".ant-modal:visible");
          await modal.waitFor({ state: "visible", timeout: 10000 });
          await expect(modal.locator(".ant-modal-title")).toContainText("导入", {
            timeout: 5000,
          });
          const skipRadio = modal
            .locator(".ant-radio-wrapper")
            .filter({ hasText: "重复则跳过" });
          await expect(skipRadio).toBeVisible();
          // 默认选中的 radio 其 input 有 checked 属性
          const skipRadioInput = skipRadio.locator("input[type='radio']");
          await expect(skipRadioInput).toBeChecked({ timeout: 3000 });
          // 直接在此弹窗中上传文件并确认
          const fileInput = modal.locator('input[type="file"]');
          await fileInput.setInputFiles(xlsxPath);
          await modal.locator(".ant-upload-list-item").waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
          await modal.getByRole("button", { name: /^确\s*定$/ }).click();
          // 等待弹窗关闭（导入成功后自动关闭），最多等 30 秒
          await modal.waitFor({ state: "hidden", timeout: 30000 });
          await page.waitForTimeout(2000);
        },
      );

      // 步骤5：搜索 importKey1，验证出现在列表第一层级
      await step(
        "步骤5: 验证importKey1出现在列表第一层级，含「导入键一」和「^[a-z]+$」 → 导入成功",
        async () => {
          await searchKey(page, importKey1);
          const importKey1Row = page
            .locator(".ant-table-row")
            .filter({ hasText: importKey1 })
            .first();
          await expect(importKey1Row).toBeVisible({ timeout: 10000 });
          await expect(importKey1Row).toContainText("导入键一");
          await expect(importKey1Row).toContainText("^[a-z]+$");
        },
      );

      // 步骤6：搜索 importKey2，验证出现在列表第一层级
      await step(
        "步骤6: 验证importKey2出现在列表第一层级，含「导入键二」，value格式列为空或「-」 → 导入成功",
        async () => {
          await searchKey(page, importKey2);
          const importKey2Row = page
            .locator(".ant-table-row")
            .filter({ hasText: importKey2 })
            .first();
          await expect(importKey2Row).toBeVisible({ timeout: 10000 });
          await expect(importKey2Row).toContainText("导入键二");
          await expect(importKey2Row).toContainText("--");
        },
      );

      // 步骤7：搜索 importKey1，展开验证子层级 subImport1
      await step(
        "步骤7: 展开importKey1 → 子层级subImport1可见，中文名称显示「子导入键一」",
        async () => {
          // 搜索 importKey1 并等待父行可见后再展开
          // 若首次搜索后父行未出现（可能因并发请求竞态），重试一次
          await searchKey(page, importKey1);
          const importKey1RowForExpand = page
            .locator(".ant-table-row")
            .filter({ hasText: importKey1 })
            .first();
          const parentVisible = await importKey1RowForExpand
            .isVisible({ timeout: 5000 })
            .catch(() => false);
          if (!parentVisible) {
            // 竞态保护：重新搜索一次
            await searchKey(page, importKey1);
          }
          await expandRow(page, importKey1);
          const subRow = page
            .locator(".ant-table-row")
            .filter({ hasText: subImport1 })
            .first();
          await expect(subRow).toBeVisible({ timeout: 10000 });
          await expect(subRow).toContainText("子导入键一");
          await clearSearch(page);
        },
      );
    } finally {
      await deleteKey(page, importKey1).catch(() => {});
      await deleteKey(page, importKey2).catch(() => {});
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    }
  });
});
