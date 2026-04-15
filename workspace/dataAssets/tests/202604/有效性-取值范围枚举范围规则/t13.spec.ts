// META: {"id":"t13","priority":"P2","title":"验证在规则集中取值范围&枚举范围规则支持克隆且克隆后配置内容与原规则一致"}
import type { Locator } from "@playwright/test";
import { expect, test } from "../../fixtures/step-screenshot";
import {
  cloneRule,
  deleteRule,
  getRulePackage,
  getRuleSetListRow,
  gotoRuleSetList,
  openRuleSetEditor,
} from "./rule-editor-helpers";

test.use({ storageState: ".auth/session.json" });

test.describe("【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 规则集管理", () => {
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
        await expect(getRuleSetListRow(page, "ruleset_15695_and")).toBeVisible({ timeout: 10000 });
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
