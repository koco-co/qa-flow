// META: {"id":"t16","priority":"P1","title":"验证执行含取值范围&枚举范围或关系规则的任务后校验通过"}
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  ensureRuleTasks,
  executeTaskFromList,
  getTaskDetailRuleCard,
  getTableRowByTaskName,
  openTaskInstanceDetail,
  waitForTaskInstanceFinished,
} from "./rule-task-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

const tableRows = ".ant-table-tbody tr:not(.ant-table-measure-row)";

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 规则任务管理"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => {
      setCurrentDatasource(datasource);
    });

    test.beforeEach(() => {
      setCurrentDatasource(datasource);
    });

    test.afterAll(() => {
      clearCurrentDatasource();
    });
    test("验证执行含取值范围&枚举范围或关系规则的任务后校验通过", async ({ page, step }) => {
      // 前置：已创建任务"task_15695_or"，或关系下（score>1 或 score in -1）全部记录均满足

      await step("步骤1: 进入规则任务管理页面 → 任务列表显示已有任务数据行", async () => {
        await ensureRuleTasks(page, ["task_15695_or"]);
        const taskTable = page.locator(tableRows).first();
        await expect(taskTable).toBeVisible({ timeout: 10000 });
      });

      await step(
        "步骤2: 点击task_15695_or的执行按钮 → 页面弹出提示信息，提示任务已提交执行",
        async () => {
          const targetRow = page.locator(tableRows).filter({ hasText: "task_15695_or" }).first();
          await expect(targetRow).toBeVisible({ timeout: 10000 });
          await executeTaskFromList(page, "task_15695_or");
        },
      );

      await step(
        "步骤3: 进入校验结果查询页面，查看task_15695_or实例详情 → 质检结果列显示「校验通过」，操作列显示--",
        async () => {
          const instanceRow = await waitForTaskInstanceFinished(page, "task_15695_or");
          const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
          const ruleCard = getTaskDetailRuleCard(detailDrawer, "取值范围&枚举范围");

          await expect(detailDrawer).toContainText("校验通过");
          await expect(ruleCard).toContainText("有效性校验");
          await expect(ruleCard).toContainText("取值范围&枚举范围");
          await expect(detailDrawer.getByRole("button", { name: "查看明细" })).toHaveCount(0);
        },
        getTableRowByTaskName(page, "task_15695_or"),
      );
    });
  });
}
