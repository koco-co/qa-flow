// META: {"id":"t1","priority":"P0","title":"验证统计函数选择key范围校验后字段选择变为单选"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import { addRuleToPackage } from "../../../202604-【内置规则丰富】有效性，支持设置字段多规则的且或关系/tests/helpers/rule-editor-helpers";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "../data/test-data";
import { KEY_RANGE_RULE_NAME, SCENARIOS, openFunctionTooltip, selectFieldValues, selectRuleFunction, startRuleSetDraft } from "../helpers/suite-helpers";
import { selectAntOption } from "../../../../shared/helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 规则集管理"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证统计函数选择key范围校验后字段选择变为单选", async ({ page, step }) => {
      await step("步骤1: 新建规则集草稿并新增完整性校验规则 → Step2 页面打开", async () => {
        await startRuleSetDraft(page, SCENARIOS.main);
        const ruleForm = await addRuleToPackage(page, SCENARIOS.main.packageName, "完整性校验");
        const levelSelect = ruleForm.locator(".ant-form-item").filter({ hasText: /规则类型/ }).locator(".ant-select").first();
        await selectAntOption(page, levelSelect, /字段级|字段/);
        await selectRuleFunction(ruleForm, "空值数");
        await selectFieldValues(page, ruleForm, ["id", "info"]);
        const selectedField = ruleForm.locator(".ant-form-item").filter({ hasText: /^字段/ }).locator(".ant-select-selection-overflow");
        await expect(selectedField).toContainText("id");
        await expect(selectedField).toContainText("info");
      });

      await step("步骤2: 切换统计函数为key范围校验 → 字段切换为单选并保留首个已选字段，提示文案正确", async () => {
        const ruleForm = page.locator(".ruleForm").first();
        await selectRuleFunction(ruleForm, KEY_RANGE_RULE_NAME);
        const fieldSelect = ruleForm.locator(".ant-form-item").filter({ hasText: /^字段/ }).locator(".ant-select").first();
        await expect(fieldSelect).not.toHaveClass(/ant-select-multiple/);
        await expect(fieldSelect.locator(".ant-select-selection-item")).toHaveCount(1);
        await expect(fieldSelect.locator(".ant-select-selection-item").first()).toHaveText("id");

        const tooltip = await openFunctionTooltip(page, ruleForm);
        await expect(tooltip).toContainText("字段仅支持单选", { timeout: 5000 });
      });

      await step("步骤3: 先选info再选id → 最终仅保留id", async () => {
        const ruleForm = page.locator(".ruleForm").first();
        const fieldSelect = ruleForm.locator(".ant-form-item").filter({ hasText: /^字段/ }).locator(".ant-select").first();
        await selectAntOption(page, fieldSelect, "info");
        await selectAntOption(page, fieldSelect, "id");
        await expect(fieldSelect.locator(".ant-select-selection-item").first()).toHaveText("id");
      });
    });
  });
}
