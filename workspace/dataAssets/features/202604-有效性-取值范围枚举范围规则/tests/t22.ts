// META: {"id":"t22","priority":"P1","title":"验证取值范围&枚举范围规则校验「不通过时可查看」明细且校验字段标红展示"}
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  ensureExecutedRuleTasks,
  getTaskDetailRuleCard,
  openTaskInstanceDetail,
  openTaskRuleDetailDataDrawer,
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
    // 前置：
    // 1) 使用 admin 账号登录数据资产平台
    // 2) 规则任务 task_15695_and 已执行完成，且关系规则校验结果为不通过
    // 3) 数据表 test_db.quality_test_num 不符合规则的记录为 id=1,2,4,5
    // 4) task_15695_and 最新实例详情中，取值范围&枚举范围规则行操作列显示【查看详情】链接

    test("验证取值范围&枚举范围规则校验「不通过时可查看」明细且校验字段标红展示", async ({
      page,
      step,
    }) => {
      // 步骤1：进入【数据质量 → 校验结果查询】页面
      let instanceRow;
      await step(
        "步骤1: 进入【数据质量 → 校验结果查询】页面，等待列表加载完成 → 校验结果查询页面打开，列表显示已有任务记录",
        async () => {
          await ensureExecutedRuleTasks(page, ["task_15695_and"]);
          instanceRow = await waitForTaskInstanceFinished(page, "task_15695_and");
          await expect(instanceRow).toBeVisible({ timeout: 10000 });
        },
      );
      let detailDrawer;

      await step(
        "步骤2: 在列表中找到 task_15695_and 最新实例记录，点击【查看详情】打开实例详情 → 实例详情页面打开，取值范围&枚举范围规则行操作列显示【查看详情】链接",
        async () => {
          detailDrawer = await openTaskInstanceDetail(page, instanceRow);
          const ruleCard = getTaskDetailRuleCard(detailDrawer, "取值范围&枚举范围");
          await expect(ruleCard).toBeVisible({ timeout: 10000 });
          await expect(detailDrawer).toContainText("校验未通过");
          await expect(detailDrawer.getByRole("button", { name: "查看明细" })).toBeVisible({
            timeout: 5000,
          });
        },
        instanceRow,
      );

      // 步骤3：点击规则行操作列的【查看详情】链接，进入明细数据页面
      await step(
        "步骤3: 在实例详情中点击规则行操作列【查看详情】链接 → 明细数据页面打开，显示不通过记录数据列表",
        async () => {
          const dataDrawer = await openTaskRuleDetailDataDrawer(page, detailDrawer);
          const detailRows = dataDrawer.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
          await expect(detailRows.first()).toBeVisible({ timeout: 10000 });
        },
      );

      // 步骤4：验证明细数据中校验字段 score 标红展示，不通过记录共4条
      await step(
        "步骤4: 在明细数据页面中查看数据列表的字段展示情况和记录内容 → 校验字段 score 以标红方式展示，列表中仅包含不符合规则的记录共4条",
        async () => {
          const dataDrawer = page.locator(".ant-drawer:visible").last();
          const detailRows = dataDrawer.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
          await expect(detailRows).toHaveCount(4, { timeout: 10000 });

          const scoreHeader = dataDrawer.locator("th").filter({ hasText: "score" }).first();
          await expect(scoreHeader.locator("span").first()).toHaveAttribute(
            "style",
            /rgb\(249, 108, 91\)/,
          );

          const scoreCell = detailRows.nth(0).locator("td").nth(1).locator("span").first();
          await expect(scoreCell).toHaveAttribute("style", /rgb\(249, 108, 91\)/);
          await expect(dataDrawer.locator("th").filter({ hasText: "id" }).first()).toBeVisible();
          await expect(scoreHeader).toBeVisible();
          await expect(
            dataDrawer.locator("th").filter({ hasText: "category" }).first(),
          ).toBeVisible();
        },
        page.locator(".ant-drawer:visible").last(),
      );
    });
  });
}
