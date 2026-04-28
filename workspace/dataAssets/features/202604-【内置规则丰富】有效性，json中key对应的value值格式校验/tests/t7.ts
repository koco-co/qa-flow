// META: {"id":"t7","priority":"P1","title":"【P1】验证校验key数据量超过200条时默认加载前200条展示"}
import { expect, test } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  addJsonFormatRule,
  getValidationKeyLabels,
  openValidationKeyDropdown,
  prepareJsonRuleSetDraft,
  searchValidationKey,
} from "./json-format-suite-helpers";
import { describeByDatasource } from "./suite-case-helpers";

const RULE_CONFIG_TABLE = "quality_test_json_rule_config";

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
});
test.setTimeout(600000);

describeByDatasource("规则集管理", () => {
  test("验证校验key数据量超过200条时默认加载前200条展示", async ({ page }) => {
    const packageName = uniqueName("t7_pkg");
    await prepareJsonRuleSetDraft(page, RULE_CONFIG_TABLE, packageName, [
      "largeKeySet",
    ]);

    const ruleForm = await addJsonFormatRule(page, packageName, {
      field: "info",
    });
    await openValidationKeyDropdown(page, ruleForm);

    const initialLabels = await getValidationKeyLabels(page);
    expect(initialLabels).toEqual(
      expect.arrayContaining(["test-key-001", "test-key-200"]),
    );
    expect(initialLabels).not.toContain("test-key-205");

    const dropdown = await searchValidationKey(page, "test-key-205");
    await expect(dropdown).toContainText("test-key-205");
    await page.keyboard.press("Escape").catch(() => undefined);
  });
});
