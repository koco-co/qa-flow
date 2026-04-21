import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { applyRuntimeCookies, buildDataAssetsUrl, navigateViaMenu, selectAntOption } from "../../helpers";
import { enableCompatibleMonitorDatasourceRouting } from "../有效性-取值范围枚举范围规则/rule-editor-helpers";
import {
  executeTaskFromList,
  getQualityReportRuleRow,
  getTableRowByTaskName,
  getTaskDetailRuleCard,
  gotoQualityReport,
  gotoRuleTaskList,
  gotoValidationResults,
  openQualityReportDetail,
  openQualityReportRuleDetail,
  openTaskRuleDetailDataDrawer,
  waitForQualityReportRow,
  waitForTaskInstanceFinished,
} from "../有效性-取值范围枚举范围规则/rule-task-helpers";
import {
  injectProjectContext,
  getCurrentDatasource,
  resolveEffectiveQualityProjectId,
  resolveVariantName,
} from "./test-data";
import {
  FAIL_LOG_TASK_NAME,
  MAIN_TASK_NAME,
  METHOD_SWITCH_TASK_NAME,
  NOT_INCLUDE_TASK_NAME,
  PASS_TASK_NAME,
  removeDeletedReferenceKey,
  SCENARIOS,
  seedScenarioRuleSet,
} from "./suite-helpers";

export const SPARK_COMPAT_TASK_NAME = "task_spark_test";

type TaskScenario = {
  readonly taskName: string;
  readonly tableName: string;
  readonly packageName: string;
  readonly ruleSetScenario: (typeof SCENARIOS)[keyof typeof SCENARIOS];
  readonly afterCreate?: (page: Page) => Promise<void>;
};

type MonitorListRow = {
  id?: number | string;
  ruleName?: string;
  monitorName?: string;
  name?: string;
};

const TASK_SCENARIOS: Record<string, TaskScenario> = {
  [MAIN_TASK_NAME]: {
    taskName: MAIN_TASK_NAME,
    tableName: SCENARIOS.main.tableName,
    packageName: SCENARIOS.main.packageName,
    ruleSetScenario: SCENARIOS.main,
  },
  [PASS_TASK_NAME]: {
    taskName: PASS_TASK_NAME,
    tableName: SCENARIOS.pass.tableName,
    packageName: SCENARIOS.pass.packageName,
    ruleSetScenario: SCENARIOS.pass,
  },
  [METHOD_SWITCH_TASK_NAME]: {
    taskName: METHOD_SWITCH_TASK_NAME,
    tableName: SCENARIOS.methodSwitch.tableName,
    packageName: SCENARIOS.methodSwitch.packageName,
    ruleSetScenario: SCENARIOS.methodSwitch,
  },
  [NOT_INCLUDE_TASK_NAME]: {
    taskName: NOT_INCLUDE_TASK_NAME,
    tableName: SCENARIOS.notInclude.tableName,
    packageName: SCENARIOS.notInclude.packageName,
    ruleSetScenario: SCENARIOS.notInclude,
  },
  [FAIL_LOG_TASK_NAME]: {
    taskName: FAIL_LOG_TASK_NAME,
    tableName: SCENARIOS.failLog.tableName,
    packageName: SCENARIOS.failLog.packageName,
    ruleSetScenario: SCENARIOS.failLog,
    afterCreate: async (page) => {
      await removeDeletedReferenceKey(page);
    },
  },
  [SPARK_COMPAT_TASK_NAME]: {
    taskName: SPARK_COMPAT_TASK_NAME,
    tableName: SCENARIOS.main.tableName,
    packageName: "spark兼容性测试包",
    ruleSetScenario: {
      ...SCENARIOS.main,
      packageName: "spark兼容性测试包",
    },
  },
};

const preparedTasks = new Set<string>();
const executedTasks = new Set<string>();
const readyReports = new Set<string>();

function resolveTaskName(taskName: string): string {
  return resolveVariantName(taskName);
}

function getReportName(taskName: string): string {
  return `${resolveTaskName(taskName)}_report`;
}

async function postTaskApi<T>(page: Page, path: string, body: unknown): Promise<T> {
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  const requestUrl = /^https?:\/\//.test(path)
    ? path
    : new URL(path.startsWith("/") ? path : `/${path}`, new URL(buildDataAssetsUrl("/", effectiveProjectId)).origin).toString();
  const response = await page.evaluate(
    async ({ url, payload, projectId }) => {
      const result = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "Accept-Language": "zh-CN",
          "X-Valid-Project-ID": String(projectId),
        },
        body: JSON.stringify(payload),
      });
      return {
        ok: result.ok,
        text: await result.text(),
        status: result.status,
        statusText: result.statusText,
      };
    },
    {
      url: requestUrl,
      payload: body,
      projectId: effectiveProjectId,
    },
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${response.text.slice(0, 200)}`);
  }
  return JSON.parse(response.text) as T;
}

async function openQualityRoute(page: Page, path: string): Promise<void> {
  await applyRuntimeCookies(page);
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  const targetUrl = buildDataAssetsUrl(path, effectiveProjectId);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" }).catch(() => undefined);
  await page.locator("body").waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
  await injectProjectContext(page, effectiveProjectId);
  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
}

async function gotoRuleTaskCreate(page: Page): Promise<void> {
  await enableCompatibleMonitorDatasourceRouting(page);
  await openQualityRoute(page, "/dq/rule/add");
}

async function listTaskRows(page: Page): Promise<MonitorListRow[]> {
  const payload = (await postTaskApi<{
    data?: { data?: MonitorListRow[]; contentList?: MonitorListRow[]; list?: MonitorListRow[] };
  }>(page, "/dassets/v1/valid/monitor/pageQuery", {
    pageIndex: 1,
    pageSize: 200,
  })) ?? {};
  return payload.data?.data ?? payload.data?.contentList ?? payload.data?.list ?? [];
}

async function deleteTasksByNames(page: Page, taskNames: readonly string[]): Promise<void> {
  const actualNames = taskNames.map(resolveTaskName);
  const rows = await listTaskRows(page);
  for (const row of rows) {
    const rowName = String(row.ruleName ?? row.monitorName ?? row.name ?? "");
    if (!actualNames.includes(rowName) || row.id === undefined || row.id === null) {
      continue;
    }
    await postTaskApi(page, "/dassets/v1/valid/monitor/delete", { monitorId: Number(row.id) });
  }
}

async function fillTaskBaseInfo(page: Page, scenario: TaskScenario): Promise<void> {
  const datasource = getCurrentDatasource();
  const ruleNameInput = page.locator(".ant-form-item").filter({ hasText: /^规则名称/ }).locator("input").first();
  await ruleNameInput.fill(resolveTaskName(scenario.taskName));

  const sourceFormItem = page.locator(".ant-form-item").filter({ hasText: /选择数据源/ }).first();
  await selectAntOption(page, sourceFormItem.locator(".ant-select").first(), datasource.optionPattern);

  const schemaFormItem = page.locator(".ant-form-item").filter({ hasText: /选择数据库/ }).first();
  await selectAntOption(page, schemaFormItem.locator(".ant-select").first(), datasource.database);
  await page.waitForTimeout(1000);

  const tableFormItem = page.locator(".ant-form-item").filter({ hasText: /选择数据表/ }).first();
  await selectAntOption(page, tableFormItem.locator(".ant-select").first(), scenario.tableName);
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: "下一步" }).first().click();
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
}

async function importRulePackage(page: Page, packageName: string): Promise<void> {
  const packageSelect = page.locator(".ant-form-item").filter({ hasText: /规则包/ }).first().locator(".ant-select").first();
  await selectAntOption(page, packageSelect, packageName);

  const ruleTypeSelect = page.locator(".ant-form-item").filter({ hasText: /规则类型/ }).first().locator(".ant-select").first();
  await selectAntOption(page, ruleTypeSelect, /完整性校验|完整性/);
  await page.getByRole("button", { name: /引入/ }).click();
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  await expect(page.locator(".ruleForm").first()).toBeVisible({ timeout: 10000 });
}

async function completeTaskScheduleAndSave(page: Page, taskName: string): Promise<void> {
  const actualTaskName = resolveTaskName(taskName);
  await page.getByRole("button", { name: "下一步" }).last().click();
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(1500);

  const packageCountInput = page.locator(".ant-form-item").filter({ hasText: /规则拼接包/ }).locator("input").first();
  if (await packageCountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await packageCountInput.fill("1");
  }

  const immediateRadio = page.locator(".ant-radio-wrapper, .ant-radio-button-wrapper").filter({ hasText: /立即生成/ }).first();
  if (await immediateRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
    await immediateRadio.click();
  }

  const reportNameInput = page.locator(".ant-form-item").filter({ hasText: /报告名称/ }).locator("input").first();
  if (await reportNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await reportNameInput.fill(`${actualTaskName}_report`);
  }

  const dataCycleInputs = page.locator(".ant-form-item").filter({ hasText: /数据日期|数据周期/ }).locator("input");
  if (await dataCycleInputs.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await dataCycleInputs.nth(0).fill("1");
    if ((await dataCycleInputs.count()) > 1) {
      await dataCycleInputs.nth(1).fill("0");
    }
  }

  const needCarNoRadio = page
    .locator(".ant-form-item")
    .filter({ hasText: /是否需要车辆信息/ })
    .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
    .filter({ hasText: /^否$/ })
    .first();
  if (await needCarNoRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
    await needCarNoRadio.click();
  }

  const createButton = page.getByRole("button", { name: /新\s*建|保\s*存/ }).last();
  await createButton.click();
  const confirmModal = page.locator(".ant-modal:visible, .ant-modal-confirm:visible").last();
  if (await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    const confirmButton = confirmModal.getByRole("button", { name: /确\s*认|确\s*定/ }).first();
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
  }
  await page.waitForURL(/#\/dq\/rule(?:\?|$)/, { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
}

async function createTask(page: Page, taskName: string): Promise<void> {
  const scenario = TASK_SCENARIOS[taskName];
  if (!scenario) {
    throw new Error(`Unsupported task scenario: ${taskName}`);
  }
  await seedScenarioRuleSet(page, scenario.ruleSetScenario);
  await gotoRuleTaskList(page);
  await deleteTasksByNames(page, [taskName]);
  await gotoRuleTaskCreate(page);
  await fillTaskBaseInfo(page, scenario);
  await importRulePackage(page, scenario.packageName);
  await completeTaskScheduleAndSave(page, taskName);
  if (scenario.afterCreate) {
    await scenario.afterCreate(page);
  }
}

export async function ensureRuleTasks(page: Page, taskNames: readonly string[]): Promise<void> {
  for (const taskName of taskNames) {
    const actualTaskName = resolveTaskName(taskName);
    if (preparedTasks.has(actualTaskName)) {
      continue;
    }
    await createTask(page, taskName);
    preparedTasks.add(actualTaskName);
    executedTasks.delete(actualTaskName);
    readyReports.delete(actualTaskName);
  }
}

export async function ensureExecutedRuleTasks(page: Page, taskNames: readonly string[]): Promise<void> {
  await ensureRuleTasks(page, taskNames);
  for (const taskName of taskNames) {
    const actualTaskName = resolveTaskName(taskName);
    if (executedTasks.has(actualTaskName)) {
      continue;
    }
    await executeTaskFromList(page, taskName);
    await waitForTaskInstanceFinished(page, taskName, 600000);
    executedTasks.add(actualTaskName);
  }
}

export async function ensureQualityReportsReady(page: Page, taskNames: readonly string[]): Promise<void> {
  await ensureExecutedRuleTasks(page, taskNames);
  for (const taskName of taskNames) {
    const actualTaskName = resolveTaskName(taskName);
    if (readyReports.has(actualTaskName)) {
      continue;
    }
    await waitForQualityReportRow(page, taskName, 600000);
    readyReports.add(actualTaskName);
  }
}

export async function openTaskInstanceDetail(page: Page, instanceRow: Locator): Promise<Locator> {
  const detailResponsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes("/monitorRecord/detailReport") && response.request().method() === "POST",
      { timeout: 15000 },
    )
    .catch(() => null);

  await instanceRow.getByRole("button").first().click();
  await detailResponsePromise;
  const detailDrawer = page.locator(".dtc-drawer:visible, .ant-drawer:visible").last();
  await expect(detailDrawer).toBeVisible({ timeout: 10000 });
  return detailDrawer;
}

export async function openTaskLogDrawer(page: Page, instanceRow: Locator): Promise<Locator> {
  const logButton = instanceRow.getByRole("button", { name: /查看日志|日志/ }).first();
  await expect(logButton).toBeVisible({ timeout: 10000 });
  await logButton.click();
  const drawer = page.locator(".ant-drawer:visible, .dtc-drawer:visible, .ant-modal:visible").last();
  await expect(drawer).toBeVisible({ timeout: 10000 });
  return drawer;
}

export async function gotoTaskListAndLocate(taskName: string, page: Page): Promise<Locator> {
  await gotoRuleTaskList(page);
  const row = getTableRowByTaskName(page, taskName);
  await expect(row).toBeVisible({ timeout: 10000 });
  return row;
}

export async function gotoValidationAndLocate(taskName: string, page: Page): Promise<Locator> {
  await gotoValidationResults(page);
  const row = getTableRowByTaskName(page, taskName);
  await expect(row).toBeVisible({ timeout: 10000 });
  return row;
}

export async function gotoQualityAndLocate(taskName: string, page: Page): Promise<Locator> {
  await gotoQualityReport(page);
  const row = getTableRowByTaskName(page, getReportName(taskName));
  await expect(row).toBeVisible({ timeout: 10000 });
  return row;
}

export {
  executeTaskFromList,
  getQualityReportRuleRow,
  getReportName,
  getTableRowByTaskName,
  getTaskDetailRuleCard,
  gotoQualityReport,
  gotoRuleTaskList,
  gotoValidationResults,
  openQualityReportDetail,
  openQualityReportRuleDetail,
  openTaskRuleDetailDataDrawer,
  waitForQualityReportRow,
  waitForTaskInstanceFinished,
};
