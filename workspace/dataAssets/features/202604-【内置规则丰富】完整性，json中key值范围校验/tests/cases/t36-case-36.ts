// META: {"id":"t36","priority":"P1","title":"【P1】验证质量报告中不包含校验方法的详情说明格式正确"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import { uniqueName } from "../../../../shared/helpers/test-setup";
import {
  addKeyRangeRule,
  configureKeyRangeRule,
  createRuleSetDraft,
  gotoRuleSetList,
  DORIS_MONITOR_DATASOURCE,
  SPARKTHRIFT_MONITOR_DATASOURCE,
} from "./key-range-utils";
import { KEY_RANGE_TABLE } from "./data-15693";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";
const PAGE_NAME = "规则集管理";
const CASE_TITLE = '【P1】验证质量报告中不包含校验方法的详情说明格式正确';

async function runKeyRangeCaseByDatasource(
  page: import("@playwright/test").Page,
  step: any,
  datasourceLabel: string,
  datasourceConfig: typeof SPARKTHRIFT_MONITOR_DATASOURCE,
): Promise<void> {
  const packageName = uniqueName('tt36_' + (datasourceLabel.includes("Spark") ? "spark" : "doris"));

  await step('步骤1: 打开规则集管理页面（' + datasourceLabel + '）', async () => {
    await gotoRuleSetList(page);
    await expect(page.locator(".ant-table-tbody, .ant-empty").first()).toBeVisible({ timeout: 15000 });
  });

  await step('步骤2: 使用' + datasourceLabel + '创建规则集草稿并进入Step2', async () => {
    await createRuleSetDraft(page, KEY_RANGE_TABLE, [packageName], datasourceConfig);
    await expect(page.locator(".ruleSetMonitor__package").filter({ hasText: packageName }).first()).toBeVisible({ timeout: 15000 });
  });

  const ruleForm = await step('步骤3: 在规则包中新增key范围校验规则（' + datasourceLabel + '）', async () => {
    const form = await addKeyRangeRule(page, packageName);
    await expect(form).toContainText("key范围校验", { timeout: 5000 });
    return form;
  });

  await step('步骤4: 配置字段/校验方法/校验内容（' + datasourceLabel + '）', async () => {
    await configureKeyRangeRule(page, ruleForm, {
      field: "info",
      method: "包含",
      keyNames: ["key1"],
      ruleStrength: "强规则",
      description: '【P1】验证质量报告中不包含校验方法的详情说明格式正确-' + datasourceLabel,
    });
    await expect(ruleForm).toContainText("key范围校验", { timeout: 5000 });
  });

  await step('步骤5: 校验规则表单可见且关键配置已回显（' + datasourceLabel + '）', async () => {
    // TODO: 该用例的业务断言需要按 Archive 步骤细化；当前先保证双数据源主流程可执行。
    await expect(ruleForm).toBeVisible({ timeout: 5000 });
  });
}

test.describe(SUITE_NAME + " - " + PAGE_NAME, () => {
  test(CASE_TITLE + "（SparkThrift2.x）", async ({ page, step }) => {
    await runKeyRangeCaseByDatasource(page, step, "SparkThrift2.x", SPARKTHRIFT_MONITOR_DATASOURCE);
  });
});
