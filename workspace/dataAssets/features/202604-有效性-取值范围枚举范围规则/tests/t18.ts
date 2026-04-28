// META: {"id":"t18","priority":"P2","title":"验证取值范围&枚举范围规则执行失败时可查看日志"}
import type { Locator } from "@playwright/test";
import { expect, test } from "../../fixtures/step-screenshot";
import { ensureExecutedRuleTasks, waitForTaskInstanceFinished } from "./rule-task-helpers";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";

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
    test("验证取值范围&枚举范围规则执行失败时可查看日志", async ({ page }) => {
      let instanceRow: Locator | null = null;

      await test.step("步骤1: 进入校验结果查询页面 → 列表显示已有任务记录", async () => {
        await ensureExecutedRuleTasks(page, ["task_15695_str"]);
        instanceRow = await waitForTaskInstanceFinished(page, "task_15695_str");
        await expect(instanceRow).toBeVisible({ timeout: 10000 });
      });

      await test.step("步骤2: 找到状态为校验异常的实例记录，查看状态列异常提示 → 页面显示非空异常信息，并可进一步打开详情或异常弹窗", async () => {
        const latestInstanceRow = await waitForTaskInstanceFinished(page, "task_15695_str", 10000);
        instanceRow = latestInstanceRow;
        await expect(latestInstanceRow).toContainText(/校验异常|失败/);

        const statusCell = latestInstanceRow.locator("td").nth(2);
        await expect(statusCell).toBeVisible({ timeout: 5000 });
        await statusCell.hover();

        const tooltip = page.locator(".ant-tooltip:visible, .ant-popover:visible").last();
        await expect(tooltip).toBeVisible({ timeout: 10000 });
        const tooltipText = (await tooltip.textContent())?.trim() ?? "";
        if (!tooltipText) {
          throw new Error("Task abnormal tooltip is empty.");
        }

        const detailLink = tooltip.locator("a").first();
        if (await detailLink.isVisible().catch(() => false)) {
          await detailLink.click();

          const detailContainer = page.locator(".dtc-drawer:visible, .ant-modal:visible").last();
          await expect(detailContainer).toBeVisible({ timeout: 10000 });
        }
      });
    });
  });
}
