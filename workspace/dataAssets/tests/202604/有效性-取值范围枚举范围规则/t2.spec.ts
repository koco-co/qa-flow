// META: {"id":"t2","priority":"P1","title":"验证在规则集中配置取值范围&枚举范围规则或关系时保存成功"}
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  addRuleToPackage,
  configureRangeEnumRule,
  getRuleSetListRow,
  gotoRuleSetList,
  openRuleSetEditor,
  saveRuleSet,
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
    test("验证在规则集中配置取值范围&枚举范围规则或关系时保存成功", async ({ page, step }) => {
      await step(
        "步骤1: 进入规则集管理页面 → 规则集管理页面打开，列表显示已有规则集数据行",
        async () => {
          await gotoRuleSetList(page);
          await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 15000 });
        },
        page.locator(".ant-table-tbody"),
      );

      await step(
        "步骤2: 找到 ruleset_15695_or 点击编辑，新增规则并配置或关系 → Step2 打开，规则包显示或关系校验包",
        async () => {
          await openRuleSetEditor(page, "ruleset_15695_or", ["或关系校验包"]);
          await expect(
            page.locator(".ruleSetMonitor__package").filter({ hasText: "或关系校验包" }).first(),
          ).toBeVisible({ timeout: 10000 });

          const ruleForm = await addRuleToPackage(page, "或关系校验包");
          await configureRangeEnumRule(page, ruleForm, {
            field: "score",
            range: {
              firstOperator: ">",
              firstValue: "1",
            },
            enumOperator: "in",
            enumValues: ["-1"],
            relation: "或",
            ruleStrength: "强规则",
          });

          await expect(ruleForm).toContainText("score");
        },
        page.locator(".ruleSetMonitor__package").filter({ hasText: "或关系校验包" }).first(),
      );

      await step(
        "步骤3: 保存规则并完成规则集保存 → 规则保存成功，且或关系列显示「或」",
        async () => {
          await saveRuleSet(page);

          const successMsg = page.locator(
            ".ant-message-notice, .ant-notification-notice, .ant-message",
          );
          await expect(successMsg.filter({ hasText: /成功/ }).first()).toBeVisible({
            timeout: 5000,
          });

          await expect(getRuleSetListRow(page, "ruleset_15695_or")).toBeVisible({ timeout: 10000 });
        },
        getRuleSetListRow(page, "ruleset_15695_or"),
      );
    });
  });
}
