// META: {"id":"t5","priority":"P1","title":"验证key范围校验表单必填提示"}
import { test } from "../../../shared/fixtures/step-screenshot";
import { addRuleToPackage } from "../有效性-取值范围枚举范围规则/rule-editor-helpers";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import { SCENARIOS, expectRuleError, saveInvalidRuleSet, selectRuleFunction, setVerificationContent, startRuleSetDraft } from "./suite-helpers";
import { selectAntOption } from "../../../shared/helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 表单校验"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证未选择字段时保存key范围校验规则提示必填", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.main);
      const ruleForm = await addRuleToPackage(page, SCENARIOS.main.packageName, "完整性校验");
      const levelSelect = ruleForm.locator(".ant-form-item").filter({ hasText: /规则类型/ }).locator(".ant-select").first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await selectRuleFunction(ruleForm, "key范围校验");
      await selectAntOption(page, ruleForm.locator(".ant-form-item").filter({ hasText: /校验方法/ }).locator(".ant-select").first(), "包含");
      await setVerificationContent(page, ruleForm, ["key1"]);
      await saveInvalidRuleSet(page);
      await expectRuleError(ruleForm, "请选择字段");
    });

    test("验证未选择校验内容时保存key范围校验规则提示必填", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.main);
      const ruleForm = await addRuleToPackage(page, SCENARIOS.main.packageName, "完整性校验");
      const levelSelect = ruleForm.locator(".ant-form-item").filter({ hasText: /规则类型/ }).locator(".ant-select").first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await selectAntOption(page, ruleForm.locator(".ant-form-item").filter({ hasText: /^字段/ }).locator(".ant-select").first(), "info");
      await selectRuleFunction(ruleForm, "key范围校验");
      await selectAntOption(page, ruleForm.locator(".ant-form-item").filter({ hasText: /校验方法/ }).locator(".ant-select").first(), "包含");
      await saveInvalidRuleSet(page);
      await expectRuleError(ruleForm, "请选择校验内容");
    });

    test("验证未选择校验方法时保存key范围校验规则提示必填", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.main);
      const ruleForm = await addRuleToPackage(page, SCENARIOS.main.packageName, "完整性校验");
      const levelSelect = ruleForm.locator(".ant-form-item").filter({ hasText: /规则类型/ }).locator(".ant-select").first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await selectAntOption(page, ruleForm.locator(".ant-form-item").filter({ hasText: /^字段/ }).locator(".ant-select").first(), "info");
      await selectRuleFunction(ruleForm, "key范围校验");
      await setVerificationContent(page, ruleForm, ["key1"]);
      await saveInvalidRuleSet(page);
      await expectRuleError(ruleForm, "请选择校验方法");
    });
  });
}
