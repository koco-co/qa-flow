import { test, expect } from "../../fixtures/step-screenshot";
import { applyRuntimeCookies, buildDataAssetsUrl } from "../../helpers/test-setup";
import { injectProjectContext, QUALITY_PROJECT_ID } from "./test-data";

test.use({ storageState: ".auth/session.json" });

test("debug step 1 form", async ({ page }) => {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/ruleSet/add", QUALITY_PROJECT_ID));
  await page.waitForLoadState("networkidle");
  await injectProjectContext(page, QUALITY_PROJECT_ID);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Dump all form items
  const formItemLabels = await page.locator(".ant-form-item-label").allTextContents();
  process.stderr.write("[Step1 Form Labels]: " + JSON.stringify(formItemLabels) + "\n");

  // Check for table rows (potential package name field)
  const tableRows = await page.locator(".ant-table-row").count();
  process.stderr.write("[Step1 Table Rows Count]: " + tableRows + "\n");

  if (tableRows > 0) {
    const rowTexts = await page.locator(".ant-table-row").allTextContents();
    process.stderr.write("[Step1 Table Row Texts]: " + JSON.stringify(rowTexts) + "\n");
  }

  // Take screenshot
  await page.screenshot({ path: "/tmp/debug-step1.png", fullPage: true });
  process.stderr.write("[Screenshot saved to /tmp/debug-step1.png]\n");
});
