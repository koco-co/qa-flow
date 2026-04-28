// META: {"id":"t11","priority":"P1","title":"验证校验结果查询中的明细/下载/通过无明细/失败日志"}
import { expect, test } from "../../../shared/fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import { FAIL_LOG_TASK_NAME, MAIN_TASK_NAME, PASS_TASK_NAME, ensureExecutedRuleTasks, getTaskDetailRuleCard, openTaskInstanceDetail, openTaskLogDrawer, openTaskRuleDetailDataDrawer, waitForTaskInstanceFinished } from "./task-helpers";
import { KEY_RANGE_RULE_NAME, assertOnlyTheseDetailRows, expectDetailTitle, expectHighlightedColumn } from "./suite-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 校验结果查询"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证校验不通过时查看明细：标题、字段标红及全字段展示", async ({ page }) => {
      await ensureExecutedRuleTasks(page, [MAIN_TASK_NAME]);
      const instanceRow = await waitForTaskInstanceFinished(page, MAIN_TASK_NAME, 600000);
      const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
      const ruleCard = getTaskDetailRuleCard(detailDrawer, KEY_RANGE_RULE_NAME);
      await expect(ruleCard).toBeVisible({ timeout: 10000 });
      const dataDrawer = await openTaskRuleDetailDataDrawer(page, detailDrawer);
      await expectDetailTitle(page, `完整性校验-${KEY_RANGE_RULE_NAME}`);
      await assertOnlyTheseDetailRows(dataDrawer, [2, 3]);
      await expectHighlightedColumn(dataDrawer, "info");
      await expect(dataDrawer.locator("th").filter({ hasText: /^id$/ })).toBeVisible();
      await expect(dataDrawer.locator("th").filter({ hasText: /info/ })).toBeVisible();
    });

    test("验证下载明细数据中校验字段标红展示", async ({ page }) => {
      await ensureExecutedRuleTasks(page, [MAIN_TASK_NAME]);
      const instanceRow = await waitForTaskInstanceFinished(page, MAIN_TASK_NAME, 600000);
      const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
      const dataDrawer = await openTaskRuleDetailDataDrawer(page, detailDrawer);
      const downloadButton = dataDrawer.getByRole("button", { name: "下载明细" });
      const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
      expect(download.suggestedFilename()).toMatch(/xlsx?$/i);
      await expectHighlightedColumn(dataDrawer, "info");
    });

    test("验证校验通过时结果查询页不显示明细入口", async ({ page }) => {
      await ensureExecutedRuleTasks(page, [PASS_TASK_NAME]);
      const instanceRow = await waitForTaskInstanceFinished(page, PASS_TASK_NAME, 600000);
      const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
      const ruleCard = getTaskDetailRuleCard(detailDrawer, KEY_RANGE_RULE_NAME);
      await expect(ruleCard).toBeVisible({ timeout: 10000 });
      await expect(detailDrawer).toContainText("校验通过");
      await expect(detailDrawer.getByRole("button", { name: /查看明细/ })).toHaveCount(0);
    });

    test("验证校验失败时支持查看日志", async ({ page }) => {
      await ensureExecutedRuleTasks(page, [FAIL_LOG_TASK_NAME]);
      const instanceRow = await waitForTaskInstanceFinished(page, FAIL_LOG_TASK_NAME, 600000);
      await expect(instanceRow).toContainText(/失败|异常/);
      const logDrawer = await openTaskLogDrawer(page, instanceRow);
      await expect(logDrawer).toContainText(/失败|异常|error|Exception/i);
    });
  });
}
