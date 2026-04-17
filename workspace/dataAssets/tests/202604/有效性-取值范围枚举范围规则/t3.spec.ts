// META: {"id":"t3","priority":"P1","title":"验证在规则集中仅填写取值范围可正常保存"}
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  addRuleToPackage,
  configureRangeEnumRule,
  getRulePackage,
  getRuleSetListRow,
  gotoRuleSetList,
  openRuleSetEditor,
  saveRuleSet,
  selectRuleFieldAndFunction,
} from "./rule-editor-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695)";
const PAGE_NAME = "规则集管理";

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${`${SUITE_NAME} - ${PAGE_NAME}`} - ${datasource.reportName}`, () => {
    test.beforeAll(() => {
      setCurrentDatasource(datasource);
    });

    test.beforeEach(() => {
      setCurrentDatasource(datasource);
    });

    test.afterAll(() => {
      clearCurrentDatasource();
    });
    test("验证在规则集中仅填写取值范围可正常保存", async ({ page, step }) => {
      await step(
        "步骤1: 进入规则集管理页面 → 规则集管理页面打开，列表显示已有规则集数据行",
        async () => {
          await gotoRuleSetList(page);
          await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 15000 });
        },
        page.locator(".ant-table-tbody"),
      );

      await step(
        "步骤2: 找到 ruleset_15695_range 点击编辑，新增规则仅填写取值范围 >= 0 → Step2 打开，规则包显示仅取值范围包",
        async () => {
          await openRuleSetEditor(page, "ruleset_15695_range", ["仅取值范围包"]);
          await expect(
            page.locator(".ruleSetMonitor__package").filter({ hasText: "仅取值范围包" }).first(),
          ).toBeVisible({ timeout: 10000 });

          const ruleForm = await addRuleToPackage(page, "仅取值范围包");
          const functionRow = await selectRuleFieldAndFunction(page, ruleForm, "score", "取值范围");
          await configureRangeEnumRule(page, ruleForm, {
            field: "score",
            functionName: "取值范围",
            range: {
              firstOperator: ">=",
              firstValue: "0",
            },
            ruleStrength: "强规则",
          });

          await expect(ruleForm).toContainText("score");
          await expect(functionRow.locator(".ant-select").first()).toContainText("取值范围");
        },
        page.locator(".ruleSetMonitor__package").filter({ hasText: "仅取值范围包" }).first(),
      );

      await step(
        "步骤3: 保存规则后重新进入编辑页 → 新增规则成功落库，回显取值范围 >=0 且字段为 score",
        async () => {
          await saveRuleSet(page);
          await gotoRuleSetList(page);

          await expect(getRuleSetListRow(page, "ruleset_15695_range")).toBeVisible({
            timeout: 10000,
          });

          await openRuleSetEditor(page, "ruleset_15695_range");
          const packageSection = await getRulePackage(page, "仅取值范围包");
          await expect(packageSection).toContainText("score");
          await expect(packageSection).toContainText(">=");
          await expect(packageSection.getByPlaceholder("请输入数值").first()).toHaveValue("0");
        },
        page.locator(".ruleSetMonitor__package").filter({ hasText: "仅取值范围包" }).first(),
      );
    });
  });
}
