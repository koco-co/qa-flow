// META: {"id":"t15","priority":"P0","title":"验证执行含取值范围&枚举范围且关系规则的任务后校验结果查询实例详情展示正确"}
import { expect, test } from "../../fixtures/step-screenshot";
import {
  ensureRuleTasks,
  executeTaskFromList,
  getTaskDetailRuleCard,
  getTableRowByTaskName,
  openTaskInstanceDetail,
  waitForTaskInstanceFinished,
} from "./rule-task-helpers";

test.use({ storageState: ".auth/session.json" });
test.setTimeout(600000);

const tableRows = ".ant-table-tbody tr:not(.ant-table-measure-row)";

test.describe("【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 规则任务管理", () => {
  test("验证执行含取值范围&枚举范围且关系规则的任务后校验结果查询实例详情展示正确", async ({
    page,
    step,
  }) => {
    // 前置：已创建任务"task_15695_and"，关联规则集ruleset_15695_and（且关系规则）

    await step("步骤1: 进入规则任务管理页面 → 任务列表显示已有任务数据行", async () => {
      await ensureRuleTasks(page, ["task_15695_and"]);
      const taskTable = page.locator(tableRows).first();
      await expect(taskTable).toBeVisible({ timeout: 10000 });
    });

    await step(
      "步骤2: 点击task_15695_and的执行按钮 → 页面弹出提示信息，提示任务已提交执行",
      async () => {
        const targetRow = page.locator(tableRows).filter({ hasText: "task_15695_and" }).first();
        await expect(targetRow).toBeVisible({ timeout: 10000 });
        await executeTaskFromList(page, "task_15695_and");
      },
    );

    await step(
      "步骤3: 进入校验结果查询页面，查看task_15695_and实例详情中取值范围&枚举范围规则行 → 实例详情各列展示正确",
      async () => {
        const instanceRow = await waitForTaskInstanceFinished(page, "task_15695_and");
        const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
        const ruleCard = getTaskDetailRuleCard(detailDrawer, "取值范围&枚举范围");

        await expect(detailDrawer).toContainText("校验未通过");
        await expect(ruleCard).toContainText("有效性校验");
        await expect(ruleCard).toContainText("取值范围&枚举范围");
        await expect(ruleCard).toContainText("强规则");
        await expect(detailDrawer.getByRole("button", { name: "查看明细" })).toBeVisible({
          timeout: 10000,
        });
      },
      getTableRowByTaskName(page, "task_15695_and"),
    );
  });
});
