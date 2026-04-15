// DEBUG: Inspect function type select (统计函数) dropdown options
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

test.use({ storageState: ".auth/session.json" });

test("debug: inspect func-type select dropdown options", async ({ page }) => {
  test.setTimeout(120000);

  // ── Navigate to rule set add page with project context ──
  await applyRuntimeCookies(page);
  const url = buildDataAssetsUrl("/dq/ruleSet/add", QUALITY_PROJECT_ID);
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await injectProjectContext(page, QUALITY_PROJECT_ID);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // ── Select datasource (doris) ──
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

  // ── Select database ──
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

  // ── Select table: quality_test_num ──
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

  // ── Fill package name ──
  const packageNameInput = page
    .locator("input[placeholder*='规则包名称']")
    .first();
  await packageNameInput.waitFor({ state: "visible", timeout: 5000 });
  await packageNameInput.clear();
  await packageNameInput.fill("debug-func-select-pkg");
  await page.waitForTimeout(500);

  // ── Click 下一步 ──
  await page.getByRole("button", { name: "下一步" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // ── Click 新增规则包 ──
  const addPackageBtn = page.getByText("新增规则包", { exact: false }).first();
  await addPackageBtn.waitFor({ state: "visible", timeout: 10000 });
  await addPackageBtn.click();
  await page.waitForTimeout(1000);

  // ── Select package from dropdown ──
  const packageSelect = page
    .locator(".ruleSetMonitor__packageSelect, .ant-select")
    .filter({ has: page.locator(".ant-select-selection-placeholder") })
    .first();
  await packageSelect.locator(".ant-select-selector").click();
  await page.waitForTimeout(500);
  const pkgDropdown = page.locator(".ant-select-dropdown:visible").last();
  await pkgDropdown.waitFor({ state: "visible", timeout: 5000 });
  const pkgOption = pkgDropdown.locator(".ant-select-item-option").first();
  if (await pkgOption.isVisible()) {
    await pkgOption.click();
  }
  await page.waitForTimeout(1000);

  // ── Click 添加规则 ──
  const addRuleBtn = page.getByRole("button", { name: /添加规则/ }).first();
  await addRuleBtn.waitFor({ state: "visible", timeout: 10000 });
  await addRuleBtn.click();
  await page.waitForTimeout(500);

  // ── Click 有效性校验 in dropdown menu ──
  const ruleTypeMenu = page.locator(
    ".ant-dropdown:visible, .ant-dropdown-menu:visible",
  );
  await ruleTypeMenu.first().waitFor({ state: "visible", timeout: 10000 });
  await ruleTypeMenu
    .getByText("有效性校验", { exact: false })
    .first()
    .click();
  await page.waitForTimeout(2000);

  // ── Find .rule__function-list__item ──
  const funcListItem = page.locator(".rule__function-list__item").first();
  await funcListItem.waitFor({ state: "visible", timeout: 10000 });

  // ── Click the ant-select-selector to open dropdown ──
  const statFuncSelect = funcListItem.locator(".ant-select").first();
  await statFuncSelect.locator(".ant-select-selector").click();
  await page.waitForTimeout(2000);

  // ── Take screenshot ──
  await page.screenshot({ path: "/tmp/debug-func-select.png", fullPage: false });
  console.log("Screenshot saved to /tmp/debug-func-select.png");

  // ── Dump ALL visible dropdowns ──
  const visibleDropdowns = await page.locator(".ant-select-dropdown:visible").all();
  console.log(`\n=== Visible dropdowns count: ${visibleDropdowns.length} ===`);

  for (let i = 0; i < visibleDropdowns.length; i++) {
    const dropdownText = await visibleDropdowns[i].textContent();
    console.log(`\n--- Dropdown[${i}] full text ---`);
    console.log(dropdownText);

    // ── List all .ant-select-item-option inside this dropdown ──
    const options = await visibleDropdowns[i].locator(".ant-select-item-option").all();
    console.log(`\n--- Dropdown[${i}] options (${options.length} total) ---`);
    for (let j = 0; j < options.length; j++) {
      const optionText = await options[j].textContent();
      const optionValue = await options[j].getAttribute("title");
      console.log(`  Option[${j}]: text="${optionText}" title="${optionValue}"`);
    }
  }

  // ── Also check .ant-select-item-option anywhere in the page ──
  const allOptions = await page.locator(".ant-select-item-option").all();
  console.log(`\n=== All .ant-select-item-option on page: ${allOptions.length} ===`);
  for (let i = 0; i < allOptions.length; i++) {
    const text = await allOptions[i].textContent();
    const visible = await allOptions[i].isVisible();
    console.log(`  [${i}] visible=${visible} text="${text}"`);
  }

  // ── Dump inner HTML of first visible dropdown for deeper inspection ──
  if (visibleDropdowns.length > 0) {
    const innerHTML = await visibleDropdowns[0].innerHTML();
    console.log("\n=== First dropdown innerHTML (truncated to 2000 chars) ===");
    console.log(innerHTML.slice(0, 2000));
  }
});
