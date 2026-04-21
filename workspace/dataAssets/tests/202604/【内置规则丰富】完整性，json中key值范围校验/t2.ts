// META: {"id":"t2","priority":"P1","title":"验证校验内容选择/搜索/回显/悬浮/标签提示"}
import { expect, test } from "../../fixtures/step-screenshot";
import { addRuleToPackage } from "../有效性-取值范围枚举范围规则/rule-editor-helpers";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  setCurrentDatasource,
} from "./test-data";
import {
  KEY_RANGE_RULE_NAME,
  SCENARIOS,
  collectVerificationOptions,
  configureKeyRangeRule,
  openFunctionTooltip,
  openRuleContentTooltip,
  searchVerificationContent,
  selectRuleFunction,
  setVerificationContent,
  startRuleSetDraft,
} from "./suite-helpers";
import { selectAntOption } from "../../helpers";

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
});
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 规则集管理"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证校验内容支持多选和全选操作", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.main);
      const ruleForm = await addRuleToPackage(
        page,
        SCENARIOS.main.packageName,
        "完整性校验",
      );
      const levelSelect = ruleForm
        .locator(".ant-form-item")
        .filter({ hasText: /规则类型/ })
        .locator(".ant-select")
        .first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await configureKeyRangeRule(page, ruleForm, {
        field: "info",
        method: "包含",
        keyNames: ["key1", "key11"],
      });
      await expect(ruleForm).toContainText("key1");
      await expect(ruleForm).toContainText("key11");
    });

    test("验证校验内容下拉框支持输入关键词搜索查询", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.main);
      const ruleForm = await addRuleToPackage(
        page,
        SCENARIOS.main.packageName,
        "完整性校验",
      );
      const levelSelect = ruleForm
        .locator(".ant-form-item")
        .filter({ hasText: /规则类型/ })
        .locator(".ant-select")
        .first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await selectAntOption(
        page,
        ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /^字段/ })
          .locator(".ant-select")
          .first(),
        "info",
      );
      await selectRuleFunction(ruleForm, KEY_RANGE_RULE_NAME);

      const key1Dropdown = await searchVerificationContent(
        page,
        ruleForm,
        "key1",
      );
      await expect(key1Dropdown).toContainText("key1");
      await expect(key1Dropdown).toContainText("key11");

      const provinceDropdown = await searchVerificationContent(
        page,
        ruleForm,
        "省份",
      );
      await expect(provinceDropdown).toContainText("key11");

      const noneDropdown = await searchVerificationContent(
        page,
        ruleForm,
        "xyz_not_exist",
      );
      await expect(noneDropdown).toContainText(/暂无数据|No Data/i);
      await page.keyboard.press("Escape").catch(() => undefined);
    });

    test("验证校验内容回显格式与悬浮展示正确", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.main);
      const ruleForm = await addRuleToPackage(
        page,
        SCENARIOS.main.packageName,
        "完整性校验",
      );
      const levelSelect = ruleForm
        .locator(".ant-form-item")
        .filter({ hasText: /规则类型/ })
        .locator(".ant-select")
        .first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await selectAntOption(
        page,
        ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /^字段/ })
          .locator(".ant-select")
          .first(),
        "info",
      );
      await selectRuleFunction(ruleForm, KEY_RANGE_RULE_NAME);
      await selectAntOption(
        page,
        ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /校验方法/ })
          .locator(".ant-select")
          .first(),
        "包含",
      );
      await setVerificationContent(page, ruleForm, [
        "key1",
        "key2",
        "key11",
        "key22",
      ]);
      await expect(ruleForm).toContainText(/key1.*key2/);
      await expect(ruleForm).toContainText(/key11.*key22/);

      const tooltip = await openRuleContentTooltip(page, ruleForm);
      await expect(tooltip).toContainText("key1-key2");
      await expect(tooltip).toContainText("key11-key22");
    });

    test("验证校验内容标签旁悬浮提示文案正确", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.main);
      const ruleForm = await addRuleToPackage(
        page,
        SCENARIOS.main.packageName,
        "完整性校验",
      );
      const levelSelect = ruleForm
        .locator(".ant-form-item")
        .filter({ hasText: /规则类型/ })
        .locator(".ant-select")
        .first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await selectAntOption(
        page,
        ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /^字段/ })
          .locator(".ant-select")
          .first(),
        "info",
      );
      await selectRuleFunction(ruleForm, KEY_RANGE_RULE_NAME);
      const tooltip = await openFunctionTooltip(page, ruleForm);
      await expect(tooltip).toContainText(/通用配置|字段仅支持单选/);
    });

    test("验证key数据量可展示现有维护项", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.main);
      const ruleForm = await addRuleToPackage(
        page,
        SCENARIOS.main.packageName,
        "完整性校验",
      );
      const levelSelect = ruleForm
        .locator(".ant-form-item")
        .filter({ hasText: /规则类型/ })
        .locator(".ant-select")
        .first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await selectAntOption(
        page,
        ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /^字段/ })
          .locator(".ant-select")
          .first(),
        "info",
      );
      await selectRuleFunction(ruleForm, KEY_RANGE_RULE_NAME);
      const options = await collectVerificationOptions(page, ruleForm);
      expect(options).toEqual(
        expect.arrayContaining(["全部", "key1", "key2", "key11", "key22"]),
      );
    });
  });
}
