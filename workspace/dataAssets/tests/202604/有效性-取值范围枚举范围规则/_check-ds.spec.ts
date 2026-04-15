import { test } from "../../fixtures/step-screenshot";
import { applyRuntimeCookies, buildDataAssetsUrl, selectAntOption } from "../../helpers/test-setup";

test.use({ storageState: ".auth/session.json" });

test("UI check: open add page with pid=23", async ({ page }) => {
  await applyRuntimeCookies(page);

  // 使用 duomi666 项目 (id=23) 打开新建规则集页面
  await page.goto(buildDataAssetsUrl("/dq/ruleSet/add", 23));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // 注入项目上下文
  await page.evaluate(() => {
    sessionStorage.setItem("X-Valid-Project-ID", "23");
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  console.log(`URL: ${page.url()}`);

  // 点击数据源下拉框
  const sourceFormItem = page.locator(".ant-form-item").filter({ hasText: /选择数据源/ }).first();
  if (!(await sourceFormItem.isVisible().catch(() => false))) {
    console.log("SOURCE FORM NOT VISIBLE - page text:");
    const text = await page.locator("body").innerText();
    console.log(text.split("\n").filter(l => l.trim()).slice(0, 20).join("\n"));
    return;
  }

  await sourceFormItem.locator(".ant-select-selector").first().click();
  await page.waitForTimeout(1000);

  const dropdown = page.locator(".ant-select-dropdown:visible");
  if (await dropdown.isVisible().catch(() => false)) {
    const options = await dropdown.locator(".ant-select-item-option").allInnerTexts();
    console.log(`=== DATASOURCE OPTIONS (${options.length}) ===`);
    for (const opt of options) console.log(`  "${opt}"`);

    // 选择第一个 Doris 选项
    const dorisOpt = dropdown.locator(".ant-select-item-option").filter({ hasText: /doris/i }).first();
    if (await dorisOpt.isVisible().catch(() => false)) {
      await dorisOpt.click();
      await page.waitForTimeout(1500);

      // 查看数据库下拉框
      const schemaFormItem = page.locator(".ant-form-item").filter({ hasText: /选择数据库/ }).first();
      await schemaFormItem.locator(".ant-select-selector").first().click();
      await page.waitForTimeout(1000);
      const schemaDropdown = page.locator(".ant-select-dropdown:visible");
      if (await schemaDropdown.isVisible().catch(() => false)) {
        const schemaOpts = await schemaDropdown.locator(".ant-select-item-option").allInnerTexts();
        console.log(`=== SCHEMA OPTIONS (${schemaOpts.length}) ===`);
        for (const opt of schemaOpts) console.log(`  "${opt}"`);
      } else {
        console.log("SCHEMA DROPDOWN NOT VISIBLE");
      }
    }
  } else {
    console.log("DROPDOWN NOT VISIBLE");
  }
});
