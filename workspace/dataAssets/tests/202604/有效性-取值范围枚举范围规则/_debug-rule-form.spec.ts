/**
 * Debug script: inspect the rule form after selecting 有效性校验 from dropdown
 */
import { test } from "../../fixtures/step-screenshot";
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

test("debug: dump rule form structure after selecting 有效性校验", async ({
  page,
}) => {
  // 1. Apply cookies and navigate with project context
  await applyRuntimeCookies(page);
  const url = buildDataAssetsUrl("/dq/ruleSet/add", QUALITY_PROJECT_ID);
  await page.goto(url);
  await injectProjectContext(page, QUALITY_PROJECT_ID);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // 2. Fill Step 1: datasource (doris)
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

  // Fill database (pw)
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

  // Fill table (quality_test_num)
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

  // Fill package name input
  const packageNameInput = page
    .locator(".ant-table-row")
    .first()
    .locator("input")
    .first();
  await packageNameInput.clear();
  await packageNameInput.fill("debug_pkg");

  // 3. Click 下一步
  await page.locator("button").filter({ hasText: /下一步/ }).first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // 4. Click 新增规则包 text link
  await page.getByText("新增规则包").first().click();
  await page.waitForTimeout(1000);

  // 5. Find the package select with placeholder and select first option
  const pkgSelect = page
    .locator(".ant-select")
    .filter({ has: page.locator('[class*="placeholder"]') })
    .first();
  if (await pkgSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pkgSelect.locator(".ant-select-selector").click();
    await page.waitForTimeout(500);
    const pkgDropdown = page.locator(".ant-select-dropdown:visible").last();
    if (await pkgDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pkgDropdown.locator(".ant-select-item-option").first().click();
      await page.waitForTimeout(500);
    }
  }
  await page.waitForTimeout(1000);

  // 6. Click 添加规则 button
  const addRuleBtn = page
    .locator("button")
    .filter({ hasText: /添加规则/ })
    .first();
  await addRuleBtn.click();
  await page.waitForTimeout(500);

  // 7. Find dropdown menu and click 有效性校验
  const dropdownMenu = page.locator(".ant-dropdown:visible, .ant-dropdown-menu:visible").first();
  await dropdownMenu.waitFor({ state: "visible", timeout: 5000 });
  await dropdownMenu
    .locator(".ant-dropdown-menu-item, li")
    .filter({ hasText: /有效性校验/ })
    .first()
    .click();
  await page.waitForTimeout(2000);

  // 8. Take screenshot
  await page.screenshot({ path: "/tmp/debug-rule-form.png", fullPage: true });
  process.stderr.write("\n[DEBUG] Screenshot saved to /tmp/debug-rule-form.png\n");

  // 9. Dump all visible form item labels
  const formLabels = await page
    .locator(".ant-form-item-label:visible")
    .allTextContents();
  process.stderr.write(
    `\n[DEBUG] Visible form item labels (${formLabels.length}):\n`,
  );
  formLabels.forEach((l, i) =>
    process.stderr.write(`  [${i}] "${l.trim()}"\n`),
  );

  // 10. Dump all visible ant-select elements with their text content
  const antSelects = await page.locator(".ant-select:visible").allTextContents();
  process.stderr.write(
    `\n[DEBUG] Visible ant-select elements (${antSelects.length}):\n`,
  );
  antSelects.forEach((s, i) =>
    process.stderr.write(`  [${i}] "${s.trim().slice(0, 100)}"\n`),
  );

  // 11. List all .rule__function-list__item elements
  const fnItems = await page
    .locator(".rule__function-list__item")
    .allTextContents();
  process.stderr.write(
    `\n[DEBUG] .rule__function-list__item elements (${fnItems.length}):\n`,
  );
  fnItems.forEach((t, i) =>
    process.stderr.write(`  [${i}] "${t.trim().slice(0, 100)}"\n`),
  );

  // 12. Try to find any select with "统计函数" or "函数" text nearby
  const funcFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /统计函数|函数/ })
    .first();
  if (await funcFormItem.isVisible({ timeout: 2000 }).catch(() => false)) {
    const funcItemText = await funcFormItem.innerText().catch(() => "");
    process.stderr.write(
      `\n[DEBUG] Form item with 函数 nearby:\n  "${funcItemText.slice(0, 300)}"\n`,
    );
    const funcSelects = await funcFormItem
      .locator(".ant-select")
      .allTextContents();
    process.stderr.write(
      `  Selects within (${funcSelects.length}): ${JSON.stringify(funcSelects)}\n`,
    );
  } else {
    process.stderr.write("\n[DEBUG] No form item with 统计函数/函数 found nearby.\n");
  }

  // 13. List all visible text containing 函数, 规则, or 范围
  const keywordElements = await page
    .locator(
      ':visible:text-matches("函数|规则|范围", "i")',
    )
    .allTextContents();
  process.stderr.write(
    `\n[DEBUG] Visible text with 函数/规则/范围 (${keywordElements.length}):\n`,
  );
  keywordElements.slice(0, 30).forEach((t, i) =>
    process.stderr.write(`  [${i}] "${t.trim().slice(0, 100)}"\n`),
  );

  // Extra: dump full page text for inspection
  const pageText = await page.locator("body").innerText().catch(() => "");
  const relevantLines = pageText
    .split("\n")
    .filter((l) => /函数|范围|枚举|有效性|规则类型|统计/.test(l))
    .slice(0, 40);
  process.stderr.write(
    `\n[DEBUG] Relevant page lines (${relevantLines.length}):\n`,
  );
  relevantLines.forEach((l, i) =>
    process.stderr.write(`  [${i}] "${l.trim().slice(0, 120)}"\n`),
  );
});
