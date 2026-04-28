// META: {"id":"t29","priority":"P1","title":"【P1】验证质量报告中「格式-json格式校验」规则行各列字段展示正确（校验不通过场景）"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import {
  getQualityReportRuleRow,
  openPreparedQualityReport,
  openQualityReportRuleDetail,
} from "../helpers/json-format-task-helpers";
import { describeByDatasource } from "./suite-case-helpers";
import { REPORT_FAIL_SCENARIO } from "../data/test-data";

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
});
test.setTimeout(600000);

describeByDatasource("数据质量报告", () => {
  test("验证质量报告中「格式-json格式校验」规则行各列字段展示正确（校验不通过场景）", async ({
    page,
  }) => {
    const detail = await openPreparedQualityReport(page, REPORT_FAIL_SCENARIO);
    const ruleRow = getQualityReportRuleRow(page, "格式-json格式校验");
    const detailAction = ruleRow
      .locator("button, a")
      .filter({ hasText: "查看详情" })
      .first();

    await expect(detail).toBeVisible({ timeout: 10000 });
    await expect(ruleRow).toBeVisible({ timeout: 10000 });
    await expect(ruleRow).toContainText("有效性校验");
    await expect(ruleRow).toContainText("格式-json格式校验");
    await expect(ruleRow).toContainText(/校验不通过|校验未通过/);
    await expect(ruleRow).toContainText(
      /key对应value格式校验未通过|value格式校验未通过/,
    );
    await expect(ruleRow).toContainText(
      /log-level.*log-code|log-level;log-code/,
    );
    await expect(detailAction).toBeVisible({ timeout: 5000 });

    const dataDrawer = await openQualityReportRuleDetail(page, ruleRow);
    await expect(
      dataDrawer.getByRole("button", { name: "下载明细" }),
    ).toBeVisible({ timeout: 5000 });
  });
});
