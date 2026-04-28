// META: {"id":"t7","priority":"P0","title":"验证key范围校验完整主流程：规则集配置+导入规则包+执行校验+查看实例结果"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "../data/test-data";
import { KEY_RANGE_RULE_NAME, assertOnlyTheseDetailRows, expectDetailTitle, expectHighlightedColumn } from "../helpers/suite-helpers";
import { MAIN_TASK_NAME, ensureExecutedRuleTasks, getTaskDetailRuleCard, openTaskInstanceDetail, openTaskRuleDetailDataDrawer, waitForTaskInstanceFinished } from "./task-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 主流程"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证key范围校验完整主流程：规则集配置+导入规则包+执行校验+查看实例结果", async ({ page }) => {
      await ensureExecutedRuleTasks(page, [MAIN_TASK_NAME]);
      const instanceRow = await waitForTaskInstanceFinished(page, MAIN_TASK_NAME, 600000);
      const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
      const ruleCard = getTaskDetailRuleCard(detailDrawer, KEY_RANGE_RULE_NAME);
      await expect(ruleCard).toBeVisible({ timeout: 10000 });
      await expect(detailDrawer).toContainText(/校验未通过|校验不通过/);
      await expect(ruleCard).toContainText("完整性校验");
      await expect(ruleCard).toContainText(KEY_RANGE_RULE_NAME);
      await expect(ruleCard).toContainText("包含");
      await expect(ruleCard).toContainText("key1-key2");

      const dataDrawer = await openTaskRuleDetailDataDrawer(page, detailDrawer);
      await expectDetailTitle(page, `完整性校验-${KEY_RANGE_RULE_NAME}`);
      await assertOnlyTheseDetailRows(dataDrawer, [2, 3]);
      await expect(dataDrawer).not.toContainText(/\b1\b/);
      await expect(dataDrawer).toContainText('{"key1":"李四"}');
      await expect(dataDrawer).toContainText('{"key2":30,"key11":"北京","key22":"朝阳"}');
      await expectHighlightedColumn(dataDrawer, "info");
    });
  });
}
