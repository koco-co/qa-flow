// META: {"id":"t10","priority":"P1","title":"验证取值范围设置和枚举值设置均已填写但取值范围和枚举值关系未选择时点击保存提示校验错误"}
import type { Locator } from "@playwright/test";
import { expect, test } from "../../fixtures/step-screenshot";
import { selectAntOption } from "../../helpers/test-setup";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  addRuleToPackage,
  gotoRuleSetList,
  openRuleSetEditor,
  selectRuleFieldAndFunction,
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
    test("验证取值范围设置和枚举值设置均已填写但取值范围和枚举值关系未选择时点击保存提示校验错误", async ({
      page,
      step,
    }) => {
      let ruleForm: Locator;
      let functionRow: Locator;

      await step(
        "步骤1: 进入规则集管理页面，等待列表加载完成 → 规则集管理页面正常打开，列表显示已有规则集数据行",
        async () => {
          await gotoRuleSetList(page);
          await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 10000 });
        },
        page.locator(".ant-table-tbody"),
      );

      await step(
        "步骤2: 找到ruleset_15695_and，点击编辑，新增规则并选择取值范围&枚举范围 → 规则配置区域展开，统计函数显示取值范围&枚举范围",
        async () => {
          await openRuleSetEditor(page, "ruleset_15695_and", ["且关系校验包"]);
          await expect(page.getByText("且关系校验包")).toBeVisible({ timeout: 10000 });

          ruleForm = await addRuleToPackage(page, "且关系校验包");
          functionRow = await selectRuleFieldAndFunction(page, ruleForm, "score");
          await expect(functionRow.locator(".ant-select").first()).toContainText(
            "取值范围&枚举范围",
          );
        },
        page.locator(".ruleForm").last(),
      );

      await step(
        "步骤3: 填写字段score，取值范围>1，枚举值in 1、2、3，不选择且/或关系，强规则 → 取值范围和枚举值均已填写，关系未选择",
        async () => {
          await selectAntOption(page, functionRow.locator(".ant-select").nth(1), ">");
          await functionRow.getByPlaceholder("请输入数值").first().fill("1");

          await selectAntOption(page, functionRow.locator(".ant-select").nth(3), "in");
          const enumInput = functionRow.locator(".ant-select").nth(4).locator("input").last();
          for (const value of ["1", "2", "3"]) {
            await enumInput.fill(value);
            await page.keyboard.press("Enter");
            await page.waitForTimeout(150);
          }

          await expect(
            functionRow.locator(".ant-radio-wrapper, .ant-radio-button-wrapper"),
          ).toHaveCount(4);
        },
        page.locator(".ruleForm").last(),
      );

      await step(
        "步骤4: 点击保存按钮 → 保存被阻断，关系仍保持未选择且页面停留在规则编辑态",
        async () => {
          await page
            .getByRole("button", { name: /保\s*存/ })
            .first()
            .click();
          await page.waitForTimeout(500);

          const relationOptions = functionRow.locator(
            ".ant-radio-wrapper, .ant-radio-button-wrapper",
          );
          await expect(page).toHaveURL(/\/dq\/ruleSet\/(edit|add)/);
          await expect(ruleForm).toContainText("取值范围和枚举值的关系");
          await expect(relationOptions.nth(2).locator('input[type="radio"]')).not.toBeChecked();
          await expect(relationOptions.nth(3).locator('input[type="radio"]')).not.toBeChecked();
        },
        ruleForm,
      );
    });
  });
}
