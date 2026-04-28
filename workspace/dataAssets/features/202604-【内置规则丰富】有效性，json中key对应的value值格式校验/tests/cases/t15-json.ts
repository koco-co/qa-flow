// META: {"id":"t15","priority":"P0","title":"【P0】验证格式-json格式校验校验不通过主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看失败明细"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import {
  ensureExecutedJsonTask,
  getTaskDetailRuleCard,
  openTaskInstanceDetail,
  openTaskRuleDetailDataDrawer,
  waitForVisibleTaskRow,
} from "../helpers/json-format-task-helpers";
import { describeByDatasource } from "./suite-case-helpers";
import { P0_FAIL_SCENARIO } from "../data/test-data";
import { buildValidationKeyLabelPattern } from "./validation-key-label";
import { isFailLikeValidationStatus } from "./validation-result-status";

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
});
test.setTimeout(600000);

describeByDatasource("校验结果查询", () => {
  test("验证格式-json格式校验校验不通过主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看失败明细", async ({
    page,
  }) => {
    await ensureExecutedJsonTask(page, P0_FAIL_SCENARIO);
    const instanceRow = await waitForVisibleTaskRow(
      page,
      P0_FAIL_SCENARIO.taskName,
    );
    expect(
      isFailLikeValidationStatus(await instanceRow.innerText()),
      "expected validation result row to show a fail-like status",
    ).toBe(true);

    const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
    const ruleCard = getTaskDetailRuleCard(detailDrawer, "格式-json格式校验");

    await expect(ruleCard).toBeVisible({ timeout: 10000 });
    await expect(ruleCard).toContainText("有效性校验");
    await expect(ruleCard).toContainText("格式-json格式校验");
    await expect(ruleCard).toContainText(buildValidationKeyLabelPattern("person-name"));
    await expect(ruleCard).toContainText(buildValidationKeyLabelPattern("person-age"));
    await expect(detailDrawer).toContainText(/校验未通过|校验不通过/);

    const dataDrawer = await openTaskRuleDetailDataDrawer(page, detailDrawer);
    await expect(dataDrawer).toContainText('"name":"Tom"', { timeout: 15000 });
    await expect(dataDrawer).toContainText('"age":"1000"', { timeout: 15000 });
    await expect(dataDrawer).not.toContainText('"name":"张三","age":"25"', {
      timeout: 15000,
    });
  });
});
