// META: {"id":"t6","priority":"P1","title":"验证原有枚举值规则同步新增in/not in选项且保存后回显正确"}
import type { Locator } from "@playwright/test";
import { expect, test } from "../../fixtures/step-screenshot";
import { selectAntOption } from "../../helpers/test-setup";
import {
  addRuleToPackage,
  deleteRuleSetsByTableNames,
  getRulePackage,
  getRuleSetListRow,
  getSelectOptions,
  gotoRuleSetList,
  openRuleSetEditor,
  saveRuleSet,
  selectRuleFieldAndFunction,
} from "./rule-editor-helpers";

test.use({ storageState: ".auth/session.json" });

const SUITE_NAME = "【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695)";
const PAGE_NAME = "规则集管理";

test.describe(`${SUITE_NAME} - ${PAGE_NAME}`, () => {
  test("验证原有枚举值规则同步新增in/not in选项且保存后回显正确", async ({ page, step }) => {
    let functionRow: Locator;

    await step(
      "步骤1: 进入规则集管理页面 → 规则集管理页面打开，列表显示已有规则集数据行",
      async () => {
        await gotoRuleSetList(page);
        await deleteRuleSetsByTableNames(page, ["quality_test_num"]);
        await page.reload();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
        await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 15000 });
      },
      page.locator(".ant-table-tbody"),
    );

    await step(
      "步骤2: 找到 ruleset_15695_enum_orig 点击编辑，新增规则选择原有枚举值规则类型，查看下拉框选项 → 枚举值设置下拉框包含 in 和 not in，默认待选择操作符",
      async () => {
        await openRuleSetEditor(page, "ruleset_15695_enum_orig", ["原枚举值包"]);
        await expect(
          page.locator(".ruleSetMonitor__package").filter({ hasText: "原枚举值包" }).first(),
        ).toBeVisible({ timeout: 10000 });

        const ruleForm = await addRuleToPackage(page, "原枚举值包");
        functionRow = await selectRuleFieldAndFunction(page, ruleForm, "category", "枚举值");

        const enumOpSelect = functionRow.locator(".ant-select").nth(1);
        await expect(enumOpSelect).toContainText("请选择");

        const enumOptions = await getSelectOptions(page, enumOpSelect);
        expect(enumOptions).toContain("in");
        expect(enumOptions).toContain("not in");
      },
      page.locator(".ruleSetMonitor__package").filter({ hasText: "原枚举值包" }).first(),
    );

    await step(
      "步骤3: 选择 not in，填写 category 字段和枚举值 4、5，保存后重新进入验证回显 → 枚举值列显示 not in '4,5'，回显操作符为 not in，枚举值回显 4、5",
      async () => {
        await selectAntOption(page, functionRow.locator(".ant-select").nth(1), "not in");
        await expect(functionRow.locator(".ant-select").nth(1)).toContainText("not in");

        const enumInput = functionRow.locator(".ant-select").nth(2).locator("input").last();
        for (const value of ["4", "5"]) {
          await enumInput.fill(value);
          await page.keyboard.press("Enter");
          await page.waitForTimeout(150);
        }

        await saveRuleSet(page);
        await gotoRuleSetList(page);

        await expect(getRuleSetListRow(page, "ruleset_15695_enum_orig")).toBeVisible({
          timeout: 10000,
        });

        await openRuleSetEditor(page, "ruleset_15695_enum_orig");
        const packageSection = await getRulePackage(page, "原枚举值包");
        await expect(packageSection).toContainText("not in");

        const enumTags = packageSection.locator(".ant-tag, .ant-select-selection-item");
        await expect(enumTags.filter({ hasText: "4" }).first()).toBeVisible();
        await expect(enumTags.filter({ hasText: "5" }).first()).toBeVisible();
      },
      page.locator(".ruleSetMonitor__package").filter({ hasText: "原枚举值包" }).first(),
    );
  });
});
