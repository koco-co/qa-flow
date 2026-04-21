import { test, expect } from "@playwright/test";
import {
  gotoRuleSetList,
  openRuleSetEditor,
} from "./rule-editor-helpers";
import { setCurrentDatasource, ACTIVE_DATASOURCES } from "./test-data";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(120000);

test("diagnose notification after delete confirm", async ({ page }) => {
  setCurrentDatasource(ACTIVE_DATASOURCES[0]);
  await gotoRuleSetList(page);
  await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 15000 });

  await openRuleSetEditor(page, "ruleset_15695_or", ["或关系校验包"]);

  const packageSection = page.locator(".ruleSetMonitor__package").filter({ hasText: "或关系校验包" }).first();
  await expect(packageSection).toBeVisible({ timeout: 10000 });

  const ruleForms = page.locator(".ruleForm");
  process.stderr.write(`[diag] initial ruleForm count: ${await ruleForms.count()}\n`);
  
  // Check packages
  const packages = page.locator(".ruleSetMonitor__package");
  const pkgCount = await packages.count();
  process.stderr.write(`[diag] package count: ${pkgCount}\n`);
  for (let i = 0; i < pkgCount; i++) {
    const pkg = packages.nth(i);
    const pkgText = await pkg.locator(".ruleSetMonitor__packageSelect .ant-select-selection-item").first().textContent().catch(() => "?");
    const formsInPkg = await pkg.locator(".ruleForm").count();
    process.stderr.write(`[diag] package[${i}] name="${pkgText}" ruleForms=${formsInPkg}\n`);
  }

  // Click delete button on first rule form
  const ruleForm0 = ruleForms.nth(0);
  const deleteBtn = ruleForm0.locator(".ruleForm__icon").locator("xpath=ancestor::button[1]").first();
  
  await deleteBtn.click();
  await page.waitForTimeout(500);

  const confirmBtn = page.locator(".ant-popconfirm .ant-btn-primary").first();
  await confirmBtn.click();
  await page.waitForTimeout(2000);

  // Check all messages/notifications
  const msgNotices = page.locator(".ant-message-notice, .ant-notification-notice");
  const noticeCount = await msgNotices.count();
  process.stderr.write(`[diag] notice count: ${noticeCount}\n`);
  for (let i = 0; i < noticeCount; i++) {
    const text = await msgNotices.nth(i).textContent().catch(() => "");
    process.stderr.write(`[diag] notice[${i}]: "${text}"\n`);
  }
  
  // Full page notifications
  const allNotices = page.locator(".ant-message, .ant-notification");
  const allCount = await allNotices.count();
  for (let i = 0; i < allCount; i++) {
    const text = await allNotices.nth(i).textContent().catch(() => "");
    process.stderr.write(`[diag] allNotice[${i}]: "${text}"\n`);
  }
  
  // Check ruleForm count
  process.stderr.write(`[diag] ruleForm count after: ${await page.locator(".ruleForm").count()}\n`);
  
  // Check if we're still in edit mode
  const packageSectionAfter = page.locator(".ruleSetMonitor__package");
  process.stderr.write(`[diag] packages after: ${await packageSectionAfter.count()}\n`);
  
  // Check all errors on page
  const errors = page.locator(".ant-form-item-explain-error:visible");
  const errCount = await errors.count();
  process.stderr.write(`[diag] form errors: ${errCount}\n`);
  for (let i = 0; i < errCount; i++) {
    const text = await errors.nth(i).textContent().catch(() => "");
    process.stderr.write(`[diag] error[${i}]: "${text}"\n`);
  }
  
  await page.screenshot({ path: "/tmp/diag-notification.png" });
  process.stderr.write("[diag] screenshot saved\n");
});
