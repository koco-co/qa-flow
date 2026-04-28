import { expect, type Locator, type Page } from "@playwright/test";
import { normalizeDataAssetsBaseUrl } from "../../../../shared/helpers/test-setup";
import { prepareJsonTaskEnvironment } from "./json-format-task-runtime";
import { createMonitorWithDuplicateRetry } from "./monitor-create-retry";
import {
  matchesDatasourceCandidate,
  rankDatasourceCandidates,
} from "../有效性-取值范围枚举范围规则/datasource-candidates";
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
  waitForTaskInstanceFinished,
} from "./rule-task-base";
import {
  getCurrentDatasource,
  type JsonRuleScenario,
  resolveEffectiveQualityProjectId,
  resolveVariantName,
} from "../data/test-data";

type MonitorListRow = {
  id?: number | string;
  ruleName?: string;
  monitorName?: string;
  name?: string;
  jobKey?: string;
  execEndTime?: string | null;
};

type ProjectDatasourceRow = {
  id?: number | string;
  dataSourceName?: string;
  dtCenterSourceName?: string;
  sourceTypeValue?: string;
};

type RulePackageRow = {
  id?: number | string;
  packageId?: number | string;
  packageName?: string;
  tableId?: number | string;
};

type ImportedRuleRow = Record<string, unknown> & {
  standardRules?: Array<Record<string, unknown>>;
  standardRuleList?: Array<Record<string, unknown>>;
  customSql?: string;
  selectDataSql?: string;
  customizeSql?: string;
  ruleStrength?: number | string;
};

type RuleTypeRow = number | string | { ruleType?: number | string };

type TaskDetailPayload = {
  monitorReportDetailDTO?: {
    monitorReport?: {
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
    reportRelationTables?: Array<{
      dqTables?: Array<{ monitorTableId?: number | string }>;
    }>;
  };
};

type GeneratedReportRow = {
  id?: number | string;
  reportName?: string;
  status?: number;
};

const GENERATED_REPORT_STATUS_SUCCESS = 2;
const GENERATED_REPORT_STATUS_FAILED = 3;
const GENERATED_REPORT_STATUS_KEEP_RUNNING = 4;
const preparedTasks = new Set<string>();
const executedTasks = new Set<string>();
const readyReports = new Set<string>();

function resolveTaskName(taskName: string): string {
  const suffix = `_${getCurrentDatasource().cacheKey}`;
  return taskName.endsWith(suffix) ? taskName : resolveVariantName(taskName);
}

function getReportName(taskName: string): string {
  return `${resolveTaskName(taskName)}_report`;
}

function encodeBase64(input: string): string {
  return Buffer.from(input, "utf8").toString("base64");
}

function buildTaskApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, new URL(normalizeDataAssetsBaseUrl()).origin).toString();
}

async function postJsonApi<T>(
  page: Page,
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const requestUrl = /^https?:\/\//.test(path) ? path : buildTaskApiUrl(path);
  const response = await page.context().request.post(requestUrl, {
    data: body,
    failOnStatusCode: false,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "Accept-Language": "zh-CN",
      ...extraHeaders,
    },
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status()} from ${requestUrl}: ${responseText.slice(0, 200)}`);
  }
  return JSON.parse(responseText) as T;
}

async function postTaskApi<T>(page: Page, path: string, body: unknown): Promise<T> {
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  return postJsonApi<T>(page, path, body, {
    "X-Valid-Project-ID": String(effectiveProjectId),
  });
}

function parseRuleTypeValue(item: RuleTypeRow): number {
  if (typeof item === "number") return item;
  if (typeof item === "string") return Number(item);
  return Number(item.ruleType);
}

function serializeImportedRule(rule: ImportedRuleRow): Record<string, unknown> {
  const normalizedRule: ImportedRuleRow = { ...rule };
  const standardRuleList = (normalizedRule.standardRules ?? normalizedRule.standardRuleList)?.map(
    (item) => ({ ...item }),
  );
  if (standardRuleList) {
    normalizedRule.standardRuleList = standardRuleList;
  }
  delete normalizedRule.standardRules;
  const { id, isNew, isTable, percentType, functionName, verifyTypeValue, ...serializedRule } =
    normalizedRule as ImportedRuleRow & {
      id?: unknown;
      isNew?: unknown;
      isTable?: unknown;
      percentType?: unknown;
      functionName?: unknown;
      verifyTypeValue?: unknown;
    };
  void id;
  void isNew;
  void isTable;
  void percentType;
  void functionName;
  void verifyTypeValue;

  if (typeof serializedRule.customSql === "string" && serializedRule.customSql) {
    serializedRule.customSql = encodeBase64(serializedRule.customSql);
  }
  if (typeof serializedRule.selectDataSql === "string" && serializedRule.selectDataSql) {
    serializedRule.selectDataSql = encodeBase64(serializedRule.selectDataSql);
  }
  if (typeof serializedRule.customizeSql === "string" && serializedRule.customizeSql) {
    serializedRule.customizeSql = encodeBase64(serializedRule.customizeSql);
  }
  if (serializedRule.ruleStrength !== undefined) {
    serializedRule.ruleStrength = Number(serializedRule.ruleStrength);
  }
  return serializedRule;
}

function extractMonitorRows(payload: {
  data?: {
    data?: MonitorListRow[];
    contentList?: MonitorListRow[];
    list?: MonitorListRow[];
  };
}): MonitorListRow[] {
  return payload.data?.data ?? payload.data?.contentList ?? payload.data?.list ?? [];
}

function getMonitorId(row: MonitorListRow): number | null {
  const value = Number(row.id);
  return Number.isFinite(value) ? value : null;
}

function getMonitorName(row: MonitorListRow): string {
  return String(row.ruleName ?? row.monitorName ?? row.name ?? "");
}

function matchesCurrentDatasource(item: ProjectDatasourceRow): boolean {
  return matchesDatasourceCandidate(item, getCurrentDatasource());
}

async function getCandidateDatasourceIds(page: Page): Promise<number[]> {
  const datasource = getCurrentDatasource();
  const candidateItems: ProjectDatasourceRow[] = [];

  for (const endpoint of [
    "/dmetadata/v1/dataSource/monitor/list",
    "/dassets/v1/dataSource/monitor/list",
  ]) {
    const response = await postTaskApi<{
      data?: ProjectDatasourceRow[];
    }>(page, endpoint, {}).catch(() => null);
    candidateItems.push(...(response?.data ?? []));
  }

  const pageQueryResponse = await postTaskApi<{
    data?: {
      contentList?: ProjectDatasourceRow[];
    };
  }>(page, "/dassets/v1/dataSource/pageQuery", {
    current: 1,
    size: 200,
    search: "",
  }).catch(() => null);

  candidateItems.push(...(pageQueryResponse?.data?.contentList ?? []));

  const candidateIds: number[] = [];
  for (const item of rankDatasourceCandidates(candidateItems, datasource)) {
    const id = Number(item.id);
    if (Number.isFinite(id) && !candidateIds.includes(id)) {
      candidateIds.push(id);
    }
  }

  if (candidateIds.length === 0) {
    throw new Error(`未找到 ${datasource.reportName} 数据源`);
  }

  return candidateIds;
}

async function importTaskRulesFromPackage(
  page: Page,
  scenario: JsonRuleScenario,
): Promise<{
  dataSourceId: number;
  tableId: number;
  packageIds: number[];
  ruleTypes: number[];
  rules: Record<string, unknown>[];
}> {
  const datasource = getCurrentDatasource();
  const strippedDatabase = datasource.database.replace(/_test$/, "");
  const schemaCandidates = [datasource.database, strippedDatabase].filter(
    (value, index, array) => value && array.indexOf(value) === index,
  );
  const candidateDataSourceIds = await getCandidateDatasourceIds(page);

  let packageRow: RulePackageRow | undefined;
  let dataSourceId: number | null = null;
  outer: for (const candidateDataSourceId of candidateDataSourceIds) {
    for (const schemaName of schemaCandidates) {
      const packageResponse = await postTaskApi<{
        success?: boolean;
        data?: RulePackageRow[];
      }>(page, "/dassets/v1/valid/monitorRulePackage/ruleSetList", {
        dataSourceId: candidateDataSourceId,
        tableName: scenario.tableName,
        schemaName,
      });
      packageRow = (packageResponse.data ?? []).find(
        (item) => item.packageName === scenario.packageName,
      );
      if (packageRow) {
        dataSourceId = candidateDataSourceId;
        break outer;
      }
    }
  }

  const packageId = Number(packageRow?.packageId ?? packageRow?.id);
  const tableId = Number(packageRow?.tableId);
  if (!Number.isFinite(packageId) || !Number.isFinite(tableId) || !Number.isFinite(dataSourceId)) {
    throw new Error(`规则包 ${scenario.packageName} 未索引完成`);
  }

  const ruleTypesResponse = await postTaskApi<{ data?: RuleTypeRow[] }>(
    page,
    "/dassets/v1/valid/monitorRulePackage/ruleTypes",
    { packageIdList: [packageId] },
  );
  const ruleTypes = (ruleTypesResponse.data ?? [])
    .map((item) => parseRuleTypeValue(item))
    .filter((item) => Number.isFinite(item));

  const rulesResponse = await postTaskApi<{
    success?: boolean;
    message?: string;
    data?: ImportedRuleRow[];
  }>(page, "/dassets/v1/valid/monitorRulePackage/getMonitorRule", {
    packageIdList: [packageId],
    ruleTypeList: ruleTypes,
  });
  if (
    !rulesResponse.success ||
    !Array.isArray(rulesResponse.data) ||
    rulesResponse.data.length === 0
  ) {
    throw new Error(`导入规则包失败: ${rulesResponse.message ?? scenario.packageName}`);
  }

  return {
    dataSourceId,
    tableId,
    packageIds: [packageId],
    ruleTypes,
    rules: rulesResponse.data.map((rule) => serializeImportedRule(rule)),
  };
}

async function deleteTaskIfExists(page: Page, taskName: string): Promise<void> {
  const actualTaskName = resolveTaskName(taskName);
  const response = await postTaskApi<{
    data?: {
      data?: MonitorListRow[];
      contentList?: MonitorListRow[];
      list?: MonitorListRow[];
    };
  }>(page, "/dassets/v1/valid/monitor/pageQuery", {
    pageIndex: 1,
    pageSize: 200,
  });
  const row = extractMonitorRows(response).find((item) => getMonitorName(item) === actualTaskName);
  const monitorId = row ? getMonitorId(row) : null;
  if (monitorId === null) {
    return;
  }
  await postTaskApi(page, "/dassets/v1/valid/monitor/delete", { monitorId });
}

function buildMonitorReportParam(taskName: string) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    monitorReport: {
      reportName: getReportName(taskName),
      periodType: 2,
      reportType: 1,
      needCar: 0,
      reportShowResultType: 1,
      reportGenerateType: 2,
      ruleTaskTypesList: [],
      dataContextStart: "1",
      dataContextEnd: "0",
      dispatchConfigDTO: {
        periodType: "2",
        beginDate: today,
        endDate: "2099-12-31",
        hour: "0",
        min: "0",
      },
      isEnable: 1,
    },
  };
}

async function createTaskViaApi(page: Page, scenario: JsonRuleScenario): Promise<void> {
  const imported = await importTaskRulesFromPackage(page, scenario);
  const datasource = getCurrentDatasource();
  const payload = {
    dataSourceId: imported.dataSourceId,
    tableName: scenario.tableName,
    tableId: imported.tableId,
    schemaName: datasource.database,
    ruleName: resolveTaskName(scenario.taskName),
    regularType: 0,
    packageCount: 1,
    jobBuildType: 2,
    isRunOn: 0,
    isSubscribe: 0,
    partition: "",
    partitionType: 0,
    associatedTasks: [],
    channelIds: [],
    notifyUser: [],
    webhook: "",
    taskParams: "",
    scheduleConf: "",
    packageIds: imported.packageIds,
    ruleTypes: imported.ruleTypes,
    expansion: JSON.stringify({
      openSample: 0,
      sampleDto: {},
      packageIds: imported.packageIds,
      ruleTypes: imported.ruleTypes,
    }),
    rules: imported.rules,
    monitorReportParam: buildMonitorReportParam(scenario.taskName),
  };
  await createMonitorWithDuplicateRetry(
    () =>
      postTaskApi<{ success?: boolean; message?: string }>(
        page,
        "/dassets/v1/valid/monitor/add",
        payload,
      ),
    () => deleteTaskIfExists(page, scenario.taskName),
    scenario.taskName,
  );
}

async function hasTaskMonitorRow(page: Page, taskName: string): Promise<boolean> {
  try {
    await getTaskMonitorRow(page, taskName);
    return true;
  } catch {
    return false;
  }
}

async function waitForTaskReady(page: Page, taskName: string): Promise<void> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await hasTaskMonitorRow(page, taskName)) {
      return;
    }
    await gotoRuleTaskList(page);
    const row = getTableRowByTaskName(page, taskName);
    if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
      return;
    }
    await page.waitForTimeout(3000);
  }
  throw new Error(`任务 ${resolveTaskName(taskName)} 未出现在列表中`);
}

export async function ensureJsonFormatTask(page: Page, scenario: JsonRuleScenario): Promise<void> {
  const cacheKey = resolveTaskName(scenario.taskName);
  if (preparedTasks.has(cacheKey)) {
    return;
  }
  await prepareJsonTaskEnvironment(page, scenario);
  await deleteTaskIfExists(page, scenario.taskName);
  await createTaskViaApi(page, scenario);
  await waitForTaskReady(page, scenario.taskName);
  preparedTasks.add(cacheKey);
}

async function getTaskMonitorRow(page: Page, taskName: string): Promise<MonitorListRow> {
  const actualTaskName = resolveTaskName(taskName);
  const response = await postTaskApi<{
    data?: {
      data?: MonitorListRow[];
      contentList?: MonitorListRow[];
      list?: MonitorListRow[];
    };
  }>(page, "/dassets/v1/valid/monitor/pageQuery", {
    pageIndex: 1,
    pageSize: 200,
  });
  const row = extractMonitorRows(response).find((item) => getMonitorName(item) === actualTaskName);
  if (!row) {
    throw new Error(`未找到任务 ${actualTaskName}`);
  }
  return row;
}

async function getTaskDetail(page: Page, taskName: string): Promise<TaskDetailPayload> {
  const row = await getTaskMonitorRow(page, taskName);
  const monitorId = getMonitorId(row);
  if (monitorId === null) {
    throw new Error(`任务 ${taskName} monitorId 无效`);
  }
  const response = await postTaskApi<{
    success?: boolean;
    message?: string;
    data?: TaskDetailPayload;
  }>(page, "/dassets/v1/valid/monitor/detail", {
    monitorId,
  });
  if (!response.success || !response.data) {
    throw new Error(`获取任务详情失败: ${response.message ?? taskName}`);
  }
  return response.data;
}

function hasCompleteReportSchedule(
  payload: TaskDetailPayload["monitorReportDetailDTO"] | undefined,
): boolean {
  const monitor = payload?.monitorReport;
  return Boolean(
    monitor?.dispatchConfigDTO &&
      monitor?.dataContextStart !== null &&
      monitor?.dataContextStart !== undefined &&
      monitor?.dataContextEnd !== null &&
      monitor?.dataContextEnd !== undefined,
  );
}

async function getGeneratedReports(page: Page, taskName: string): Promise<GeneratedReportRow[]> {
  const response = await postTaskApi<{
    data?: { contentList?: GeneratedReportRow[] };
  }>(page, "/dassets/v1/valid/monitorReportRecord/pageList", {
    current: 1,
    size: 50,
    search: resolveTaskName(taskName),
  });
  return (response.data?.contentList ?? []).filter(
    (item) => item.reportName === getReportName(taskName),
  );
}

async function getGeneratedReportConfig(page: Page, taskName: string): Promise<number> {
  const response = await postTaskApi<{
    data?: {
      contentList?: Array<{
        monitorReport?: { id?: number | string; reportName?: string };
      }>;
    };
  }>(page, "/dassets/v1/valid/monitorReport/page", {
    current: 1,
    size: 20,
    reportName: resolveTaskName(taskName),
  });
  const row = (response.data?.contentList ?? []).find(
    (item) => item.monitorReport?.reportName === getReportName(taskName),
  );
  const reportId = Number(row?.monitorReport?.id);
  if (!Number.isFinite(reportId)) {
    throw new Error(`未找到质量报告配置 ${taskName}`);
  }
  return reportId;
}

async function repairQualityReportConfig(page: Page, taskName: string): Promise<void> {
  const taskDetail = await getTaskDetail(page, taskName);
  if (hasCompleteReportSchedule(taskDetail.monitorReportDetailDTO)) {
    return;
  }
  const reportId = await getGeneratedReportConfig(page, taskName);
  const report = taskDetail.monitorReportDetailDTO?.monitorReport;
  const tableId = String(
    taskDetail.monitorReportDetailDTO?.reportRelationTables?.[0]?.dqTables?.[0]?.monitorTableId ??
      "",
  );
  const monitorId = getMonitorId(await getTaskMonitorRow(page, taskName));
  if (!tableId || monitorId === null) {
    throw new Error(`无法修复质量报告配置: ${taskName}`);
  }
  const response = await postTaskApi<{ success?: boolean; message?: string }>(
    page,
    "/dassets/v1/valid/monitorReport/save",
    {
      monitorReport: {
        id: reportId,
        reportName: report?.reportName ?? getReportName(taskName),
        periodType: report?.periodType ?? 2,
        reportType: report?.reportType ?? 1,
        needCar: report?.needCar ?? 0,
        reportShowResultType: report?.reportShowResultType ?? 1,
        reportGenerateType: report?.reportGenerateType ?? 2,
        ruleTaskTypesList: report?.ruleTaskTypesList ?? [],
        dataContextStart: String(report?.dataContextStart ?? "1"),
        dataContextEnd: String(report?.dataContextEnd ?? "0"),
        dispatchConfigDTO: report?.dispatchConfigDTO,
        isEnable: report?.isEnable ?? 1,
      },
      dqTables: [tableId],
      dqTableRules: [
        {
          tableId,
          monitorRuleVOS: [{ monitorId, ruleName: resolveTaskName(taskName) }],
        },
      ],
    },
  );
  if (!response.success) {
    throw new Error(`修复质量报告配置失败: ${response.message ?? taskName}`);
  }
}

async function createTodayReport(page: Page, taskName: string): Promise<void> {
  const reportId = await getGeneratedReportConfig(page, taskName);
  const existingRows = await getGeneratedReports(page, taskName);
  const existingIds = existingRows
    .map((item) => Number(item.id))
    .filter((item) => Number.isFinite(item));
  if (existingIds.length > 0) {
    await postTaskApi(page, "/dassets/v1/valid/monitorReportRecord/delete", {
      ids: existingIds,
    });
  }
  const tenantId = await page.evaluate(() => {
    const match = document.cookie.match(/(?:^|;\s*)dt_tenant_id=([^;]+)/);
    return match ? Number(decodeURIComponent(match[1])) : null;
  });
  const response = await postTaskApi<{ success?: boolean; message?: string }>(
    page,
    "/dassets/v1/valid/monitorReportRecord/createToday",
    {
      reportId,
      tenantId,
    },
  );
  if (!response.success) {
    throw new Error(`生成当日报告失败: ${response.message ?? taskName}`);
  }
}

async function waitForGeneratedReport(page: Page, taskName: string): Promise<void> {
  const deadline = Date.now() + 600_000;
  while (Date.now() < deadline) {
    const row = (await getGeneratedReports(page, taskName)).find(
      (item) => item.reportName === getReportName(taskName),
    );
    if (row) {
      if (row.status === GENERATED_REPORT_STATUS_FAILED) {
        throw new Error(`质量报告生成失败: ${taskName}`);
      }
      if (
        row.status === GENERATED_REPORT_STATUS_SUCCESS ||
        row.status === GENERATED_REPORT_STATUS_KEEP_RUNNING
      ) {
        return;
      }
    }
    await page.waitForTimeout(5000);
  }
  throw new Error(`质量报告未在限定时间内生成: ${taskName}`);
}

export async function ensureExecutedJsonTask(
  page: Page,
  scenario: JsonRuleScenario,
): Promise<void> {
  await ensureJsonFormatTask(page, scenario);
  const cacheKey = resolveTaskName(scenario.taskName);
  if (!executedTasks.has(cacheKey)) {
    await executeTaskFromList(page, scenario.taskName);
    await waitForTaskInstanceFinished(page, scenario.taskName, 600000);
    executedTasks.add(cacheKey);
  }
}

export async function ensureJsonQualityReportReady(
  page: Page,
  scenario: JsonRuleScenario,
): Promise<void> {
  await ensureExecutedJsonTask(page, scenario);
  const cacheKey = resolveTaskName(scenario.taskName);
  if (readyReports.has(cacheKey)) {
    return;
  }
  await repairQualityReportConfig(page, scenario.taskName);
  await createTodayReport(page, scenario.taskName);
  await waitForGeneratedReport(page, scenario.taskName);
  await gotoQualityReport(page);
  readyReports.add(cacheKey);
}

export async function openTaskInstanceDetail(page: Page, instanceRow: Locator): Promise<Locator> {
  const detailResponsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes("/monitorRecord/detailReport") &&
        response.request().method() === "POST",
    )
    .catch(() => null);
  await instanceRow.getByRole("button").first().click();
  await detailResponsePromise;
  const drawer = page.locator(".dtc-drawer:visible").last();
  await expect(drawer).toBeVisible({ timeout: 10000 });
  return drawer;
}

export async function openTaskRuleDetailDataDrawer(
  page: Page,
  detailDrawer: Locator,
): Promise<Locator> {
  const detailButton = detailDrawer.getByRole("button", { name: "查看明细" }).first();
  await expect(detailButton).toBeVisible({ timeout: 10000 });
  await detailButton.click();
  const drawer = page.locator(".ant-drawer:visible").last();
  await expect(drawer).toBeVisible({ timeout: 10000 });
  return drawer;
}

export async function waitForVisibleTaskRow(page: Page, taskName: string): Promise<Locator> {
  await gotoValidationResults(page);
  const row = getTableRowByTaskName(page, taskName);
  await expect(row).toBeVisible({ timeout: 10000 });
  return row;
}

export async function openPreparedQualityReport(
  page: Page,
  scenario: JsonRuleScenario,
): Promise<Locator> {
  await ensureJsonQualityReportReady(page, scenario);
  return openQualityReportDetail(page, scenario.taskName);
}

export {
  getQualityReportRuleRow,
  getTableRowByTaskName,
  getTaskDetailRuleCard,
  gotoQualityReport,
  gotoRuleTaskList,
  gotoValidationResults,
  openQualityReportDetail,
  openQualityReportRuleDetail,
  waitForTaskInstanceFinished,
};
