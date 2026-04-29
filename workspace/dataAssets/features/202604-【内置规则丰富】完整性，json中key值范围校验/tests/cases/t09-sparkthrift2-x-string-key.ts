// META: {"id":"t9","priority":"P1","title":"验证SparkThrift2.x数据源的string字段支持key范围校验"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "../data/test-data";
import { SPARK_COMPAT_TASK_NAME, ensureExecutedRuleTasks, openQualityReportDetail, getQualityReportRuleRow } from "../helpers/task-helpers";
import { KEY_RANGE_RULE_NAME } from "../helpers/suite-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 多数据源兼容性"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证SparkThrift2.x数据源的string字段支持key范围校验", async ({ page }) => {
      test.skip(datasource.id !== "sparkthrift2.x", "SparkThrift-only case");
      await ensureExecutedRuleTasks(page, [SPARK_COMPAT_TASK_NAME]);
      const detail = await openQualityReportDetail(page, SPARK_COMPAT_TASK_NAME);
      const ruleRow = getQualityReportRuleRow(page, KEY_RANGE_RULE_NAME);
      await expect(detail).toContainText(KEY_RANGE_RULE_NAME);
      await expect(ruleRow).toContainText(/校验通过|校验不通过/);
    });
  });
}
