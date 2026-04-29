// META: {"id":"t3","priority":"P0","title":"验证json类型字段可成功配置key范围校验规则"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import { addRuleToPackage } from "../../../202604-【内置规则丰富】有效性，支持设置字段多规则的且或关系/tests/helpers/rule-editor-helpers";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "../data/test-data";
import { SCENARIOS, configureKeyRangeRule, startRuleSetDraft } from "../helpers/suite-helpers";
import { selectAntOption } from "../../../../shared/helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 字段类型限制"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证json类型字段可成功配置key范围校验规则", async ({ page }) => {
      test.skip(datasource.id !== "doris3.x", "JSON字段仅在 doris3.x 运行");
      await startRuleSetDraft(page, SCENARIOS.fieldType);
      const ruleForm = await addRuleToPackage(page, SCENARIOS.fieldType.packageName, "完整性校验");
      const levelSelect = ruleForm.locator(".ant-form-item").filter({ hasText: /规则类型/ }).locator(".ant-select").first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      const fieldSelect = ruleForm.locator(".ant-form-item").filter({ hasText: /^字段/ }).locator(".ant-select").first();
      await selectAntOption(page, fieldSelect, "info");
      await configureKeyRangeRule(page, ruleForm, {
        field: "info",
        method: "包含",
        keyNames: ["key1"],
        ruleStrength: "强规则",
      });
      await expect(ruleForm).toContainText("info");
      await expect(ruleForm).toContainText("key范围校验");
    });
  });
}
