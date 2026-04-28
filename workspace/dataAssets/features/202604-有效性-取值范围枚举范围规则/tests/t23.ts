// META: {"id":"t23","priority":"P1","title":"验证取值范围&枚举范围规则校验「不通过时下载」明细数据中校验字段标红展示"}
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  ensureExecutedRuleTasks,
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
    test("验证取值范围&枚举范围规则校验「不通过时下载」明细数据中校验字段标红展示", async ({
      page,
      step,
    }) => {
      // 前置：规则任务 task_15695_and 已执行完成，且关系规则校验结果为不通过
      // 前置：task_15695_and 最新实例详情中，取值范围&枚举范围规则行操作列显示【查看详情】链接，对应不通过记录为 id=1、id=2、id=4、id=5

      // 步骤1：进入校验结果查询页面
      await step(
        "步骤1: 进入【数据质量 → 校验结果查询】页面 → 校验结果查询页面打开，列表显示已有任务记录",
        async () => {
          await ensureExecutedRuleTasks(page, ["task_15695_and"]);
          const instanceRow = await waitForTaskInstanceFinished(page, "task_15695_and");
          await expect(instanceRow).toBeVisible({ timeout: 10000 });
        },
      );

      // 步骤2：找到 task_15695_and 最新实例记录，点击【查看详情】打开实例详情，再点击规则行操作列【查看详情】
      await step(
        "步骤2: 找到 task_15695_and 最新实例记录，打开实例详情，点击取值范围&枚举范围规则行操作列【查看详情】 → 明细数据页面打开，数据列表显示不通过记录共 4 条",
        async () => {
          const instanceRow = await waitForTaskInstanceFinished(page, "task_15695_and");
          const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
          const dataDrawer = await openTaskRuleDetailDataDrawer(page, detailDrawer);

          const detailRows = dataDrawer.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
          await expect(detailRows.first()).toBeVisible({ timeout: 10000 });
        },
      );

      // 步骤3：点击【下载明细】按钮，等待文件下载完成
      await step("步骤3: 点击【下载明细】按钮 → 浏览器触发文件下载", async () => {
        const downloadBtn = page.locator(".ant-drawer:visible").last().getByRole("button", {
          name: "下载明细",
        });
        await expect(downloadBtn).toBeVisible({ timeout: 5000 });

        const [download] = await Promise.all([page.waitForEvent("download"), downloadBtn.click()]);
        expect(download).toBeTruthy();
      });

      // 步骤4：验证明细页面中校验字段 score 标红展示
      await step(
        "步骤4: 查看明细数据页面中字段展示情况 → score 字段标红，不通过记录共 4 条",
        async () => {
          const dataDrawer = page.locator(".ant-drawer:visible").last();
          const detailRows = dataDrawer.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
          await expect(detailRows).toHaveCount(4, { timeout: 10000 });

          const scoreHeader = dataDrawer.locator("th").filter({ hasText: "score" }).first();
          await expect(scoreHeader.locator("span").first()).toHaveAttribute(
            "style",
            /rgb\(249, 108, 91\)/,
          );
          await expect(
            detailRows.nth(0).locator("td").nth(1).locator("span").first(),
          ).toHaveAttribute("style", /rgb\(249, 108, 91\)/);
        },
        page.locator(".ant-drawer:visible").last(),
      );
    });
  });
}
