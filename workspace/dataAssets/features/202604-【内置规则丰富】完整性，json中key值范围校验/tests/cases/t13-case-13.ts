// META: {"id":"t13","priority":"P0","title":"验证质量报告中校验不通过行的各列展示内容正确"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "../data/test-data";
import { MAIN_TASK_NAME, ensureQualityReportsReady, getQualityReportRuleRow, openQualityReportDetail, openQualityReportRuleDetail } from "../helpers/task-helpers";
import { KEY_RANGE_RULE_NAME, getExpectedFieldType } from "../helpers/suite-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 数据质量报告"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证质量报告中校验不通过行的各列展示内容正确", async ({ page }) => {
      await ensureQualityReportsReady(page, [MAIN_TASK_NAME]);
      const detail = await openQualityReportDetail(page, MAIN_TASK_NAME);
      const row = getQualityReportRuleRow(page, KEY_RANGE_RULE_NAME);
      await expect(detail).toContainText(KEY_RANGE_RULE_NAME);
      await expect(row).toContainText("完整性校验");
      await expect(row).toContainText(getExpectedFieldType());
      await expect(row).toContainText(/校验未通过|校验不通过/);
      await expect(row).toContainText(/key范围校验未通过|不符合规则key范围包含/);
      await expect(row).toContainText(/不符合规则key范围包含"key1-key2"|key1-key2/);
      const dataDrawer = await openQualityReportRuleDetail(page, row);
      await expect(dataDrawer.getByRole("button", { name: "下载明细" })).toBeVisible({ timeout: 5000 });
    });
  });
}
