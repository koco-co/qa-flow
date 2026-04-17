// META: {"id":"t15","priority":"P0","title":"验证执行含取值范围&枚举范围且关系规则的任务后校验结果查询实例详情展示正确"}
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  ensureRuleTasks,
  executeTaskFromList,
  getTaskDetailRuleCard,
  openTaskInstanceDetail,
  waitForTaskMonitorReady,
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
    test("验证执行含取值范围&枚举范围且关系规则的任务后校验结果查询实例详情展示正确", async ({
      page,
      step,
    }) => {
      // 前置：已创建任务"task_15695_and"，关联规则集ruleset_15695_and（且关系规则）

      await step("步骤1: 进入规则任务管理页面 → 任务列表显示已有任务数据行", async () => {
        await ensureRuleTasks(page, ["task_15695_and"]);
        await waitForTaskMonitorReady(page, "task_15695_and", 30000);
      });

      await step(
        "步骤2: 点击task_15695_and的执行按钮 → 页面弹出提示信息，提示任务已提交执行",
        async () => {
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
        page.locator(".dtc-drawer:visible").last(),
      );
    });
  });
}
