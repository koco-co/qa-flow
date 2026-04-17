// META: {"id":"t5","priority":"P1","title":"验证在规则集中枚举值选择not in后保存成功且编辑时回显正确"}
import { expect, test } from "../../fixtures/step-screenshot";
import { selectAntOption } from "../../helpers/test-setup";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  addRuleToPackage,
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
    test("验证在规则集中枚举值选择not in后保存成功且编辑时回显正确", async ({ page, step }) => {
      await step(
        "步骤1: 进入规则集管理页面 → 规则集管理页面打开，列表显示已有规则集数据行",
        async () => {
          await gotoRuleSetList(page);
          await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 15000 });
        },
        page.locator(".ant-table-tbody"),
      );

      await step(
        "步骤2: 找到 ruleset_15695_notin 点击编辑，新增规则配置枚举值 not in 4,5 → Step2 打开，枚举值操作符支持 in/not in 切换，当前显示 not in",
        async () => {
          await openRuleSetEditor(page, "ruleset_15695_notin", ["notin校验包"]);
          await expect(
            page.locator(".ruleSetMonitor__package").filter({ hasText: "notin校验包" }).first(),
          ).toBeVisible({ timeout: 10000 });

          const ruleForm = await addRuleToPackage(page, "notin校验包");
          const functionRow = await selectRuleFieldAndFunction(
            page,
            ruleForm,
            "category",
            "枚举值",
          );
          await selectAntOption(page, functionRow.locator(".ant-select").nth(1), "not in");
          const enumInput = functionRow.locator(".ant-select").nth(2).locator("input").last();
          for (const value of ["4", "5"]) {
            await enumInput.fill(value);
            await page.keyboard.press("Enter");
            await page.waitForTimeout(150);
          }

          await expect(functionRow.locator(".ant-select").nth(1)).toContainText("not in");
          await expect(ruleForm).toContainText("category");
        },
        page.locator(".ruleSetMonitor__package").filter({ hasText: "notin校验包" }).first(),
      );

      await step(
        "步骤3: 保存规则集后重新进入编辑页 → 枚举值列显示 not in '4,5'，回显操作符为 not in，枚举值回显 4、5",
        async () => {
          await saveRuleSet(page);
          await gotoRuleSetList(page);

          await expect(getRuleSetListRow(page, "ruleset_15695_notin")).toBeVisible({
            timeout: 10000,
          });

          await openRuleSetEditor(page, "ruleset_15695_notin");
          const packageSection = await getRulePackage(page, "notin校验包");
          await expect(packageSection).toContainText("枚举值");
          await expect(packageSection).toContainText("not in");

          const enumTags = packageSection.locator(".ant-tag, .ant-select-selection-item");
          await expect(enumTags.filter({ hasText: "4" }).first()).toBeVisible();
          await expect(enumTags.filter({ hasText: "5" }).first()).toBeVisible();
        },
        page.locator(".ruleSetMonitor__package").filter({ hasText: "notin校验包" }).first(),
      );
    });
  });
}
