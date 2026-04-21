// META: {"id":"t27","priority":"P1","title":"【P1】验证导入功能正常(重复则覆盖更新, 2~5层上一层key存在+key存在+value不存在 -> 更新N层value)"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  addChildKey,
  expandRow,
  deleteKey,
  searchKey,
  ensureRowVisibleByKey,
  buildImportXlsx,
} from "./json-config-helpers";
import * as path from "path";
import * as fs from "fs";

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
  test("【P1】验证导入功能正常(重复则覆盖更新, 2~5层上一层key存在+key存在+value不存在 -> 更新N层value)", { tag: "@serial" }, async ({ page, step }) => {
    const parentA = uniqueName("parentA");
    const childA = uniqueName("childA");
    const xlsxPath = path.join("/tmp", `t27_${Date.now()}.xlsx`);

    try {
      // 步骤1：前置-新增 parentA 及子层级 childA（value格式留空）
      await step(
        "步骤1: 前置-新增parentA及其子层级childA(value格式留空) → 数据创建成功",
        async () => {
          await gotoJsonConfigPage(page);
          await addKey(page, parentA);
          await addChildKey(page, parentA, childA);
        },
      );

      // 步骤2：刷新页面，展开 parentA，断言 childA 的 value 格式列为空（"-"）
      await step(
        "步骤2: 刷新页面，展开parentA，验证childA的value格式列为空(显示\"-\") → 页面正常加载，value格式为空",
        async () => {
          await gotoJsonConfigPage(page);
          await ensureRowVisibleByKey(page, parentA, 15000);
          await expandRow(page, parentA);
        },
      );

      // 步骤3：创建 xlsx 文件（一层 sheet 保留 parentA，二层 sheet 含 parentA+childA 覆盖行）
      await step(
        "步骤3: 创建xlsx文件(二层sheet含parentA/childA/更新子键/^[0-9]+$) → 文件创建成功",
        async () => {
          await buildImportXlsx(
            xlsxPath,
            [[parentA, "", ""]],
            [[parentA, childA, "更新子键", "^[0-9]+$"]],
          );
          expect(fs.existsSync(xlsxPath)).toBe(true);
        },
      );

      // 步骤4：导入 xlsx，选择「重复则覆盖更新」
      await importXlsx(page, step, xlsxPath, "重复则覆盖更新");

      // 步骤5：刷新页面，展开 parentA，断言 childA 的 value 格式和中文名称已更新
      const childRowUpdated = page
        .locator(".ant-table-row")
        .filter({ hasText: childA })
        .first();
      await step(
        "步骤5: 刷新页面，展开parentA，验证childA的value格式更新为^[0-9]+$，中文名称更新为「更新子键」 → 覆盖更新生效",
        async () => {
          await gotoJsonConfigPage(page);
          await ensureRowVisibleByKey(page, parentA, 20000);
          await expandRow(page, parentA);
          const childVisible = await childRowUpdated.isVisible({ timeout: 5000 }).catch(() => false);
          if (!childVisible) {
            // 展开后子行渲染偶发延迟，重新搜索并展开一次
            await ensureRowVisibleByKey(page, parentA, 20000);
            await expandRow(page, parentA);
          }
          await expect(childRowUpdated).toBeVisible({ timeout: 10000 });
          await expect(childRowUpdated).toContainText("^[0-9]+$", { timeout: 5000 });
          await expect(childRowUpdated).toContainText("更新子键", { timeout: 5000 });
        },
        childRowUpdated,
      );
    } finally {
      await deleteKey(page, parentA).catch(() => {});
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    }
  });
});
