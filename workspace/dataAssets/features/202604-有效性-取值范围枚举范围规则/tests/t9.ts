// META: {"id":"t9","priority":"P1","title":"验证枚举值设置已选择in但未输入枚举值时点击保存提示校验错误"}
import type { Locator } from "@playwright/test";
import { expect, test } from "../../fixtures/step-screenshot";
import { selectAntOption } from "../../helpers/test-setup";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  addRuleToPackage,
  gotoRuleSetList,
  openRuleSetEditor,
  selectRuleFieldAndFunction,
  selectRuleRelation,
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
    test("验证枚举值设置已选择in但未输入枚举值时点击保存提示校验错误", async ({ page, step }) => {
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
          await expect(
            page.locator(".ruleSetMonitor__package").filter({ hasText: "且关系校验包" }).first(),
          ).toBeVisible({ timeout: 10000 });

          ruleForm = await addRuleToPackage(page, "且关系校验包");
          functionRow = await selectRuleFieldAndFunction(page, ruleForm, "score");
          await expect(functionRow.locator(".ant-select").first()).toContainText(
            "取值范围&枚举范围",
          );
        },
        page.locator(".ruleForm").last(),
      );

      await step(
        "步骤3: 填写字段score，取值范围> 1，枚举值仅选择in不输入枚举值，关系选且，强规则 → 枚举值操作符显示in，枚举值输入区为空",
        async () => {
          await selectAntOption(page, functionRow.locator(".ant-select").nth(1), ">");
          await functionRow.getByPlaceholder("请输入数值").first().fill("1");

          await selectAntOption(page, functionRow.locator(".ant-select").nth(3), "in");
          await selectRuleRelation(ruleForm, "且");

          await expect(functionRow.locator(".ant-select").nth(3)).toContainText("in");
        },
        page.locator(".ruleForm").last(),
      );

      await step(
        "步骤4: 点击保存按钮 → 保存被拦截，页面仍停留在编辑态且枚举值输入区保持为空",
        async () => {
          await page
            .getByRole("button", { name: /保\s*存/ })
            .first()
            .click();
          await page.waitForTimeout(500);

          await expect(ruleForm).toBeVisible({ timeout: 5000 });
          await expect(functionRow.locator(".ant-select").nth(3)).toContainText("in");
          await expect(
            functionRow
              .locator(".ant-select")
              .nth(4)
              .locator(".ant-select-selection-item, .ant-tag"),
          ).toHaveCount(0);
          await expect(page.getByRole("button", { name: /保\s*存/ }).first()).toBeVisible();
        },
        functionRow.locator(".ant-select").nth(4),
      );
    });
  });
}
