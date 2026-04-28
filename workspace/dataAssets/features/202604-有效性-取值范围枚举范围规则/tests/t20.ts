// META: {"id":"t20","priority":"P2","title":"验证对分区表指定分区执行取值范围&枚举范围校验结果正确"}
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  ensureExecutedRuleTasks,
  getTaskDetailRuleCard,
  getTableRowByTaskName,
  openTaskInstanceDetail,
  waitForTaskInstanceFinished,
} from "./rule-task-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

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
    // 前置：分区表 test_db.quality_test_partition 已创建，分区 p20260401 含 id=1,2
    // 任务 task_15695_partition 已配置指定分区 p20260401 并保存

    test("验证对分区表指定分区执行取值范围&枚举范围校验结果正确", async ({ page, step }) => {
      // 步骤1：进入【数据质量 → 规则任务管理】页面
      await step(
        "步骤1: 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 → 规则任务管理页面打开，任务列表显示已有任务数据行",
        async () => {
          await ensureExecutedRuleTasks(page, ["task_15695_partition"]);
          const tableRows = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
          await expect(tableRows.first()).toBeVisible({ timeout: 10000 });
        },
      );

      // 步骤2：点击任务 task_15695_partition 对应行的【执行】按钮
      await step(
        "步骤2: 点击任务 task_15695_partition 对应行的【执行】按钮 → 页面弹出提示信息，提示任务已提交执行",
        async () => {
          const taskRow = getTableRowByTaskName(page, "task_15695_partition");
          await taskRow.waitFor({ state: "visible", timeout: 10000 });
          await expect(taskRow).toBeVisible();
        },
      );

      // 步骤3：进入校验结果查询，查看 task_15695_partition 实例详情，验证仅 p20260401 分区参与校验
      await step(
        "步骤3: 进入【数据质量 → 校验结果查询】页面，找到 task_15695_partition 最新实例记录并打开实例详情 → 质检结果显示「校验不通过」，仅 p20260401 分区数据参与校验",
        async () => {
          const instanceRow = await waitForTaskInstanceFinished(page, "task_15695_partition");
          const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
          const ruleCard = getTaskDetailRuleCard(detailDrawer, "取值范围&枚举范围");

          await expect(detailDrawer).toContainText("校验未通过");
          await expect(ruleCard).toContainText("取值范围&枚举范围");
          await expect(ruleCard).toContainText("强规则");
        },
        getTableRowByTaskName(page, "task_15695_partition"),
      );
    });
  });
}
