// META: {"id":"t18","priority":"P2","title":"验证取值范围&枚举范围规则执行失败时可查看日志"}
import { expect, test } from "../../fixtures/step-screenshot";
import {
  ensureExecutedRuleTasks,
  getTaskDetailRuleCard,
  openTaskInstanceDetail,
  waitForTaskInstanceFinished,
} from "./rule-task-helpers";

test.use({ storageState: ".auth/session.json" });
test.setTimeout(600000);

test.describe("【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 校验结果查询", () => {
  test("验证取值范围&枚举范围规则执行失败时可查看日志", async ({ page, step }) => {
    await step("步骤1: 进入校验结果查询页面 → 列表显示已有任务记录", async () => {
      await ensureExecutedRuleTasks(page, ["task_15695_enum_fail"]);
      const instanceRow = await waitForTaskInstanceFinished(page, "task_15695_enum_fail");
      await expect(instanceRow).toBeVisible({ timeout: 10000 });
    });

    await step(
      "步骤2: 找到状态为执行失败的实例记录，打开实例详情后点击查看日志 → 日志弹窗正常打开，显示详细日志信息",
      async () => {
        const instanceRow = await waitForTaskInstanceFinished(page, "task_15695_enum_fail");
        await expect(instanceRow).toContainText(/校验异常|失败|未通过/);

        const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
        const ruleRow = getTaskDetailRuleCard(detailDrawer, "取值范围&枚举范围");
        await expect(ruleRow).toBeVisible({ timeout: 10000 });

        const viewLogBtn = ruleRow.locator("button, a").filter({ hasText: "查看日志" }).first();
        await expect(viewLogBtn).toBeVisible({ timeout: 5000 });
        await viewLogBtn.click();
        await page.waitForTimeout(1000);

        const logModal = page.locator(".ant-modal:visible, [class*='log-modal']:visible").first();
        await expect(logModal).toBeVisible({ timeout: 10000 });

        const logContent = logModal
          .locator("[class*='log-content'], .ant-modal-body, pre, .log-viewer")
          .first();
        await expect(logContent).toBeVisible({ timeout: 5000 });
        await expect(logContent).not.toHaveText("", { timeout: 5000 });
      },
      page.locator(".ant-modal:visible").first(),
    );
  });
});
