// META: {"id":"t26","priority":"P1","title":"【P1】验证校验通过时不记录明细数据，查看详情入口不显示"}
import { expect, test } from "../../../shared/fixtures/step-screenshot";
import {
  ensureExecutedJsonTask,
  getTaskDetailRuleCard,
  openTaskInstanceDetail,
  waitForVisibleTaskRow,
} from "./json-format-task-helpers";
import { describeByDatasource } from "./suite-case-helpers";
import { REPORT_PASS_SCENARIO } from "./test-data";

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
});
test.setTimeout(600000);

describeByDatasource("校验结果查询", () => {
  test("验证校验通过时不记录明细数据，查看详情入口不显示", async ({ page }) => {
    await ensureExecutedJsonTask(page, REPORT_PASS_SCENARIO);
    const instanceRow = await waitForVisibleTaskRow(
      page,
      REPORT_PASS_SCENARIO.taskName,
    );
    await expect(instanceRow).toContainText(/校验通过/);

    const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
    const ruleCard = getTaskDetailRuleCard(detailDrawer, "格式-json格式校验");

    await expect(ruleCard).toBeVisible({ timeout: 10000 });
    await expect(ruleCard).toContainText(/校验通过/);
    await expect(ruleCard).toContainText("meta-version");
    await expect(ruleCard).toContainText("--");
    await expect(
      ruleCard.getByRole("button", { name: "查看明细" }),
    ).toHaveCount(0);
  });
});
