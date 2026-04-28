// META: {"id":"t8","priority":"P1","title":"【P1】验证校验key回显格式及勾选仅对当前层级生效"}
import { expect, test } from "../../../shared/fixtures/step-screenshot";
import { uniqueName } from "../../../shared/helpers/test-setup";
import {
  addJsonFormatRule,
  getSelectedValidationKeyTexts,
  getValidationKeyState,
  openValidationKeyDropdown,
  prepareJsonRuleSetDraft,
} from "./json-format-suite-helpers";
import { describeByDatasource } from "./suite-case-helpers";

const RULE_CONFIG_TABLE = "quality_test_json_rule_config";
const SELECTED_KEYS = ["person-name", "address-city"] as const;

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
});
test.setTimeout(600000);

describeByDatasource("规则集管理", () => {
  test("验证校验key回显格式及勾选仅对当前层级生效", async ({ page }) => {
    const packageName = uniqueName("t8_pkg");
    await prepareJsonRuleSetDraft(page, RULE_CONFIG_TABLE, packageName, [
      "personHierarchy",
      "addressHierarchy",
    ]);

    const ruleForm = await addJsonFormatRule(page, packageName, {
      field: "info",
      selectedKeyPaths: SELECTED_KEYS,
      ruleStrength: "强规则",
    });

    const selectedTexts = await getSelectedValidationKeyTexts(ruleForm);
    const selectedSummary = selectedTexts.join(";");
    expect(selectedSummary).toContain("person-name");
    expect(selectedSummary).toContain("address-city");
    expect(selectedSummary).not.toContain("person-age");

    await openValidationKeyDropdown(page, ruleForm);
    const personNameState = await getValidationKeyState(page, "person-name");
    const addressCityState = await getValidationKeyState(page, "address-city");
    const personAgeState = await getValidationKeyState(page, "person-age");

    expect(personNameState.checked).toBe(true);
    expect(addressCityState.checked).toBe(true);
    expect(personAgeState.checked).toBe(false);
    await page.keyboard.press("Escape").catch(() => undefined);
  });
});
