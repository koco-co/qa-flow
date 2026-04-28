// META: {"id":"t24","priority":"P1","title":"验证取值范围&枚举范围规则校验「通过时不记录」明细数据且操作列不显示查看详情"}
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  ensureExecutedRuleTasks,
  getTaskDetailRuleCard,
  openTaskInstanceDetail,
  waitForTaskInstanceFinished,
} from "./rule-task-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 校验结果查询"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => {
      setCurrentDatasource(datasource);
    });

    test.beforeEach(() => {
      setCurrentDatasource(datasource);
    });

    test.afterAll(() => {
      clearCurrentDatasource();
    });
    test("验证取值范围&枚举范围规则校验「通过时不记录」明细数据且操作列不显示查看详情", async ({
      page,
      step,
    }) => {
      // 前置：规则任务 task_15695_or 已执行完成，或关系下全部记录均满足，校验结果为通过

      // 步骤1：进入校验结果查询页面
      await step(
        "步骤1: 进入【数据质量 → 校验结果查询】页面 → 校验结果查询页面打开，列表显示已有任务记录",
        async () => {
          await ensureExecutedRuleTasks(page, ["task_15695_or"]);
          const instanceRow = await waitForTaskInstanceFinished(page, "task_15695_or");
          await expect(instanceRow).toBeVisible({ timeout: 10000 });
        },
      );

      // 步骤2：找到 task_15695_or 最新实例记录，点击【查看详情】打开实例详情
      await step(
        "步骤2: 找到 task_15695_or 最新实例记录，点击【查看详情】打开实例详情 → 实例详情页面打开，取值范围&枚举范围规则行数据加载完成",
        async () => {
          const instanceRow = await waitForTaskInstanceFinished(page, "task_15695_or");
          const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
          const ruleCard = getTaskDetailRuleCard(detailDrawer, "取值范围&枚举范围");
          await expect(ruleCard).toBeVisible({ timeout: 10000 });
        },
        page.locator(".dtc-drawer:visible").last(),
      );

      // 步骤3：验证质检结果、详情说明、操作列内容
      await step(
        "步骤3: 查看规则行的质检结果列、详情说明列和操作列 → 质检结果为「校验通过」，详情说明含规则描述，操作列显示 --",
        async () => {
          const detailDrawer = page.locator(".dtc-drawer:visible").last();
          const ruleCard = getTaskDetailRuleCard(detailDrawer, "取值范围&枚举范围");

          await expect(detailDrawer).toContainText("校验通过", { timeout: 5000 });
          await expect(ruleCard).toContainText(">1", { timeout: 5000 });
          await expect(ruleCard).toContainText("in -1", { timeout: 5000 });
          await expect(ruleCard).toContainText("或", { timeout: 5000 });
          await expect(detailDrawer.getByRole("button", { name: "查看明细" })).toHaveCount(0);
        },
        page.locator(".dtc-drawer:visible").last(),
      );
    });
  });
}
