// META: {"id":"t17","priority":"P2","title":"验证弱规则标识在校验结果查询实例详情中展示正确"}
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
    test("验证弱规则标识在校验结果查询实例详情中展示正确", async ({ page, step }) => {
      // 前置：已创建任务"task_15695_weak"，关联规则集ruleset_15695_weak（弱规则配置）

      await step("步骤1: 进入规则任务管理页面 → 任务列表显示已有任务数据行", async () => {
        await ensureRuleTasks(page, ["task_15695_weak"]);
        const taskTable = page.locator(tableRows).first();
        await expect(taskTable).toBeVisible({ timeout: 10000 });
      });

      await step(
        "步骤2: 点击task_15695_weak的执行按钮 → 页面弹出提示信息，提示任务已提交执行",
        async () => {
          const targetRow = getTableRowByTaskName(page, "task_15695_weak");
          await expect(targetRow).toBeVisible({ timeout: 10000 });
          await executeTaskFromList(page, "task_15695_weak");
        },
      );

      await step(
        "步骤3: 进入校验结果查询，查看task_15695_weak实例详情弱规则标识 → 强弱规则列标识为「弱规则」",
        async () => {
          const instanceRow = await waitForTaskInstanceFinished(page, "task_15695_weak");
          const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
          const ruleCard = getTaskDetailRuleCard(detailDrawer, "取值范围&枚举范围");
          await expect(ruleCard).toContainText("弱规则");
        },
        getTableRowByTaskName(page, "task_15695_weak"),
      );
    });
  });
}
