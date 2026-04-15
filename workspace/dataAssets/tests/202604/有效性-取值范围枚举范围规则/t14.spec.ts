// META: {"id":"t14","priority":"P1","title":"验证在规则集中配置过滤条件后规则保存成功"}
import { expect, test } from "../../fixtures/step-screenshot";
import { selectAntOption } from "../../helpers/test-setup";
import {
  addRuleToPackage,
  configureRangeEnumRule,
  getRuleSetListRow,
  gotoRuleSetList,
  openRuleSetEditor,
  saveRuleSet,
} from "./rule-editor-helpers";

test.use({ storageState: ".auth/session.json" });

test.describe("【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 规则集管理", () => {
  test("验证在规则集中配置过滤条件后规则保存成功", async ({ page, step }) => {
    await step(
      "步骤1: 进入规则集管理页面 → 页面打开，列表显示已有规则集数据行",
      async () => {
        await gotoRuleSetList(page);
        await expect(getRuleSetListRow(page, "ruleset_15695_filter")).toBeVisible({
          timeout: 10000,
        });
      },
      page.locator(".ant-table-tbody"),
    );

    await step(
      "步骤2: 编辑ruleset_15695_filter并新增取值范围&枚举范围规则并配置过滤条件 → 规则集编辑页Step2打开，配置正常",
      async () => {
        await openRuleSetEditor(page, "ruleset_15695_filter", ["过滤条件包"]);
        await expect(
          page.locator(".ruleSetMonitor__package").filter({ hasText: "过滤条件包" }).first(),
        ).toBeVisible({ timeout: 10000 });

        const ruleForm = await addRuleToPackage(page, "过滤条件包");
        await configureRangeEnumRule(page, ruleForm, {
          field: "score",
          range: {
            firstOperator: ">",
            firstValue: "1",
          },
          ruleStrength: "强规则",
        });

        const filterSection = ruleForm.locator(".filterCondition").first();
        await expect(filterSection).toBeVisible({ timeout: 5000 });
        await filterSection.getByRole("button", { name: /点击配置/ }).click();

        const filterModal = page.locator(".ant-modal:visible").first();
        await filterModal.waitFor({ state: "visible", timeout: 10000 });

        await selectAntOption(page, filterModal.locator(".ant-select").first(), "category");
        await selectAntOption(page, filterModal.locator(".ant-select").nth(1), "in");
        await filterModal.locator("input").last().fill("'1','2','3'");
        await filterModal.getByRole("button", { name: /确认|确定/ }).click();
        await filterModal.waitFor({ state: "hidden", timeout: 10000 });

        await expect(ruleForm.locator(".filterCondition input[disabled]").first()).not.toHaveValue(
          "",
        );
      },
      page.locator(".ruleForm").last(),
    );

    await step(
      "步骤3: 保存规则 → 规则保存成功，规则列表中对应规则显示过滤条件已配置",
      async () => {
        await saveRuleSet(page);

        const successMsg = page.locator(
          ".ant-message-notice, .ant-notification-notice, .ant-message",
        );
        await expect(successMsg.filter({ hasText: /保存成功|成功/ }).first()).toBeVisible({
          timeout: 5000,
        });
      },
      page.locator(".ant-message-notice, .ant-notification-notice, .ant-message").first(),
    );
  });
});
