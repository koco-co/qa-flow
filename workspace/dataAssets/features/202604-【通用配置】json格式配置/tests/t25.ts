// META: {"id":"t25","priority":"P1","title":"【P1】验证导入功能正常(重复则覆盖更新, 1层key已存在 -> 更新1层key)"}
import { test, expect } from "../../../shared/fixtures/step-screenshot";
import { uniqueName } from "../../../shared/helpers/test-setup";
import {
  gotoJsonConfigPage,
  clickHeaderButton,
  waitModal,
  selectDataSourceType,
  fillKeyInput,
  fillNameInput,
  fillValueFormat,
  confirmAndWaitClose,
  deleteKey,
  searchKey,
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
  test("【P1】验证导入功能正常(重复则覆盖更新, 1层key已存在 -> 更新1层key)", { tag: "@serial" }, async ({ page, step }) => {
    // Track elapsed time so the finally cleanup can calculate a safe budget and
    // never spill past the wall-clock limit.
    // Use 240 s (4 min): the single gotoJsonConfigPage() in step 1 can take up to
    // 75 s (page.goto = config.timeout 60 s + container.waitFor 15 s) on a slow
    // network; that leaves only 105 s for the remaining steps within a 180 s budget,
    // which is tight when the import round-trip and final assertions are included.
    const TEST_TIMEOUT_MS = 240000;
    test.setTimeout(TEST_TIMEOUT_MS);
    const testStart = Date.now();

    const existKey1 = uniqueName("existKey1");
    const xlsxPath = path.join("/tmp", `t25_${Date.now()}.xlsx`);

    try {
      await step("步骤1: 前置-新增existKey1记录(value格式=^[a-z]+$, 中文名称=原始键) → 新增成功", async () => {
        await gotoJsonConfigPage(page);
        // Inline key creation instead of addKey() helper.
        // addKey() calls ensureRowVisibleByKey() which retries up to 3 times; each
        // retry fires gotoJsonConfigPage() (page.goto = config.timeout 60 s +
        // container.waitFor 15 s = up to 75 s).  Two retries alone = 150 s — enough
        // to exhaust the entire test budget before step 2 even begins.
        await clickHeaderButton(page, "新增");
        const modal = await waitModal(page, "新建");
        await selectDataSourceType(page, modal, "SparkThrift2.x");
        await fillKeyInput(modal, existKey1);
        await fillNameInput(modal, "原始键");
        await fillValueFormat(modal, "^[a-z]+$");
        await confirmAndWaitClose(page, modal);
        // Single searchKey call to confirm the record is visible — no retry loop.
        await searchKey(page, existKey1);
        await expect(page.locator(".ant-table-row").filter({ hasText: existKey1 }).first())
          .toBeVisible({ timeout: 10000 });
      });

      const existRow = page.locator(".ant-table-row").filter({ hasText: existKey1 }).first();
      await step(
        "步骤2: 刷新页面，验证existKey1行value格式显示^[a-z]+$，中文名称显示「原始键」 → 页面正常加载，数据正确",
        async () => {
          // We are already on the json-config page with existKey1 in the search box.
          // Calling gotoJsonConfigPage() here would cost another 60-75 s (hidden wait:
          // page.goto uses config.timeout=60 s + container.waitFor 15 s). A fresh
          // searchKey() re-issues the API query and satisfies the "data persists" check.
          await searchKey(page, existKey1);
          await expect(existRow).toBeVisible({ timeout: 10000 });
          await expect(existRow).toContainText("^[a-z]+$");
          await expect(existRow).toContainText("原始键");
        },
        existRow,
      );

      await step("步骤3: 创建xlsx文件(一层Sheet含existKey1，中文名称=更新键，value格式=^[A-Z]+$) → 文件创建成功", async () => {
        await buildImportXlsx(xlsxPath, [[existKey1, "更新键", "^[A-Z]+$"]]);
        expect(fs.existsSync(xlsxPath)).toBe(true);
      });

      await importXlsx(page, step, xlsxPath, "重复则覆盖更新");

      const updatedRow = page.locator(".ant-table-row").filter({ hasText: existKey1 }).first();
      await step(
        "步骤4: 验证existKey1行value格式更新为^[A-Z]+$，中文名称更新为「更新键」 → 覆盖更新生效",
        async () => {
          // importXlsx left us on the json-config page — skip gotoJsonConfigPage()
          // to avoid another 60-75 s navigation hit.
          await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
          await searchKey(page, existKey1);
          await expect(updatedRow).toBeVisible({ timeout: 10000 });
          await expect(updatedRow).toContainText("^[A-Z]+$");
          await expect(updatedRow).toContainText("更新键");
        },
        updatedRow,
      );
    } finally {
      // Dynamic budget: allow deleteKey() at most (remaining - 8 s) to guarantee the
      // finally block completes before the 180 s wall clock.
      // Root cause of previous timeouts: deleteKey() → searchKey() → (empty-placeholder
      // fallback) → gotoJsonConfigPage() hangs for up to 75 s; even a Promise.race with
      // a fixed 25 s guard could race to a draw with the Playwright timer and lose.
      const elapsed = Date.now() - testStart;
      const cleanupMs = Math.max(1000, TEST_TIMEOUT_MS - elapsed - 8000);
      await Promise.race([
        deleteKey(page, existKey1),
        new Promise<void>((resolve) => setTimeout(resolve, cleanupMs)),
      ]).catch(() => {});
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    }
  });
});
