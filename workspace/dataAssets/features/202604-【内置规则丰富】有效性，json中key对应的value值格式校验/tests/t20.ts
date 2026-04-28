// META: {"id":"t20","priority":"P1","title":"【P1】验证删除已被有效性规则引用的key后规则配置页面回显和编辑功能正常"}
import { expect, test } from "../../fixtures/step-screenshot";
import {
  deleteKey,
  gotoJsonConfigPage,
} from "../【通用配置】json格式配置/json-config-helpers";
import {
  getSelectedValidationKeyTexts,
  getValidationKeyLabels,
  getValidationKeyState,
  openScenarioRuleSetPackage,
  openValidationKeyDropdown,
} from "./json-format-suite-helpers";
import { ensureJsonFormatTask } from "./json-format-task-helpers";
import { saveRuleSet } from "./rule-editor-base";
import { describeByDatasource } from "./suite-case-helpers";
import { DELETE_REFERENCE_SCENARIO } from "./test-data";

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
});
test.setTimeout(600000);

describeByDatasource("规则集管理", () => {
  test("验证删除已被有效性规则引用的key后规则配置页面回显和编辑功能正常", async ({
    page,
  }) => {
    await ensureJsonFormatTask(page, DELETE_REFERENCE_SCENARIO);

    await gotoJsonConfigPage(page);
    await deleteKey(page, "del-key-a", { force: true });

    const rulePackage = await openScenarioRuleSetPackage(
      page,
      DELETE_REFERENCE_SCENARIO,
    );
    const ruleForm = rulePackage.locator(".ruleForm").first();
    await expect(ruleForm).toBeVisible({ timeout: 10000 });

    const selectedKeys = await getSelectedValidationKeyTexts(ruleForm);
    expect(selectedKeys).toContain("del-key-b");
    expect(selectedKeys).not.toContain("del-key-a");

    await openValidationKeyDropdown(page, ruleForm);
    const labels = await getValidationKeyLabels(page);
    expect(labels).toContain("del-key-b");
    expect(labels).not.toContain("del-key-a");

    const keyState = await getValidationKeyState(page, "del-key-b");
    expect(keyState.checked).toBe(true);
    await page.keyboard.press("Escape").catch(() => undefined);

    await saveRuleSet(page);

    const reopenedPackage = await openScenarioRuleSetPackage(
      page,
      DELETE_REFERENCE_SCENARIO,
    );
    const reopenedRuleForm = reopenedPackage.locator(".ruleForm").first();
    const reopenedKeys = await getSelectedValidationKeyTexts(reopenedRuleForm);
    expect(reopenedKeys).toContain("del-key-b");
    expect(reopenedKeys).not.toContain("del-key-a");
  });
});
