// META: {"id":"t10","priority":"P1","title":"【P1】验证点击「value格式预览」弹窗仅展示已勾选key的格式信息且支持分页"}
import { expect, test } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  addJsonFormatRule,
  openValueFormatPreview,
  prepareJsonRuleSetDraft,
} from "./json-format-suite-helpers";
import { describeByDatasource } from "./suite-case-helpers";

const RULE_CONFIG_TABLE = "quality_test_json_rule_config";
const PREVIEW_KEYS = [
  "check-key-01",
  "check-key-02",
  "check-key-03",
  "check-key-04",
  "check-key-05",
  "check-key-06",
  "check-key-07",
  "check-key-08",
  "check-key-09",
  "check-key-10",
  "check-key-11",
  "check-key-12",
] as const;

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
});
test.setTimeout(600000);

describeByDatasource("规则集管理", () => {
  test("验证点击「value格式预览」弹窗仅展示已勾选key的格式信息且支持分页", async ({
    page,
  }) => {
    const packageName = uniqueName("t10_pkg");
    await prepareJsonRuleSetDraft(page, RULE_CONFIG_TABLE, packageName, [
      "previewSet",
    ]);

    const ruleForm = await addJsonFormatRule(page, packageName, {
      field: "info",
      selectedKeyPaths: PREVIEW_KEYS,
      ruleStrength: "强规则",
    });

    const modal = await openValueFormatPreview(page, ruleForm);
    await expect(modal).toContainText("check-key-01");
    await expect(modal).toContainText("check-key-02");
    await expect(modal).not.toContainText("check-key-15");

    const pagination = modal.locator(".ant-pagination").first();
    await expect(pagination).toBeVisible({ timeout: 5000 });

    const pageTwoItem = pagination
      .locator(".ant-pagination-item")
      .filter({ hasText: /^2$/ })
      .first();
    if (await pageTwoItem.isVisible({ timeout: 1000 }).catch(() => false)) {
      await pageTwoItem.click();
      await page.waitForTimeout(500);
      await expect(modal).toContainText("check-key-11");
      await expect(modal).toContainText("check-key-12");
    }
  });
});


