// META: {"id":"t8","priority":"P1","title":"验证校验方法切换（包含与不包含）规则保存和执行结果差异"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import { addRuleToPackage, getRulePackage, openRuleSetEditor, saveRuleSet } from "../../../202604-有效性-取值范围枚举范围规则/tests/helpers/rule-editor-helpers";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "../data/test-data";
import { METHOD_SWITCH_TASK_NAME, ensureExecutedRuleTasks, openQualityReportDetail, getQualityReportRuleRow } from "./task-helpers";
import { KEY_RANGE_RULE_NAME, SCENARIOS, configureKeyRangeRule, seedScenarioRuleSet } from "../helpers/suite-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 校验方法切换"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证校验方法切换（包含与不包含）规则保存和执行结果差异", async ({ page }) => {
      await seedScenarioRuleSet(page, SCENARIOS.methodSwitch);
      await ensureExecutedRuleTasks(page, [METHOD_SWITCH_TASK_NAME]);
      const includeDetail = await openQualityReportDetail(page, METHOD_SWITCH_TASK_NAME);
      const includeRow = getQualityReportRuleRow(page, KEY_RANGE_RULE_NAME);
      await expect(includeDetail).toContainText(KEY_RANGE_RULE_NAME);
      await expect(includeRow).toContainText(/包含|key1-key2/);

      await openRuleSetEditor(page, SCENARIOS.methodSwitch.tableName, [SCENARIOS.methodSwitch.packageName]);
      const packageSection = await getRulePackage(page, SCENARIOS.methodSwitch.packageName);
      const existingRules = packageSection.locator(".ruleForm");
      const count = await existingRules.count();
      for (let index = 0; index < count; index += 1) {
        const ruleForm = existingRules.nth(index);
        const deleteBtn = ruleForm.locator(".ruleForm__icon").locator("xpath=ancestor::button[1]").first();
        if (await deleteBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await deleteBtn.click();
          const confirmBtn = page.locator(".ant-popover:visible .ant-btn-primary, .ant-popconfirm .ant-btn-primary").first();
          if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await confirmBtn.click();
          }
        }
      }
      const ruleForm = await addRuleToPackage(page, SCENARIOS.methodSwitch.packageName, "完整性校验");
      await configureKeyRangeRule(page, ruleForm, {
        field: "info",
        method: "不包含",
        keyNames: ["key1", "key2"],
        ruleStrength: "强规则",
      });
      await saveRuleSet(page);
      await ensureExecutedRuleTasks(page, [METHOD_SWITCH_TASK_NAME]);
      const notIncludeDetail = await openQualityReportDetail(page, METHOD_SWITCH_TASK_NAME);
      const notIncludeRow = getQualityReportRuleRow(page, KEY_RANGE_RULE_NAME);
      await expect(notIncludeDetail).toContainText(KEY_RANGE_RULE_NAME);
      await expect(notIncludeRow).toContainText(/不包含/);
      await expect(notIncludeRow).toContainText(/key1-key2/);
    });
  });
}
