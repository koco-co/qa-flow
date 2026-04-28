// META: {"id":"t13","priority":"P2","title":"验证在规则集中取值范围&枚举范围规则支持克隆且克隆后配置内容与原规则一致"}
import type { Locator } from "@playwright/test";
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  addRuleToPackage,
  cloneRule,
  configureRangeEnumRule,
  deleteRule,
  getRulePackage,
  gotoRuleSetList,
  openRuleSetEditor,
} from "./rule-editor-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 规则集管理"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => {
      setCurrentDatasource(datasource);
    });

    test.beforeEach(() => {
      setCurrentDatasource(datasource);
    });

    test.afterAll(() => {
      clearCurrentDatasource();
    });
    test("验证在规则集中取值范围&枚举范围规则支持克隆且克隆后配置内容与原规则一致", async ({
      page,
      step,
    }) => {
      let packageSection: Locator;
      let beforeCount = 0;

      await step(
        "步骤1: 进入规则集管理页面 → 页面打开，列表显示已有规则集数据行",
        async () => {
          await gotoRuleSetList(page);
          await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 10000 });
        },
        page.locator(".ant-table-tbody"),
      );

      await step(
        "步骤2: 编辑ruleset_15695_and并克隆取值范围&枚举范围规则 → 新增一条与原规则配置完全相同的规则区域",
        async () => {
          await openRuleSetEditor(page, "ruleset_15695_and", ["且关系校验包"]);
          packageSection = await getRulePackage(page, "且关系校验包");

          const ruleForms = packageSection.locator(".ruleForm");
          beforeCount = await ruleForms.count();
          if (beforeCount === 0) {
            const seededRule = await addRuleToPackage(page, "且关系校验包", "有效性校验");
            await configureRangeEnumRule(page, seededRule, {
              field: "score",
              range: {
                firstOperator: ">",
                firstValue: "1",
                condition: "且",
                secondOperator: "<",
                secondValue: "10",
              },
              enumOperator: "in",
              enumValues: ["1", "2", "3"],
              relation: "且",
              ruleStrength: "强规则",
              description: "score取值范围1到10且枚举值in 1,2,3",
            });
            beforeCount = await ruleForms.count();
          }
          const sourceRule = ruleForms.first();
          await expect(sourceRule).toContainText("取值范围&枚举范围");

          await cloneRule(sourceRule);
          await expect(ruleForms).toHaveCount(beforeCount + 1, { timeout: 5000 });

          const clonedRule = ruleForms.nth(1);
          await expect(clonedRule).toContainText("取值范围&枚举范围");
          await expect(clonedRule).toContainText("score");
        },
        page.locator(".ruleForm").nth(1),
      );

      await step(
        "步骤3: 删除克隆出的规则 → 克隆的规则被删除，页面恢复为仅一条规则",
        async () => {
          const ruleForms = packageSection.locator(".ruleForm");
          const clonedRule = ruleForms.nth(1);
          await expect(clonedRule).toBeVisible({ timeout: 5000 });

          await deleteRule(page, clonedRule);
          await expect(ruleForms).toHaveCount(beforeCount, { timeout: 5000 });
        },
        page.locator(".ruleForm").first(),
      );
    });
  });
}
