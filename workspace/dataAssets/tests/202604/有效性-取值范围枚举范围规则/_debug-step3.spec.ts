/**
 * Debug script: inspect visible buttons on Step 2 (监控规则) page
 */
import { test } from "@playwright/test";
import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
  selectAntOption,
} from "../../helpers/test-setup";
import {
  injectProjectContext,
  QUALITY_PROJECT_ID,
  DORIS_DATABASE,
} from "./test-data";

test("debug: dump buttons on step 2 page", async ({ page }) => {
  await applyRuntimeCookies(page);

  // Navigate to new ruleset page
  const url = buildDataAssetsUrl("/dq/ruleSet/add", QUALITY_PROJECT_ID);
  await page.goto(url);

  // Inject project context then reload
  await injectProjectContext(page, QUALITY_PROJECT_ID);
  await page.reload();

  // Wait for page to load
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // ── Step 1: Fill datasource ──────────────────────────────────
  const sourceFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据源/ })
    .first();
  const sourceSelector = sourceFormItem.locator(".ant-select-selector").first();
  await sourceSelector.click();
  await page.waitForTimeout(500);
  const dsDropdown = page.locator(".ant-select-dropdown:visible");
  await dsDropdown.waitFor({ state: "visible", timeout: 5000 });
  await dsDropdown
    .locator(".ant-select-item-option")
    .filter({ hasText: /doris/i })
    .first()
    .click();
  await page.waitForTimeout(1000);

  // ── Step 1: Fill database ────────────────────────────────────
  const schemaFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据库/ })
    .first();
  await selectAntOption(
    page,
    schemaFormItem.locator(".ant-select-selector").first(),
    DORIS_DATABASE,
  );
  await page.waitForTimeout(2000);

  // ── Step 1: Fill table ───────────────────────────────────────
  const tableFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据表/ })
    .first();
  const tableSelector = tableFormItem.locator(".ant-select-selector").first();
  await tableSelector.click();
  await page.waitForTimeout(1000);
  const tableDropdown = page.locator(".ant-select-dropdown:visible").last();
  await tableDropdown.waitFor({ state: "visible", timeout: 5000 });
  await tableDropdown
    .locator(".ant-select-item-option")
    .filter({ hasText: "quality_test_num" })
    .first()
    .click();
  await page.waitForTimeout(500);

  // ── Step 1: Fill package name ────────────────────────────────
  const packageNameInput = page
    .locator(".ant-table-row")
    .first()
    .locator("input")
    .first();
  await packageNameInput.clear();
  await packageNameInput.fill("debug_pkg");

  // ── Click 下一步 ─────────────────────────────────────────────
  await page.locator("button").filter({ hasText: /下一步/ }).first().click();

  // Wait for Step 2 to stabilize
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // ── Dump findings ────────────────────────────────────────────
  const currentUrl = page.url();
  process.stderr.write(`\n[DEBUG] Current URL: ${currentUrl}\n`);

  const buttons = await page.locator("button:visible").allTextContents();
  process.stderr.write(`\n[DEBUG] Visible buttons (${buttons.length}):\n`);
  buttons.forEach((b, i) =>
    process.stderr.write(`  [${i}] "${b.trim()}"\n`),
  );

  const selects = await page
    .locator(".ant-select:visible")
    .allTextContents();
  process.stderr.write(`\n[DEBUG] Visible ant-selects (${selects.length}):\n`);
  selects.forEach((s, i) =>
    process.stderr.write(`  [${i}] "${s.trim()}"\n`),
  );

  const ruleElements = await page
    .locator(':visible:text("规则")')
    .allTextContents();
  process.stderr.write(
    `\n[DEBUG] Elements containing "规则" (${ruleElements.length}):\n`,
  );
  ruleElements.slice(0, 20).forEach((r, i) =>
    process.stderr.write(`  [${i}] "${r.trim().slice(0, 80)}"\n`),
  );

  // ── Screenshot ───────────────────────────────────────────────
  await page.screenshot({ path: "/tmp/debug-step3.png", fullPage: true });
  process.stderr.write("\n[DEBUG] Screenshot saved to /tmp/debug-step3.png\n");
});
