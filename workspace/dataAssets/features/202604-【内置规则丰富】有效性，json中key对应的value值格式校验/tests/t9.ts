// META: {"id":"t9","priority":"P1","title":"【P1】验证校验key输入框悬浮时展示全部key名，默认仅显示前两个"}
import { expect, test } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  addJsonFormatRule,
  getSelectedValidationKeyTexts,
  prepareJsonRuleSetDraft,
} from "./json-format-suite-helpers";
import { describeByDatasource } from "./suite-case-helpers";

const RULE_CONFIG_TABLE = "quality_test_json_rule_config";
const HOVER_KEYS = [
  "field-key1",
  "field-key2",
  "field-key3",
  "field-key4",
] as const;

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
});
test.setTimeout(600000);

describeByDatasource("规则集管理", () => {
  test("验证校验key输入框悬浮时展示全部key名，默认仅显示前两个", async ({
    page,
  }) => {
    const packageName = uniqueName("t9_pkg");
    await prepareJsonRuleSetDraft(page, RULE_CONFIG_TABLE, packageName, [
      "hoverKeys",
    ]);

    const ruleForm = await addJsonFormatRule(page, packageName, {
      field: "info",
      selectedKeyPaths: HOVER_KEYS,
      ruleStrength: "强规则",
    });

    const selectedTexts = await getSelectedValidationKeyTexts(ruleForm);
    const selectedSummary = selectedTexts.join(";");
    expect(selectedSummary).toContain("field-key1");
    expect(selectedSummary).toContain("field-key2");
    expect(selectedSummary).toMatch(/\+\s*2/);

    const hoverTarget = ruleForm
      .locator(
        ".ant-select-selection-item, .ant-select-selection-overflow-item-suffix",
      )
      .filter({ hasText: /\+\s*2/ })
      .first();
    const fallbackTarget = ruleForm
      .locator(".ant-select-selection-overflow")
      .first();
    if (await hoverTarget.isVisible({ timeout: 1000 }).catch(() => false)) {
      await hoverTarget.hover();
    } else {
      await fallbackTarget.hover();
    }

    const tooltip = page
      .locator(".ant-tooltip:visible, .ant-popover:visible")
      .last();
    await expect(tooltip).toBeVisible({ timeout: 5000 });
    await expect(tooltip).toContainText("field-key1");
    await expect(tooltip).toContainText("field-key2");
    await expect(tooltip).toContainText("field-key3");
    await expect(tooltip).toContainText("field-key4");
  });
});
