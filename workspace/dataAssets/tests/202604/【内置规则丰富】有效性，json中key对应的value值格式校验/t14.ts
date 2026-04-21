// META: {"id":"t14","priority":"P0","title":"【P0】验证格式-json格式校验完整主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看通过实例"}
import { expect, test } from "../../fixtures/step-screenshot";
import {
  ensureExecutedJsonTask,
  getTaskDetailRuleCard,
  openTaskInstanceDetail,
  waitForVisibleTaskRow,
} from "./json-format-task-helpers";
import { describeByDatasource } from "./suite-case-helpers";
import { P0_PASS_SCENARIO } from "./test-data";

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
});
test.setTimeout(600000);

describeByDatasource("校验结果查询", () => {
  test("验证格式-json格式校验完整主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看通过实例", async ({
    page,
  }) => {
    await ensureExecutedJsonTask(page, P0_PASS_SCENARIO);
    const instanceRow = await waitForVisibleTaskRow(
      page,
      P0_PASS_SCENARIO.taskName,
    );
    await expect(instanceRow).toContainText(/校验通过/);

    const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
    const ruleCard = getTaskDetailRuleCard(detailDrawer, "格式-json格式校验");

    await expect(ruleCard).toBeVisible({ timeout: 10000 });
    await expect(ruleCard).toContainText("有效性校验");
    await expect(ruleCard).toContainText("格式-json格式校验");
    await expect(ruleCard).toContainText("person-name");
    await expect(ruleCard).toContainText("person-age");
    await expect(detailDrawer).toContainText(/校验通过/);
    await expect(
      detailDrawer.getByRole("button", { name: "查看明细" }),
    ).toHaveCount(0);
  });
});
