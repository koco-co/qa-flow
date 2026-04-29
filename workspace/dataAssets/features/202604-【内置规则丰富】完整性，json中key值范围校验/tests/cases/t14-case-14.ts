// META: {"id":"t14","priority":"P1","title":"验证质量报告中不包含校验方法的详情说明格式正确"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "../data/test-data";
import { NOT_INCLUDE_TASK_NAME, ensureQualityReportsReady, getQualityReportRuleRow, openQualityReportDetail } from "../helpers/task-helpers";
import { KEY_RANGE_RULE_NAME } from "../helpers/suite-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 数据质量报告"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证质量报告中不包含校验方法的详情说明格式正确", async ({ page }) => {
      await ensureQualityReportsReady(page, [NOT_INCLUDE_TASK_NAME]);
      const detail = await openQualityReportDetail(page, NOT_INCLUDE_TASK_NAME);
      const row = getQualityReportRuleRow(page, KEY_RANGE_RULE_NAME);
      await expect(detail).toContainText(KEY_RANGE_RULE_NAME);
      await expect(row).toContainText(/不包含/);
      await expect(row).toContainText(/符合规则key范围不包含|不符合规则key范围不包含/);
      const rowText = await row.innerText();
      expect(rowText).not.toContain("枚举值");
    });
  });
}
