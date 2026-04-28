// META: {"id":"t4","priority":"P1","title":"验证string字段可配置且非json/string字段不可选择key范围校验"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import { addRuleToPackage } from "../../../202604-有效性-取值范围枚举范围规则/tests/helpers/rule-editor-helpers";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "../data/test-data";
import { SCENARIOS, collectFieldOptions, configureKeyRangeRule, selectRuleFunction, startRuleSetDraft } from "../helpers/suite-helpers";
import { selectAntOption } from "../../../../shared/helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 字段类型限制"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证string类型字段可成功配置key范围校验规则", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.fieldType);
      const ruleForm = await addRuleToPackage(page, SCENARIOS.fieldType.packageName, "完整性校验");
      const levelSelect = ruleForm.locator(".ant-form-item").filter({ hasText: /规则类型/ }).locator(".ant-select").first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await configureKeyRangeRule(page, ruleForm, {
        field: "extra_info",
        method: "包含",
        keyNames: ["key1"],
        ruleStrength: "强规则",
      });
      await expect(ruleForm).toContainText("extra_info");
    });

    test("验证非json和string类型字段不可选择key范围校验", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.fieldType);
      const ruleForm = await addRuleToPackage(page, SCENARIOS.fieldType.packageName, "完整性校验");
      const levelSelect = ruleForm.locator(".ant-form-item").filter({ hasText: /规则类型/ }).locator(".ant-select").first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await selectRuleFunction(ruleForm, "key范围校验");
      const options = await collectFieldOptions(page, ruleForm);
      expect(options).not.toEqual(expect.arrayContaining(["age", "create_date", "user_id"]));
    });
  });
}
