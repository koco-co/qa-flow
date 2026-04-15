import { test, expect } from "../../fixtures/step-screenshot";
import { applyRuntimeCookies, buildDataAssetsUrl, selectAntOption } from "../../helpers/test-setup";
import { DORIS_DATABASE, injectProjectContext, QUALITY_PROJECT_ID } from "./test-data";

test.use({ storageState: ".auth/session.json" });

test("step3: select package then add rule", async ({ page }) => {
  test.setTimeout(90000);
  await applyRuntimeCookies(page);

  // 初始化项目上下文
  await page.goto(buildDataAssetsUrl("/dq/ruleSet", QUALITY_PROJECT_ID));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await injectProjectContext(page, QUALITY_PROJECT_ID);
  await page.reload();
  await page.waitForLoadState("networkidle");

  // 导航到新建页
  await page.goto(buildDataAssetsUrl("/dq/ruleSet/add", QUALITY_PROJECT_ID));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Step 1 填写
  await page.locator(".ant-form-item").filter({ hasText: /选择数据源/ }).first().locator(".ant-select-selector").first().click();
  await page.waitForTimeout(500);
  await page.locator(".ant-select-dropdown:visible").locator(".ant-select-item-option").filter({ hasText: /doris/i }).first().click();
  await page.waitForTimeout(1500);

  await selectAntOption(page, page.locator(".ant-form-item").filter({ hasText: /选择数据库/ }).first().locator(".ant-select-selector").first(), DORIS_DATABASE);
  await page.waitForTimeout(2000);

  await page.locator(".ant-form-item").filter({ hasText: /选择数据表/ }).first().locator(".ant-select-selector").first().click();
  await page.waitForTimeout(1000);
  await page.locator(".ant-select-dropdown:visible").last().locator(".ant-select-item-option").filter({ hasText: "quality_test_num" }).first().click();
  await page.waitForTimeout(500);
  await page.locator(".ant-table-row").first().locator("input").first().fill("调试包");

  await page.getByRole("button", { name: "下一步" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  console.log("=== Step 2 监控规则页面 ===");

  // 查看所有按钮
  const buttons = await page.locator("button:visible").allInnerTexts();
  console.log(`Visible buttons: ${JSON.stringify(buttons)}`);

  // 选择规则包（下拉框选择"调试包"）
  const pkgSelect = page.locator(".ruleSetMonitor__packageSelect, .ant-select").filter({ hasText: /请选择规则包|调试/ }).first();
  if (await pkgSelect.isVisible().catch(() => false)) {
    console.log("Found package select, selecting...");
    await pkgSelect.locator(".ant-select-selector").click();
    await page.waitForTimeout(500);
    const pkgDropdown = page.locator(".ant-select-dropdown:visible");
    const pkgOpts = await pkgDropdown.locator(".ant-select-item-option").allInnerTexts();
    console.log(`Package options: ${JSON.stringify(pkgOpts)}`);
    if (pkgOpts.length > 0) {
      await pkgDropdown.locator(".ant-select-item-option").first().click();
      await page.waitForTimeout(1500);
    }
  }

  // 再看看按钮和 Select
  const buttons2 = await page.locator("button:visible").allInnerTexts();
  console.log(`\nButtons after pkg select: ${JSON.stringify(buttons2)}`);

  // 查找"新增规则"按钮并点击
  const addRuleBtn = page.getByRole("button", { name: /新增规则/ }).first();
  if (await addRuleBtn.isVisible().catch(() => false)) {
    console.log("Clicking 新增规则...");
    await addRuleBtn.click();
    await page.waitForTimeout(2000);

    // 查看现在的 Select 元素
    const selects3 = await page.locator(".ant-select:visible").evaluateAll((els) => {
      return els.map((el, i) => {
        const formItem = el.closest(".ant-form-item");
        const label = formItem?.querySelector(".ant-form-item-label")?.textContent?.trim() ?? "";
        const parent = el.closest("[class*='rule']")?.className?.slice(0, 60) ?? "";
        return `[${i}] label="${label}" parent="${parent}" text="${el.textContent?.trim().slice(0, 40)}"`;
      });
    });
    console.log("\n=== SELECTS AFTER ADD RULE ===");
    for (const s of selects3) console.log(`  ${s}`);
  } else {
    console.log("新增规则 button NOT visible");
    // 试试其他按钮
    const allBtns = await page.locator("button:visible, a:visible").evaluateAll((els) =>
      els.map((el, i) => `[${i}] "${el.textContent?.trim().slice(0, 30)}"`)
    );
    console.log("All clickable elements:");
    for (const b of allBtns.slice(0, 20)) console.log(`  ${b}`);
  }
});
