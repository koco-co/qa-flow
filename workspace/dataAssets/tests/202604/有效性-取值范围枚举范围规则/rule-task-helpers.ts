import { expect, type Locator, type Page } from "@playwright/test";

import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
  navigateViaMenu,
  selectAntOption,
} from "../../helpers/test-setup";
import {
  createRuleSetForTable,
  deleteRuleSetsByTableNames,
  gotoRuleSetList,
  type RangeEnumConfig,
} from "./rule-editor-helpers";
import {
  DORIS_DATABASE,
  DORIS_DATASOURCE_KEYWORD,
  injectProjectContext,
  QUALITY_PROJECT_ID,
  runPreconditions,
} from "./test-data";

const TABLE_ROWS = ".ant-table-tbody tr:not(.ant-table-measure-row)";
const TASK_API_PAGE_SIZE = 200;

const RANGE_AND_RULE: RangeEnumConfig = {
  field: "score",
  range: {
    firstOperator: ">",
    firstValue: "1",
    condition: "且",
    secondOperator: "<",
    secondValue: "10",
  },
  enumOperator: "in",
  enumValues: ["1", "2", "3"],
  relation: "且",
  ruleStrength: "强规则",
  description: "score取值范围1到10且枚举值in 1,2,3",
};

const RANGE_OR_RULE: RangeEnumConfig = {
  field: "score",
  range: {
    firstOperator: ">",
    firstValue: "1",
  },
  enumOperator: "in",
  enumValues: ["-1"],
  relation: "或",
  ruleStrength: "强规则",
  description: "score取值范围>1或枚举值in -1",
};

const RANGE_AND_WEAK_RULE: RangeEnumConfig = {
  ...RANGE_AND_RULE,
  ruleStrength: "弱规则",
  description: "score取值范围1到10且枚举值in 1,2,3（弱规则）",
};

const ENUM_IN_RULE: RangeEnumConfig = {
  field: "category",
  functionName: "枚举值",
  enumOperator: "in",
  enumValues: ["1", "2", "3"],
  ruleStrength: "强规则",
  description: "category枚举值in 1,2,3",
};

const ENUM_NOT_IN_RULE: RangeEnumConfig = {
  field: "category",
  functionName: "枚举值",
  enumOperator: "not in",
  enumValues: ["4", "5"],
  ruleStrength: "强规则",
  description: "category枚举值not in 4,5",
};

type SupportingRuleSetConfig = {
  tableName: string;
  packageName: string;
  ruleConfig: RangeEnumConfig;
};

type TaskSetupConfig = {
  tableName: string;
  packageName: string;
  weakenImportedRule?: boolean;
  supportingRuleSet?: SupportingRuleSetConfig;
};

const TASK_SETUP_CONFIGS: Record<string, TaskSetupConfig> = {
  task_15695_and: {
    tableName: "quality_test_num",
    packageName: "且关系校验包",
    supportingRuleSet: {
      tableName: "quality_test_num",
      packageName: "且关系校验包",
      ruleConfig: RANGE_AND_RULE,
    },
  },
  task_15695_or: {
    tableName: "quality_test_num",
    packageName: "或关系校验包",
    supportingRuleSet: {
      tableName: "quality_test_num",
      packageName: "或关系校验包",
      ruleConfig: RANGE_OR_RULE,
    },
  },
  task_15695_weak: {
    tableName: "quality_test_num",
    packageName: "且关系校验包",
    supportingRuleSet: {
      tableName: "quality_test_num",
      packageName: "且关系校验包",
      ruleConfig: RANGE_AND_WEAK_RULE,
    },
  },
  task_15695_sample: {
    tableName: "quality_test_sample",
    packageName: "且关系校验包",
    supportingRuleSet: {
      tableName: "quality_test_sample",
      packageName: "且关系校验包",
      ruleConfig: RANGE_AND_RULE,
    },
  },
  task_15695_partition: {
    tableName: "quality_test_partition",
    packageName: "且关系校验包",
    supportingRuleSet: {
      tableName: "quality_test_partition",
      packageName: "且关系校验包",
      ruleConfig: RANGE_AND_RULE,
    },
  },
  task_15695_enum_pass: {
    tableName: "quality_test_enum_pass",
    packageName: "仅枚举值包",
    supportingRuleSet: {
      tableName: "quality_test_enum_pass",
      packageName: "仅枚举值包",
      ruleConfig: ENUM_IN_RULE,
    },
  },
  task_15695_enum_fail: {
    tableName: "quality_test_num",
    packageName: "仅枚举值包",
    supportingRuleSet: {
      tableName: "quality_test_num",
      packageName: "仅枚举值包",
      ruleConfig: ENUM_IN_RULE,
    },
  },
  task_15695_enum_notin_fail: {
    tableName: "quality_test_num",
    packageName: "notin校验包",
    supportingRuleSet: {
      tableName: "quality_test_num",
      packageName: "notin校验包",
      ruleConfig: ENUM_NOT_IN_RULE,
    },
  },
};

const preparedTasks = new Set<string>();
const executedTasks = new Set<string>();
const readyQualityReports = new Set<string>();
let baseDataReady = false;

type MonitorListRow = {
  id?: number | string;
  ruleName?: string;
  monitorName?: string;
  name?: string;
};

type ConfigReportMonitor = {
  id?: number | string;
  reportName?: string;
  periodType?: number | string;
  reportType?: number;
  needCar?: number;
  reportShowResultType?: number;
  reportGenerateType?: number;
  ruleTaskTypesList?: number[] | null;
  dataContextStart?: string | number | null;
  dataContextEnd?: string | number | null;
  dispatchConfigDTO?: Record<string, unknown> | null;
  isEnable?: number;
};

type ConfigReportRelationTable = {
  dqTables?: Array<{
    monitorTableId?: number | string;
    tableName?: string;
  }>;
};

type ConfigReportRow = {
  monitorReport?: ConfigReportMonitor;
  reportRelationTables?: ConfigReportRelationTable[];
};

type TaskDetailPayload = {
  monitorReportDetailDTO?: ConfigReportRow;
};

type GeneratedReportRow = {
  id?: number | string;
  reportName?: string;
  status?: number;
};

const GENERATED_REPORT_STATUS_SUCCESS = 2;
const GENERATED_REPORT_STATUS_FAILED = 3;
const GENERATED_REPORT_STATUS_KEEP_RUNNING = 4;

async function postTaskApi<T>(page: Page, path: string, body: unknown): Promise<T> {
  return page.evaluate(
    async ({ requestPath, requestBody, projectId }) => {
      const response = await fetch(requestPath, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "Accept-Language": "zh-CN",
          "X-Valid-Project-ID": String(projectId),
        },
        body: JSON.stringify(requestBody),
      });
      return response.json();
    },
    {
      requestPath: path,
      requestBody: body,
      projectId: QUALITY_PROJECT_ID,
    },
  ) as Promise<T>;
}

async function postQualityReportApi<T>(page: Page, path: string, body: unknown): Promise<T> {
  return page.evaluate(
    async ({ requestPath, requestBody, projectId }) => {
      const response = await fetch(requestPath, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "Accept-Language": "zh-CN",
          "X-Valid-Project-ID": String(projectId),
        },
        body: JSON.stringify(requestBody),
      });
      return response.json();
    },
    {
      requestPath: path,
      requestBody: body,
      projectId: QUALITY_PROJECT_ID,
    },
  ) as Promise<T>;
}

function extractMonitorRows(payload: {
  data?: { data?: MonitorListRow[]; contentList?: MonitorListRow[]; list?: MonitorListRow[] };
}): MonitorListRow[] {
  return payload.data?.data ?? payload.data?.contentList ?? payload.data?.list ?? [];
}

function getMonitorName(row: MonitorListRow): string {
  return String(row.ruleName ?? row.monitorName ?? row.name ?? "");
}

function getMonitorId(row: MonitorListRow): number | null {
  const id = Number(row.id);
  return Number.isFinite(id) ? id : null;
}

function getReportName(taskName: string): string {
  return `${taskName}_report`;
}

export function getTableRowByTaskName(page: Page, taskName: string): Locator {
  return page.locator(TABLE_ROWS).filter({ hasText: taskName }).first();
}

async function openQualityRoute(page: Page, path: string): Promise<void> {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl(path, QUALITY_PROJECT_ID), { waitUntil: "domcontentloaded" });
  await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(500);
  await injectProjectContext(page, QUALITY_PROJECT_ID);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(1000);
}

export async function gotoRuleTaskList(page: Page): Promise<void> {
  await openQualityRoute(page, "/dq/rule");
}

async function gotoRuleTaskCreate(page: Page): Promise<void> {
  await openQualityRoute(page, "/dq/rule/add");
}

export async function gotoValidationResults(page: Page): Promise<void> {
  await openQualityRoute(page, "/dq/overview");
  await navigateViaMenu(page, ["数据质量", "校验结果查询"]);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}

export async function gotoQualityReport(page: Page): Promise<void> {
  await openQualityRoute(page, "/dq/qualityReport?tab=REPORT_GENERATE");
  const generatedTab = page.getByRole("tab", { name: "已生成报告" }).first();
  if (await generatedTab.isVisible().catch(() => false)) {
    await generatedTab.click();
  }
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}

async function ensureBaseData(page: Page): Promise<void> {
  if (baseDataReady) {
    return;
  }
  await runPreconditions(page);
  baseDataReady = true;
}

async function ensureSupportingRuleSet(
  page: Page,
  config: SupportingRuleSetConfig | undefined,
): Promise<void> {
  if (!config) {
    return;
  }
  await gotoRuleSetList(page);
  await deleteRuleSetsByTableNames(page, [config.tableName]);
  await createRuleSetForTable(
    page,
    config.tableName,
    config.packageName,
    config.ruleConfig,
    "有效性校验",
  );
}

async function deleteTasksByNames(page: Page, taskNames: string[]): Promise<void> {
  if (taskNames.length === 0) {
    return;
  }

  const listResponse =
    (await postTaskApi<{
      data?: { data?: MonitorListRow[]; contentList?: MonitorListRow[]; list?: MonitorListRow[] };
    }>(page, "/dassets/v1/valid/monitor/pageQuery", {
      pageIndex: 1,
      pageSize: TASK_API_PAGE_SIZE,
    })) ?? {};

  const rows = extractMonitorRows(listResponse).filter((row) =>
    taskNames.includes(getMonitorName(row)),
  );

  for (const row of rows) {
    const monitorId = getMonitorId(row);
    if (monitorId === null) {
      continue;
    }
    await postTaskApi(page, "/dassets/v1/valid/monitor/delete", {
      monitorId,
    });
  }
}

async function fillTaskBaseInfo(page: Page, taskName: string, config: TaskSetupConfig): Promise<void> {
  const ruleNameInput = page
    .locator(".ant-form-item")
    .filter({ hasText: /^规则名称/ })
    .locator("input")
    .first();
  await ruleNameInput.waitFor({ state: "visible", timeout: 10000 });
  await ruleNameInput.fill(taskName);

  const sourceFormItem = page.locator(".ant-form-item").filter({ hasText: /选择数据源/ }).first();
  await selectAntOption(
    page,
    sourceFormItem.locator(".ant-select").first(),
    new RegExp(DORIS_DATASOURCE_KEYWORD, "i"),
  );

  const schemaFormItem = page.locator(".ant-form-item").filter({ hasText: /选择数据库/ }).first();
  await selectAntOption(page, schemaFormItem.locator(".ant-select").first(), DORIS_DATABASE);
  await page.waitForTimeout(1000);

  const tableFormItem = page.locator(".ant-form-item").filter({ hasText: /选择数据表/ }).first();
  const tableSelect = tableFormItem.locator(".ant-select").first();
  let selectTableError: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await selectAntOption(page, tableSelect, config.tableName);
      selectTableError = null;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Ant Select option not found")) {
        throw error;
      }
      selectTableError = error instanceof Error ? error : new Error(message);
      await page.waitForTimeout(1000 * (attempt + 1));
    }
  }
  if (selectTableError) {
    throw selectTableError;
  }
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: "下一步" }).first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  await expect(
    page.locator(".ant-form-item").filter({ hasText: /规则包/ }).first(),
  ).toBeVisible({ timeout: 10000 });
}

async function importRulePackage(page: Page, packageName: string): Promise<void> {
  const packageSelect = page
    .locator(".ant-form-item")
    .filter({ hasText: /规则包/ })
    .first()
    .locator(".ant-select")
    .first();
  await packageSelect.locator(".ant-select-selector").click();
  await page.waitForTimeout(500);

  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await dropdown.waitFor({ state: "visible", timeout: 10000 });

  const packageOption = dropdown
    .locator(".ant-select-item-option")
    .filter({ hasText: packageName })
    .first();
  if (!(await packageOption.isVisible({ timeout: 2000 }).catch(() => false))) {
    const options = await dropdown
      .locator(".ant-select-item-option")
      .allTextContents()
      .then((items) => items.map((item) => item.trim()).filter(Boolean));
    throw new Error(`Task package "${packageName}" not found. Available: ${options.join(" | ")}`);
  }
  await packageOption.click();
  await page.waitForTimeout(1000);

  const ruleTypeSelect = page
    .locator(".ant-form-item")
    .filter({ hasText: /规则类型/ })
    .first()
    .locator(".ant-select")
    .first();
  await expect(ruleTypeSelect).not.toHaveAttribute("aria-disabled", "true", {
    timeout: 10000,
  });
  await ruleTypeSelect.locator(".ant-select-selector").click();
  await page.waitForTimeout(500);
  await page
    .locator(".ant-select-dropdown:visible .ant-select-item-option")
    .filter({ hasText: /有效性校验|有效性/ })
    .first()
    .click();
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: "引入" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  await expect(page.locator(".ruleForm").first()).toBeVisible({ timeout: 10000 });
}

async function weakenImportedRule(page: Page): Promise<void> {
  const ruleForm = page.locator(".ruleForm").first();
  await expect(ruleForm).toBeVisible({ timeout: 10000 });

  const strengthSelect = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /强弱规则/ })
    .locator(".ant-select")
    .first();
  await selectAntOption(page, strengthSelect, "弱规则");
  await page.waitForTimeout(300);
}

async function completeTaskScheduleAndSave(page: Page, taskName: string): Promise<void> {
  await page.getByRole("button", { name: "下一步" }).last().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  const packageCountInput = page
    .locator(".ant-form-item")
    .filter({ hasText: /规则拼接包/ })
    .locator("input")
    .first();
  await packageCountInput.waitFor({ state: "visible", timeout: 10000 });
  await packageCountInput.fill("1");

  const immediateRadio = page
    .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
    .filter({ hasText: /立即生成/ })
    .first();
  if (await immediateRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
    await immediateRadio.click();
    await page.waitForTimeout(300);
  }

  const reportNameInput = page
    .locator(".ant-form-item")
    .filter({ hasText: /报告名称/ })
    .locator("input")
    .first();
  if (await reportNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await reportNameInput.fill(`${taskName}_report`);
  }

  const dataCycleInputs = page
    .locator(".ant-form-item")
    .filter({ hasText: /数据周期/ })
    .locator("input");
  if (await dataCycleInputs.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await dataCycleInputs.nth(0).fill("1");
    await dataCycleInputs.nth(1).fill("0");
  }

  const saveResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/valid/monitor/add") ||
      response.url().includes("/dassets/v1/valid/monitor/edit"),
  );
  const createButton = page.getByRole("button", { name: /新\s*建|保\s*存/ }).last();
  await createButton.click();
  await page.waitForTimeout(1000);

  const confirmModal = page.locator(".ant-modal:visible, .ant-modal-confirm:visible").last();
  if (await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    const confirmButton = confirmModal
      .getByRole("button", { name: /确\s*认|确\s*定/ })
      .first();
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
  }

  const saveResponse = await saveResponsePromise;
  const saveResult = (await saveResponse.json().catch(() => null)) as { success?: boolean } | null;
  if (!saveResult?.success) {
    throw new Error(`Task save failed via ${saveResponse.url()}`);
  }

  await page.waitForURL(/#\/dq\/rule(?:\?|$)/, { timeout: 15000 });
}

async function createTask(page: Page, taskName: string, config: TaskSetupConfig): Promise<void> {
  await gotoRuleTaskCreate(page);
  await fillTaskBaseInfo(page, taskName, config);
  await importRulePackage(page, config.packageName);

  if (config.weakenImportedRule) {
    await weakenImportedRule(page);
  }

  await completeTaskScheduleAndSave(page, taskName);
  await gotoRuleTaskList(page);
  await expect(getTableRowByTaskName(page, taskName)).toBeVisible({ timeout: 15000 });
}

export async function ensureRuleTasks(page: Page, taskNames: string[]): Promise<void> {
  await ensureBaseData(page);

  for (const taskName of taskNames) {
    if (preparedTasks.has(taskName)) {
      continue;
    }

    const config = TASK_SETUP_CONFIGS[taskName];
    if (!config) {
      throw new Error(`Unsupported task setup: ${taskName}`);
    }

    if (config.supportingRuleSet) {
      await ensureSupportingRuleSet(page, config.supportingRuleSet);
    }

    await gotoRuleTaskList(page);
    await deleteTasksByNames(page, [taskName]);
    await createTask(page, taskName, config);
    preparedTasks.add(taskName);
  }
}

async function getTaskMonitorRow(page: Page, taskName: string): Promise<MonitorListRow> {
  const listResponse =
    (await postTaskApi<{
      data?: { data?: MonitorListRow[]; contentList?: MonitorListRow[]; list?: MonitorListRow[] };
    }>(page, "/dassets/v1/valid/monitor/pageQuery", {
      pageIndex: 1,
      pageSize: TASK_API_PAGE_SIZE,
    })) ?? {};

  const taskRow = extractMonitorRows(listResponse).find((row) => getMonitorName(row) === taskName);
  if (!taskRow) {
    throw new Error(`Task "${taskName}" not found in monitor list`);
  }
  return taskRow;
}

async function getTaskDetail(page: Page, taskName: string): Promise<TaskDetailPayload> {
  const taskRow = await getTaskMonitorRow(page, taskName);
  const monitorId = getMonitorId(taskRow);
  if (monitorId === null) {
    throw new Error(`Task "${taskName}" has invalid monitor id`);
  }

  const response =
    (await postTaskApi<{
      success?: boolean;
      message?: string;
      data?: TaskDetailPayload;
    }>(page, "/dassets/v1/valid/monitor/detail", {
      monitorId,
    })) ?? {};

  if (!response.success || !response.data) {
    throw new Error(`Failed to load task detail for "${taskName}": ${response.message ?? "unknown error"}`);
  }

  return response.data;
}

async function getConfigReportDetail(page: Page, reportId: number): Promise<ConfigReportRow> {
  const response =
    (await postQualityReportApi<{
      success?: boolean;
      message?: string;
      data?: ConfigReportRow;
    }>(page, "/dassets/v1/valid/monitorReport/detail", {
      id: reportId,
    })) ?? {};

  if (!response.success || !response.data) {
    throw new Error(`Failed to load config quality report detail ${reportId}: ${response.message ?? "unknown error"}`);
  }

  return response.data;
}

function hasCompleteReportSchedule(report: ConfigReportMonitor | undefined): boolean {
  return Boolean(
    report?.dispatchConfigDTO &&
      report.dataContextStart !== null &&
      report.dataContextStart !== undefined &&
      report.dataContextEnd !== null &&
      report.dataContextEnd !== undefined,
  );
}

async function getTenantIdFromCookie(page: Page): Promise<number> {
  const tenantId = await page.evaluate(() => {
    const match = document.cookie.match(/(?:^|;\s*)dt_tenant_id=([^;]+)/);
    if (!match) {
      return null;
    }
    const value = Number(decodeURIComponent(match[1]));
    return Number.isFinite(value) ? value : null;
  });

  if (!Number.isFinite(tenantId)) {
    throw new Error("Failed to resolve tenant id from dt_tenant_id cookie");
  }
  return tenantId;
}

async function suppressGuideOverlay(page: Page): Promise<void> {
  const tenantId = await getTenantIdFromCookie(page).catch(() => null);
  await page.evaluate((value) => {
    if (value !== null) {
      window.localStorage?.setItem("DT_ASSETS_GUIDE", String(value));
      window.sessionStorage?.setItem("DT_ASSETS_GUIDE", String(value));
    }
    document.querySelectorAll(".guide-img__container").forEach((element) => {
      (element as HTMLElement).style.pointerEvents = "none";
      (element as HTMLElement).style.display = "none";
    });
  }, tenantId);
}

async function waitForConfigReport(page: Page, taskName: string, timeout = 60000): Promise<ConfigReportRow> {
  const reportName = getReportName(taskName);
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const response =
      (await postQualityReportApi<{
        data?: { contentList?: ConfigReportRow[] };
      }>(page, "/dassets/v1/valid/monitorReport/page", {
        current: 1,
        size: 20,
        reportName: taskName,
      })) ?? {};

    const reportRow = (response.data?.contentList ?? []).find(
      (item) => item.monitorReport?.reportName === reportName,
    );
    if (reportRow) {
      return reportRow;
    }

    await page.waitForTimeout(3000);
  }

  throw new Error(`Config quality report "${reportName}" did not appear within ${timeout}ms`);
}

async function listGeneratedQualityReports(page: Page, taskName: string): Promise<GeneratedReportRow[]> {
  const response =
    (await postQualityReportApi<{
      data?: { contentList?: GeneratedReportRow[] };
    }>(page, "/dassets/v1/valid/monitorReportRecord/pageList", {
      current: 1,
      size: 50,
      search: taskName,
    })) ?? {};

  return (response.data?.contentList ?? []).filter((item) => item.reportName === getReportName(taskName));
}

async function ensureQualityReportConfig(page: Page, taskName: string): Promise<void> {
  const configRow = await waitForConfigReport(page, taskName);
  const monitorReportId = Number(configRow.monitorReport?.id);
  if (!Number.isFinite(monitorReportId)) {
    throw new Error(`Config quality report "${getReportName(taskName)}" has invalid id`);
  }

  if (hasCompleteReportSchedule(configRow.monitorReport)) {
    return;
  }

  const taskDetail = await getTaskDetail(page, taskName);
  const taskReport = taskDetail.monitorReportDetailDTO?.monitorReport;
  if (!hasCompleteReportSchedule(taskReport)) {
    throw new Error(`Task "${taskName}" detail is missing report schedule config`);
  }

  const table = (taskDetail.monitorReportDetailDTO?.reportRelationTables ?? configRow.reportRelationTables)
    ?.flatMap((item) => item.dqTables ?? [])
    .find((item) => item.monitorTableId);
  const tableId = table?.monitorTableId ? String(table.monitorTableId) : "";
  if (!tableId) {
    throw new Error(`Config quality report "${getReportName(taskName)}" has no related table id`);
  }

  const taskRow = await getTaskMonitorRow(page, taskName);
  const monitorId = getMonitorId(taskRow);
  if (monitorId === null) {
    throw new Error(`Task "${taskName}" has invalid monitor id`);
  }

  const saveResponse =
    (await postQualityReportApi<{
      success?: boolean;
      message?: string;
    }>(page, "/dassets/v1/valid/monitorReport/save", {
    monitorReport: {
      id: monitorReportId,
      reportName: taskReport?.reportName ?? getReportName(taskName),
      periodType: taskReport?.periodType ?? configRow.monitorReport?.periodType ?? 2,
      reportType: taskReport?.reportType ?? configRow.monitorReport?.reportType ?? 1,
      needCar: taskReport?.needCar ?? configRow.monitorReport?.needCar ?? 1,
      reportShowResultType:
        taskReport?.reportShowResultType ?? configRow.monitorReport?.reportShowResultType ?? 1,
      reportGenerateType:
        taskReport?.reportGenerateType ?? configRow.monitorReport?.reportGenerateType ?? 2,
      ruleTaskTypesList: taskReport?.ruleTaskTypesList ?? [],
      dataContextStart: String(taskReport?.dataContextStart ?? ""),
      dataContextEnd: String(taskReport?.dataContextEnd ?? ""),
      dispatchConfigDTO: taskReport?.dispatchConfigDTO,
      isEnable: taskReport?.isEnable ?? configRow.monitorReport?.isEnable ?? 1,
    },
    dqTables: [tableId],
    dqTableRules: [
      {
        tableId,
        monitorRuleVOS: [
          {
            monitorId,
            ruleName: taskName,
          },
        ],
      },
    ],
    })) ?? {};

  if (!saveResponse.success) {
    throw new Error(
      `Repairing config quality report "${getReportName(taskName)}" failed: ${saveResponse.message ?? "unknown error"}`,
    );
  }

  const repairedConfig = await getConfigReportDetail(page, monitorReportId);
  if (!hasCompleteReportSchedule(repairedConfig.monitorReport)) {
    throw new Error(`Config quality report "${getReportName(taskName)}" still misses schedule config after repair`);
  }
}

async function triggerQualityReportToday(page: Page, taskName: string): Promise<void> {
  const configRow = await waitForConfigReport(page, taskName);
  const reportId = Number(configRow.monitorReport?.id);
  if (!Number.isFinite(reportId)) {
    throw new Error(`Config quality report "${getReportName(taskName)}" has invalid id`);
  }

  const existingRows = await listGeneratedQualityReports(page, taskName);
  const existingIds = existingRows
    .map((item) => Number(item.id))
    .filter((id) => Number.isFinite(id));
  if (existingIds.length > 0) {
    const deleteResponse =
      (await postQualityReportApi<{
        success?: boolean;
        message?: string;
      }>(page, "/dassets/v1/valid/monitorReportRecord/delete", {
        ids: existingIds,
      })) ?? {};

    if (!deleteResponse.success) {
      throw new Error(
        `Deleting old generated quality reports for "${getReportName(taskName)}" failed: ${
          deleteResponse.message ?? "unknown error"
        }`,
      );
    }
  }

  const tenantId = await getTenantIdFromCookie(page);
  const createResponse =
    (await postQualityReportApi<{
      success?: boolean;
      message?: string;
    }>(page, "/dassets/v1/valid/monitorReportRecord/createToday", {
      reportId,
      tenantId,
    })) ?? {};

  if (!createResponse.success) {
    throw new Error(
      `Creating today's quality report for "${getReportName(taskName)}" failed: ${
        createResponse.message ?? "unknown error"
      }`,
    );
  }
}

export async function executeTaskFromList(page: Page, taskName: string): Promise<void> {
  const taskMonitorRow = await getTaskMonitorRow(page, taskName);
  const monitorId = getMonitorId(taskMonitorRow);
  if (monitorId !== null) {
    const executeResponse =
      (await postTaskApi<{
        success?: boolean;
        message?: string;
      }>(page, "/dassets/v1/valid/monitor/immediatelyExecuted", {
        monitorId,
      })) ?? {};

    if (executeResponse.success) {
      await page.waitForTimeout(1000);
      return;
    }
  }

  await gotoRuleTaskList(page);
  const targetRow = getTableRowByTaskName(page, taskName);
  await expect(targetRow).toBeVisible({ timeout: 15000 });

  await targetRow.locator("td").nth(1).locator("a").first().click();
  const detailDrawer = page.locator(".dtc-drawer:visible").last();
  await expect(detailDrawer).toBeVisible({ timeout: 10000 });

  const executeButton = detailDrawer.getByRole("button", { name: "立即执行" }).first();
  await executeButton.click();
  await page.waitForTimeout(1000);

  const successMessage = page.locator(".ant-message-notice, .ant-notification-notice, .ant-message");
  await expect(successMessage.filter({ hasText: /执行|提交|成功/ }).first()).toBeVisible({
    timeout: 10000,
  });
}

export async function openTaskInstanceDetail(page: Page, instanceRow: Locator): Promise<Locator> {
  const detailResponsePromise = page.waitForResponse((response) => {
    return (
      response.url().includes("/monitorRecord/detailReport") &&
      response.request().method() === "POST"
    );
  });

  await instanceRow.getByRole("button").first().click();
  await detailResponsePromise.catch(() => null);

  const detailDrawer = page.locator(".dtc-drawer:visible").last();
  await expect(detailDrawer).toBeVisible({ timeout: 10000 });

  const ruleCard = detailDrawer.locator(".ruleView").filter({ hasText: "取值范围&枚举范围" }).first();
  await expect(ruleCard).toBeVisible({ timeout: 20000 });
  return detailDrawer;
}

export function getTaskDetailRuleCard(drawer: Locator, ruleName: string): Locator {
  return drawer.locator(".ruleView").filter({ hasText: ruleName }).first();
}

export async function openTaskRuleDetailDataDrawer(page: Page, detailDrawer: Locator): Promise<Locator> {
  const viewDetailButton = detailDrawer.getByRole("button", { name: "查看明细" }).first();
  await expect(viewDetailButton).toBeVisible({ timeout: 10000 });
  await viewDetailButton.click();

  const dataDrawer = page.locator(".ant-drawer:visible").last();
  await expect(dataDrawer).toBeVisible({ timeout: 10000 });
  await expect(dataDrawer.getByRole("button", { name: "下载明细" })).toBeVisible({
    timeout: 10000,
  });
  return dataDrawer;
}

export async function waitForTaskInstanceFinished(
  page: Page,
  taskName: string,
  timeout = 180000,
): Promise<Locator> {
  await gotoValidationResults(page);
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const instanceRow = getTableRowByTaskName(page, taskName);
    const visible = await instanceRow.isVisible({ timeout: 2000 }).catch(() => false);
    if (visible) {
      const rowText = (await instanceRow.innerText()).replace(/\s+/g, "");
      if (!rowText.includes("执行中") && !rowText.includes("运行中")) {
        return instanceRow;
      }
    }

    await page.waitForTimeout(5000);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
  }

  throw new Error(`Task instance "${taskName}" did not finish within ${timeout}ms`);
}

export async function executeTaskAndWaitForResult(
  page: Page,
  taskName: string,
  timeout = 180000,
): Promise<Locator> {
  await executeTaskFromList(page, taskName);
  return waitForTaskInstanceFinished(page, taskName, timeout);
}

export async function ensureExecutedRuleTasks(page: Page, taskNames: string[]): Promise<void> {
  await ensureRuleTasks(page, taskNames);

  for (const taskName of taskNames) {
    if (executedTasks.has(taskName)) {
      continue;
    }
    await executeTaskAndWaitForResult(page, taskName);
    executedTasks.add(taskName);
  }
}

export async function waitForQualityReportRow(
  page: Page,
  taskName: string,
  timeout = 180000,
): Promise<Locator> {
  const deadline = Date.now() + timeout;
  const reportName = getReportName(taskName);

  while (Date.now() < deadline) {
    await gotoQualityReport(page);
    const reportRow = getTableRowByTaskName(page, reportName);
    if (await reportRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      return reportRow;
    }

    await page.waitForTimeout(5000);
  }

  throw new Error(`Quality report row "${reportName}" did not appear within ${timeout}ms`);
}

async function waitForGeneratedQualityReport(page: Page, taskName: string, timeout = 300000): Promise<void> {
  const reportName = getReportName(taskName);
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const reportRow = (await listGeneratedQualityReports(page, taskName)).find(
      (item) => item.reportName === reportName,
    );
    if (reportRow) {
      if (reportRow.status === GENERATED_REPORT_STATUS_FAILED) {
        throw new Error(`Generated quality report "${reportName}" failed`);
      }
      if (
        reportRow.status === GENERATED_REPORT_STATUS_SUCCESS ||
        reportRow.status === GENERATED_REPORT_STATUS_KEEP_RUNNING
      ) {
        return;
      }
    }

    await page.waitForTimeout(5000);
  }

  throw new Error(`Generated quality report "${reportName}" did not appear within ${timeout}ms`);
}

export async function ensureQualityReportsReady(page: Page, taskNames: string[]): Promise<void> {
  await ensureRuleTasks(page, taskNames);

  for (const taskName of taskNames) {
    await ensureQualityReportConfig(page, taskName);
    if (!executedTasks.has(taskName)) {
      await executeTaskAndWaitForResult(page, taskName);
      executedTasks.add(taskName);
    }
    if (readyQualityReports.has(taskName)) {
      continue;
    }
    await triggerQualityReportToday(page, taskName);
    await waitForGeneratedQualityReport(page, taskName);
    await waitForQualityReportRow(page, taskName);
    readyQualityReports.add(taskName);
  }
}

export async function openQualityReportDetail(page: Page, taskName: string): Promise<Locator> {
  await gotoQualityReport(page);
  const reportRow = await waitForQualityReportRow(page, taskName);
  const viewReportButton = reportRow
    .getByRole("button", { name: /报告详情|查看报告|查看详情/ })
    .first();
  await expect(viewReportButton).toBeVisible({ timeout: 10000 });
  await viewReportButton.click();
  await page.waitForURL(/#\/dq\/qualityReportDetail/, { timeout: 15000 });

  const qualityInspection = page.locator(".qualityInspection").first();
  await expect(qualityInspection).toBeVisible({ timeout: 15000 });
  return qualityInspection;
}

export function getQualityReportRuleRow(page: Page, ruleName: string): Locator {
  return page.locator(TABLE_ROWS).filter({ hasText: ruleName }).first();
}

export async function openQualityReportRuleDetail(
  page: Page,
  ruleRow: Locator,
): Promise<Locator> {
  await suppressGuideOverlay(page);
  await ruleRow.getByRole("button", { name: "查看详情" }).first().click({ force: true });
  const dataDrawer = page.locator(".ant-drawer:visible").last();
  await expect(dataDrawer).toBeVisible({ timeout: 10000 });
  return dataDrawer;
}
