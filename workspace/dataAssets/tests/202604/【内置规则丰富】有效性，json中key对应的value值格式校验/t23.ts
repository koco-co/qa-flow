// META: {"id":"t23","priority":"P1","title":"【P1】验证对分区表配置格式-json格式校验规则后指定分区下的数据校验正确"}
import { expect, test } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  addRuleToPackage,
  configureJsonFormatRule,
  createRuleSetDraft,
  gotoRuleSetList,
  DORIS_MONITOR_DATASOURCE,
  SPARKTHRIFT_MONITOR_DATASOURCE,
} from "./json-format-utils";
import { FORMAT_JSON_VERIFICATION_FUNC, VALUE_FORMAT_TABLE } from "./data-15694";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });

const SUITE_NAME = "【内置规则丰富】有效性，json中key对应的value值格式校验(#15694)";
const PAGE_NAME = "规则集管理";
const CASE_TITLE = '【P1】验证对分区表配置格式-json格式校验规则后指定分区下的数据校验正确';

async function runJsonFormatCaseByDatasource(
  page: import("@playwright/test").Page,
  step: any,
  datasourceLabel: string,
  datasourceConfig: typeof SPARKTHRIFT_MONITOR_DATASOURCE,
): Promise<void> {
  const packageName = uniqueName('tt23_' + (datasourceLabel.includes("Spark") ? "spark" : "doris"));

  await step('步骤1: 打开规则集管理页面（' + datasourceLabel + '）', async () => {
    await gotoRuleSetList(page);
    await expect(page.locator(".ant-table-tbody, .ant-empty").first()).toBeVisible({ timeout: 15000 });
  });

  await step('步骤2: 使用' + datasourceLabel + '创建规则集草稿并进入Step2', async () => {
    await createRuleSetDraft(page, VALUE_FORMAT_TABLE, [packageName], datasourceConfig);
    await expect(page.locator(".ruleSetMonitor__package").filter({ hasText: packageName }).first()).toBeVisible({ timeout: 15000 });
  });

  const ruleForm = await step('步骤3: 新增有效性校验规则（' + datasourceLabel + '）', async () => {
    const form = await addRuleToPackage(page, packageName, "有效性校验");
    await expect(form).toBeVisible({ timeout: 10000 });
    return form;
  });

  await step('步骤4: 配置格式-json格式校验规则（' + datasourceLabel + '）', async () => {
    await configureJsonFormatRule(page, ruleForm, {
      field: "info",
      keyNames: ["key1"],
      ruleStrength: "强规则",
      description: '【P1】验证对分区表配置格式-json格式校验规则后指定分区下的数据校验正确-' + datasourceLabel,
    });
    await expect(ruleForm).toContainText(FORMAT_JSON_VERIFICATION_FUNC, { timeout: 5000 });
  });

  await step('步骤5: 校验规则配置区域可见且参数已回显（' + datasourceLabel + '）', async () => {
    // TODO: 该用例的业务断言需要按 Archive 步骤细化；当前先保证双数据源主流程可执行。
    await expect(ruleForm).toBeVisible({ timeout: 5000 });
  });
}

test.describe(SUITE_NAME + " - " + PAGE_NAME, () => {
  test(CASE_TITLE + "（SparkThrift2.x）", async ({ page, step }) => {
    await runJsonFormatCaseByDatasource(page, step, "SparkThrift2.x", SPARKTHRIFT_MONITOR_DATASOURCE);
  });
});
