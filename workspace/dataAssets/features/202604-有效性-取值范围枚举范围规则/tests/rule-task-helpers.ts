import { expect, type Locator, type Page } from "@playwright/test";

import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
  navigateViaMenu,
  normalizeDataAssetsBaseUrl,
  selectAntOption,
} from "../../../shared/helpers/test-setup";
import {
  createRuleSetForTable,
  deleteRuleSetsByTableNames,
  enableCompatibleMonitorDatasourceRouting,
  gotoRuleSetList,
  type RangeEnumConfig,
} from "./rule-editor-helpers";
import {
  getCurrentDatasource,
  injectProjectContext,
  resolveEffectiveQualityProjectId,
  resolveVariantName,
  runPreconditions,
} from "./test-data";
import {
  ensureOfflineTasks,
  gotoOfflineQualityReport,
  gotoOfflineRuleTaskList,
  gotoOfflineValidationResults,
  isOfflineMode,
  markOfflineReportReady,
  markOfflineTaskExecuted,
  openOfflineQualityReportDetail,
  openOfflineQualityReportRuleDetail,
  openOfflineTaskInstanceDetail,
  openOfflineTaskRuleDetailDataDrawer,
} from "./offline-suite-helper";
import { canUseFinishedTaskRow } from "./task-instance-state";

const TABLE_ROWS = ".ant-table-tbody tr:not(.ant-table-measure-row)";
const TASK_API_PAGE_SIZE = 200;
const preconditionReadyDatasources = new Set<string>();

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

const STRING_RULE: RangeEnumConfig = {
  field: "score_str",
  range: {
    firstOperator: ">",
    firstValue: "1",
    condition: "且",
    secondOperator: "<",
    secondValue: "10",
  },
  enumOperator: "in",
  enumValues: ["5", "5.5", "15"],
  relation: "且",
  ruleStrength: "强规则",
  description: "score_str取值范围1到10且枚举值in 5,5.5,15",
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
  task_15695_str: {
    tableName: "quality_test_str",
    packageName: "string强转包",
    supportingRuleSet: {
      tableName: "quality_test_str",
      packageName: "string强转包",
      ruleConfig: STRING_RULE,
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

type MonitorListRow = {
  id?: number | string;
  ruleName?: string;
  monitorName?: string;
  name?: string;
  status?: number;
  jobKey?: string;
  execEndTime?: string | null;
  execTimeStr?: string;
};

type ProjectDatasourceRow = {
  id?: number | string;
  dataSourceName?: string;
  dtCenterSourceName?: string;
  sourceTypeValue?: string;
};

type RulePackageRow = {
  id?: number | string;        // API field: package row ID (used as packageId in task create)
  packageId?: number | string; // legacy alias — may not be present in API response
  packageName?: string;
  tableId?: number | string;
  setId?: number | string;     // rule set ID
};

// The ruleTypes API returns data as either:
// - array of primitive values: ["3", "6", ...] (observed in production)
// - array of objects with ruleType: [{ruleType: 3}, ...] (legacy format)
type RuleTypeRow = (number | string) | { ruleType?: number | string };

function parseRuleTypeValue(item: RuleTypeRow): number {
  if (typeof item === "number") return item;
  if (typeof item === "string") return Number(item);
  return Number((item as { ruleType?: number | string }).ruleType);
}

type ImportedRuleRow = Record<string, unknown> & {
  standardRules?: Array<Record<string, unknown>>;
  standardRuleList?: Array<Record<string, unknown>>;
  customSql?: string;
  selectDataSql?: string;
  customizeSql?: string;
  ruleStrength?: number | string;
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
  dataSourceId?: number | string;
  tableName?: string;
  schema?: string;
  catalogName?: string;
  sourceType?: number | string;
  ruleName?: string;
  monitorReportDetailDTO?: ConfigReportRow;
};

type GeneratedReportRow = {
  id?: number | string;
  reportName?: string;
  status?: number;
};

type BatchRunRecord = {
  jobId?: string;
  runNum?: number;
  status?: number;
  execStartTime?: number;
  execEndTime?: number;
  engineJobId?: string;
};

const GENERATED_REPORT_STATUS_SUCCESS = 2;
const GENERATED_REPORT_STATUS_FAILED = 3;
const GENERATED_REPORT_STATUS_KEEP_RUNNING = 4;
const RETRYABLE_HTTP_STATUS = new Set([502, 503, 504]);

function buildTaskApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const dataAssetsOrigin = new URL(normalizeDataAssetsBaseUrl()).origin;
  return new URL(normalizedPath, dataAssetsOrigin).toString();
}

async function postTaskApi<T>(page: Page, path: string, body: unknown): Promise<T> {
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  return postJsonApi<T>(page, buildTaskApiUrl(path), body, {
    "X-Valid-Project-ID": String(effectiveProjectId),
  });
}

async function postQualityReportApi<T>(page: Page, path: string, body: unknown): Promise<T> {
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  return postJsonApi<T>(page, buildTaskApiUrl(path), body, {
    "X-Valid-Project-ID": String(effectiveProjectId),
  });
}

async function postBatchApi<T>(page: Page, path: string, body: unknown): Promise<T> {
  return postJsonApi<T>(page, path, body);
}

async function postJsonApi<T>(
  page: Page,
  requestUrl: string,
  requestBody: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await page.evaluate(
      async ({ url, body, headers }) => {
        const result = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "Accept-Language": "zh-CN",
            ...headers,
          },
          body: JSON.stringify(body),
        });
        return {
          ok: result.ok,
          status: result.status,
          statusText: result.statusText,
          text: await result.text(),
        };
      },
      {
        url: requestUrl,
        body: requestBody,
        headers: extraHeaders ?? {},
      },
    );

    if (response.ok) {
      try {
        return JSON.parse(response.text) as T;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Non-JSON response from ${requestUrl}: ${message}. Body: ${response.text.slice(0, 200)}`,
        );
      }
    }

    lastError = new Error(
      `HTTP ${response.status} ${response.statusText} from ${requestUrl}: ${response.text.slice(0, 200)}`,
    );
    if (!RETRYABLE_HTTP_STATUS.has(response.status) || attempt === 4) {
      throw lastError;
    }

    await page.waitForTimeout(1000 * attempt);
  }

  throw lastError ?? new Error(`Request failed: ${requestUrl}`);
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

function resolveTaskName(taskName: string): string {
  const { cacheKey } = getCurrentDatasource();
  const suffix = `_${cacheKey}`;
  if (taskName.endsWith(suffix) || taskName.includes(`${suffix}_report`)) {
    return taskName;
  }
  return resolveVariantName(taskName);
}

function getReportName(taskName: string): string {
  return `${resolveTaskName(taskName)}_report`;
}

function encodeBase64(input: string): string {
  return Buffer.from(input, "utf8").toString("base64");
}

function serializeImportedRule(
  rule: ImportedRuleRow,
  weakenImportedRule = false,
): Record<string, unknown> {
  const normalizedRule: ImportedRuleRow = { ...rule };
  const nextRuleStrength = weakenImportedRule ? 1 : normalizedRule.ruleStrength;
  const standardRuleList = (normalizedRule.standardRules ?? normalizedRule.standardRuleList)?.map(
    (item) => ({
      ...item,
      ...(weakenImportedRule ? { ruleStrength: 1 } : {}),
    }),
  );

  if (standardRuleList) {
    normalizedRule.standardRuleList = standardRuleList;
  }
  delete normalizedRule.standardRules;

  const { id, isNew, isTable, percentType, functionName, verifyTypeValue, ...serializedRule } =
    normalizedRule;
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
  if (nextRuleStrength !== undefined && nextRuleStrength !== null && nextRuleStrength !== "") {
    serializedRule.ruleStrength = Number(nextRuleStrength);
  }

  return serializedRule;
}

/**
 * When the deployed frontend uses renderNormalFunction for functionId=49 (VALUE_AND_ENUM),
 * the saved expansion only contains basic operator/threshold (wrong format).
 * This function patches the standardRuleList items to use the correct VALUE_AND_ENUM
 * expansion format: { condition, valueRange, enumRange }.
 *
 * This is a workaround for environments where the VALUE_AND_ENUM-specific form
 * (renderValueAndEnumFunction) is not deployed.
 */
function patchValueAndEnumExpansion(
  rules: ReturnType<typeof serializeImportedRule>[],
  ruleConfig: RangeEnumConfig | undefined,
): ReturnType<typeof serializeImportedRule>[] {
  if (!ruleConfig) return rules;

  const VALUE_AND_ENUM_FUNCTION_ID = "49";
  const relationToCondition = (relation: "且" | "或" | undefined): string =>
    relation === "或" ? "OR" : "AND";
  const rangeConditionToBackend = (cond: "且" | "或" | undefined): string =>
    cond === "或" ? "OR" : "AND";

  return rules.map((rule) => {
    const standardRuleList = (rule.standardRuleList ?? rule.standardRules) as
      | Array<Record<string, unknown>>
      | undefined;
    if (!Array.isArray(standardRuleList)) return rule;

    const hasValueAndEnum = standardRuleList.some(
      (item) => String(item.functionId) === VALUE_AND_ENUM_FUNCTION_ID,
    );
    if (!hasValueAndEnum) return rule;

    const patchedStandardRuleList = standardRuleList.map((item) => {
      if (String(item.functionId) !== VALUE_AND_ENUM_FUNCTION_ID) return item;

      // Build valueRange from ruleConfig.range
      const valueRange: Record<string, unknown> = {};
      if (ruleConfig.range?.firstOperator) {
        valueRange.firstOperator = ruleConfig.range.firstOperator;
        valueRange.firstThreshold = ruleConfig.range.firstValue ?? "";
      }
      if (ruleConfig.range?.secondOperator) {
        valueRange.condition = rangeConditionToBackend(ruleConfig.range.condition);
        valueRange.secondOperator = ruleConfig.range.secondOperator;
        valueRange.secondThreshold = ruleConfig.range.secondValue ?? "";
      }

      // Build enumRange from ruleConfig.enumOperator / enumValues
      const enumRange: Record<string, unknown> = {};
      if (ruleConfig.enumOperator) {
        enumRange.operator = ruleConfig.enumOperator;
        enumRange.threshold = (ruleConfig.enumValues ?? []).join(",");
      }

      // Top-level condition = relation between range and enum
      const condition = relationToCondition(ruleConfig.relation);

      const patchedExpansion = JSON.stringify({ condition, enumRange, valueRange });
      process.stderr.write(`[task] patching VALUE_AND_ENUM expansion: ${patchedExpansion}\n`);

      return {
        ...item,
        expansion: patchedExpansion,
      };
    });

    return { ...rule, standardRuleList: patchedStandardRuleList };
  });
}

async function getProjectDatasource(page: Page): Promise<Required<Pick<ProjectDatasourceRow, "id">> & ProjectDatasourceRow> {
  const datasource = getCurrentDatasource();
  const matchesCurrentDatasource = (item: ProjectDatasourceRow) =>
    datasource.optionPattern.test(
      `${String(item.dataSourceName ?? "")} ${String(item.dtCenterSourceName ?? "")}`,
    ) || datasource.sourceTypePattern.test(String(item.sourceTypeValue ?? ""));

  // Try both monitor list endpoints — one may be intercepted by the compatibility routing
  const monitorListEndpoints = [
    "/dmetadata/v1/dataSource/monitor/list",
    "/dassets/v1/dataSource/monitor/list",
  ];
  for (const endpoint of monitorListEndpoints) {
    const monitorListResponse = await postTaskApi<{
      data?: ProjectDatasourceRow[];
    }>(page, endpoint, {}).catch(() => null);
    const monitorDatasource = (monitorListResponse?.data ?? []).find(matchesCurrentDatasource);
    if (monitorDatasource?.id) {
      process.stderr.write(`[task] resolved datasource id ${monitorDatasource.id} from ${endpoint}.\n`);
      return monitorDatasource as Required<Pick<ProjectDatasourceRow, "id">> & ProjectDatasourceRow;
    }
  }

  const pageQueryResponse =
    (await postTaskApi<{
      data?: {
        contentList?: ProjectDatasourceRow[];
      };
    }>(page, "/dassets/v1/dataSource/pageQuery", {
      current: 1,
      size: 200,
      search: "",
    })) ?? {};

  const projectDatasource = (pageQueryResponse.data?.contentList ?? []).find(
    (item) =>
      matchesCurrentDatasource(item),
  );

  if (!projectDatasource?.id) {
    throw new Error(`No ${datasource.reportName} datasource available for current quality project.`);
  }

  return projectDatasource as Required<Pick<ProjectDatasourceRow, "id">> & ProjectDatasourceRow;
}

async function importTaskRulesFromPackage(
  page: Page,
  config: TaskSetupConfig,
): Promise<{
  dataSourceId: number;
  tableId: number;
  packageIds: number[];
  ruleTypes: number[];
  rules: Record<string, unknown>[];
  effectiveSchemaName: string;
}> {
  const datasource = getCurrentDatasource();
  const seededDatasourceId = await (async () => {
    const preferredTaskNames = Object.entries(TASK_SETUP_CONFIGS)
      .filter(([, candidateConfig]) => candidateConfig.tableName === config.tableName)
      .map(([taskName]) => resolveVariantName(taskName));
    const fallbackTaskNames = Object.keys(TASK_SETUP_CONFIGS)
      .map((taskName) => resolveVariantName(taskName))
      .filter((taskName) => !preferredTaskNames.includes(taskName));
    const candidateNames = new Set([...preferredTaskNames, ...fallbackTaskNames]);
    const monitorRows: MonitorListRow[] = [];

    for (let pageIndex = 1; pageIndex <= 3; pageIndex += 1) {
      const listResponse =
        (await postTaskApi<{
          data?: { data?: MonitorListRow[]; contentList?: MonitorListRow[]; list?: MonitorListRow[] };
        }>(page, "/dassets/v1/valid/monitor/pageQuery", {
          pageIndex,
          pageSize: TASK_API_PAGE_SIZE,
        })) ?? {};
      const pageRows = extractMonitorRows(listResponse);
      monitorRows.push(...pageRows);
      if (pageRows.length < TASK_API_PAGE_SIZE) {
        break;
      }
    }

    for (const row of monitorRows) {
      const monitorName = getMonitorName(row);
      if (!candidateNames.has(monitorName)) {
        continue;
      }
      const monitorId = getMonitorId(row);
      if (monitorId === null) {
        continue;
      }
      try {
        const detailResponse =
          (await postTaskApi<{
            success?: boolean;
            message?: string;
            data?: TaskDetailPayload;
          }>(page, "/dassets/v1/valid/monitor/detail", {
            monitorId,
          })) ?? {};
        const candidateId = Number(detailResponse.data?.dataSourceId);
        if (Number.isFinite(candidateId)) {
          process.stderr.write(
            `[task] reusing datasource id ${candidateId} from existing task ${monitorName}.\n`,
          );
          return candidateId;
        }
      } catch {
        continue;
      }
    }
    return null;
  })();
  const primaryDataSourceId =
    seededDatasourceId ??
    Number((await getProjectDatasource(page)).id);
  if (!Number.isFinite(primaryDataSourceId)) {
    throw new Error(`Datasource id for ${datasource.reportName} is invalid: ${primaryDataSourceId}`);
  }

  // Collect all candidate datasource IDs to try — monitor list IDs may differ from pageQuery IDs
  const candidateDataSourceIds: number[] = [primaryDataSourceId];
  for (const endpoint of ["/dmetadata/v1/dataSource/monitor/list", "/dassets/v1/dataSource/monitor/list"]) {
    const resp = await postTaskApi<{ data?: ProjectDatasourceRow[] }>(page, endpoint, {}).catch(() => null);
    for (const item of resp?.data ?? []) {
      const id = Number(item.id);
      if (Number.isFinite(id) && !candidateDataSourceIds.includes(id)) {
        candidateDataSourceIds.push(id);
      }
    }
  }

  process.stderr.write(
    `[task] preparing package import for ${config.packageName} on ${config.tableName} (datasourceId=${primaryDataSourceId}, candidates=${candidateDataSourceIds.join(",")}).\n`,
  );

  // Build schema name candidates (e.g. "pw_test" → ["pw_test", "pw"])
  const strippedDbName = datasource.database.replace(/_test$/, "");
  const schemaCandidates = [datasource.database, strippedDbName].filter(
    (v, i, a) => v && a.indexOf(v) === i,
  );

  let packageRow: RulePackageRow | undefined;
  let dataSourceId = primaryDataSourceId;
  let effectiveSchemaName = datasource.database;
  outer: for (let attempt = 1; attempt <= 5; attempt += 1) {
    for (const candidateId of candidateDataSourceIds) {
      for (const schemaCandidate of schemaCandidates) {
        const packageResponse =
          (await postTaskApi<{
            success?: boolean;
            message?: string;
            data?: RulePackageRow[];
          }>(page, "/dassets/v1/valid/monitorRulePackage/ruleSetList", {
            dataSourceId: candidateId,
            tableName: config.tableName,
            schemaName: schemaCandidate,
          })) ?? {};
        packageRow = (packageResponse.data ?? []).find((item) => item.packageName === config.packageName);
        // API returns `id` as the package row ID; `packageId` may be absent
        const resolvedPackageId = packageRow?.packageId ?? packageRow?.id;
        if (packageRow && resolvedPackageId) {
          dataSourceId = candidateId;
          effectiveSchemaName = schemaCandidate;
          if (schemaCandidate !== datasource.database) {
            process.stderr.write(
              `[task] WARN: package found with fallback schema "${schemaCandidate}" (configured: "${datasource.database}").\n`,
            );
          }
          break outer;
        }
      }
    }
    process.stderr.write(
      `[task] ruleSetList attempt ${attempt}: package "${config.packageName}" not found for ${config.tableName} (tried datasourceIds=${candidateDataSourceIds.join(",")}).\n`,
    );
    if (attempt < 5) {
      await page.waitForTimeout(3000 * attempt);
    }
  }
  const resolvedPackageId = packageRow?.packageId ?? packageRow?.id;
  if (!packageRow || !resolvedPackageId) {
    throw new Error(
      `Task package "${config.packageName}" for table "${config.tableName}" was not found via API.`,
    );
  }

  const packageId = Number(resolvedPackageId);
  const tableId = Number(packageRow.tableId);
  if (!Number.isFinite(packageId) || !Number.isFinite(tableId)) {
    throw new Error(
      `Task package "${config.packageName}" returned invalid package/table ids: ${resolvedPackageId}/${packageRow.tableId}`,
    );
  }

  let ruleTypes: number[] = [];
  for (let ruleTypeAttempt = 1; ruleTypeAttempt <= 5; ruleTypeAttempt += 1) {
    const ruleTypeResponse =
      (await postTaskApi<{
        success?: boolean;
        message?: string;
        data?: RuleTypeRow[];
      }>(page, "/dassets/v1/valid/monitorRulePackage/ruleTypes", {
        packageIdList: [packageId],
      })) ?? {};
    ruleTypes = (ruleTypeResponse.data ?? [])
      .map((item) => parseRuleTypeValue(item))
      .filter((value) => Number.isFinite(value));
    if (ruleTypes.length > 0) {
      break;
    }
    process.stderr.write(
      `[task] ruleTypes attempt ${ruleTypeAttempt}: no rule types for packageId=${packageId}.\n`,
    );
    if (ruleTypeAttempt < 5) {
      await page.waitForTimeout(3000 * ruleTypeAttempt);
    }
  }
  if (ruleTypes.length === 0) {
    throw new Error(`Task package "${config.packageName}" did not expose any rule types via API.`);
  }

  const importResponse =
    (await postTaskApi<{
      success?: boolean;
      message?: string;
      data?: ImportedRuleRow[];
    }>(page, "/dassets/v1/valid/monitorRulePackage/getMonitorRule", {
      packageIdList: [packageId],
      ruleTypeList: ruleTypes,
    })) ?? {};
  if (!importResponse.success || !Array.isArray(importResponse.data) || importResponse.data.length === 0) {
    throw new Error(
      `Importing rules from package "${config.packageName}" failed: ${importResponse.message ?? "no rules returned"}`,
    );
  }
  process.stderr.write(`[task] imported ${importResponse.data.length} rules from ${config.packageName}.\n`);
  process.stderr.write(`[task] raw rule data: ${JSON.stringify(importResponse.data[0] ?? {})}\n`);

  const serializedRules = importResponse.data.map((rule) => serializeImportedRule(rule, config.weakenImportedRule));
  process.stderr.write(`[task] serialized rule[0]: ${JSON.stringify(serializedRules[0] ?? {})}\n`);

  // Patch VALUE_AND_ENUM expansion if deployed frontend used renderNormalFunction
  const patchedRules = patchValueAndEnumExpansion(serializedRules, config.supportingRuleSet?.ruleConfig);

  return {
    dataSourceId,
    tableId,
    packageIds: [packageId],
    ruleTypes,
    rules: patchedRules,
    effectiveSchemaName,
  };
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

async function createTaskViaApi(page: Page, taskName: string, config: TaskSetupConfig): Promise<void> {
  const actualTaskName = resolveTaskName(taskName);
  const importedPackage = await importTaskRulesFromPackage(page, config);
  const monitorAddPayload = {
    dataSourceId: importedPackage.dataSourceId,
    tableName: config.tableName,
    tableId: importedPackage.tableId,
    schemaName: importedPackage.effectiveSchemaName,
    ruleName: actualTaskName,
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
    packageIds: importedPackage.packageIds,
    ruleTypes: importedPackage.ruleTypes,
    expansion: JSON.stringify({
      openSample: 0,
      sampleDto: {},
      packageIds: importedPackage.packageIds,
      ruleTypes: importedPackage.ruleTypes,
    }),
    rules: importedPackage.rules,
    monitorReportParam: buildMonitorReportParam(taskName),
  };
  process.stderr.write(`[task] creating ${actualTaskName} via monitor/add API.\n`);
  process.stderr.write(`[task] monitor/add payload (no rules): ${JSON.stringify({ ...monitorAddPayload, rules: `[${importedPackage.rules.length} rules]` })}\n`);
  process.stderr.write(`[task] monitor/add rules payload: ${JSON.stringify(importedPackage.rules)}\n`);
  const addResponse =
    (await postTaskApi<{
      success?: boolean;
      message?: string;
      data?: number | string;
      result?: number | string;
    }>(page, "/dassets/v1/valid/monitor/add", monitorAddPayload)) ?? {};

  if (!addResponse.success) {
    process.stderr.write(`[task] monitor/add FULL response: ${JSON.stringify(addResponse)}\n`);
    throw new Error(
      `Task API create failed for "${actualTaskName}": ${addResponse.message ?? "unknown error"}`,
    );
  }
  process.stderr.write(`[task] api create succeeded for ${actualTaskName}.\n`);
}

export function getTableRowByTaskName(page: Page, taskName: string): Locator {
  return page
    .locator(TABLE_ROWS)
    .filter({ hasText: resolveTaskName(taskName) })
    .first();
}

async function hasTaskRowInListUi(page: Page, taskName: string, timeout = 5000): Promise<boolean> {
  const row = getTableRowByTaskName(page, taskName);
  return row.isVisible({ timeout }).catch(() => false);
}

export async function waitForTaskMonitorReady(
  page: Page,
  taskName: string,
  timeout = 90000,
): Promise<void> {
  if (isOfflineMode()) {
    await ensureOfflineTasks(page, [taskName]);
    return;
  }
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      if (await hasTaskMonitorRow(page, taskName)) {
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/HTTP (502|503|504)\b/.test(message)) {
        throw error;
      }
    }
    if (await hasTaskRowInListUi(page, taskName, 2000)) {
      return;
    }
    await page.waitForTimeout(5000);
  }

  throw new Error(`Task "${resolveTaskName(taskName)}" did not appear in monitor API within ${timeout}ms`);
}

async function openQualityRoute(page: Page, path: string): Promise<void> {
  if (isOfflineMode()) {
    if (path.startsWith("/dq/rule")) {
      await gotoOfflineRuleTaskList(page);
      return;
    }
    if (path.startsWith("/dq/qualityReport")) {
      await gotoOfflineQualityReport(page);
      return;
    }
    await gotoOfflineValidationResults(page);
    return;
  }
  await applyRuntimeCookies(page);
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  const targetUrl = buildDataAssetsUrl(path, effectiveProjectId);
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.locator("body").waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    await injectProjectContext(page, effectiveProjectId);
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.locator("body").waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(1000);

    const pageText = await page.locator("body").innerText().catch(() => "");
    if (!page.url().startsWith("chrome-error://") && !/HTTP ERROR 502|Bad Gateway/i.test(pageText)) {
      return;
    }

    if (attempt === 4) {
      throw new Error(`Quality route "${path}" is unavailable: ${pageText.slice(0, 200)}`);
    }
    await page.waitForTimeout(2000 * attempt);
  }
}

export async function gotoRuleTaskList(page: Page): Promise<void> {
  await openQualityRoute(page, "/dq/rule");
}

async function gotoRuleTaskCreate(page: Page): Promise<void> {
  await enableCompatibleMonitorDatasourceRouting(page);
  await openQualityRoute(page, "/dq/rule/add");
}

export async function gotoValidationResults(page: Page): Promise<void> {
  if (isOfflineMode()) {
    await gotoOfflineValidationResults(page);
    return;
  }
  await openQualityRoute(page, "/dq/overview");
  await navigateViaMenu(page, ["数据质量", "校验结果查询"]);
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
}

export async function gotoQualityReport(page: Page): Promise<void> {
  if (isOfflineMode()) {
    await gotoOfflineQualityReport(page);
    return;
  }
  await openQualityRoute(page, "/dq/qualityReport?tab=REPORT_GENERATE");
  const generatedTab = page.getByRole("tab", { name: "已生成报告" }).first();
  if (await generatedTab.isVisible().catch(() => false)) {
    await generatedTab.click();
  }
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
}

async function ensureBaseData(page: Page): Promise<void> {
  const datasource = getCurrentDatasource();
  if (preconditionReadyDatasources.has(datasource.cacheKey)) {
    return;
  }
  await runPreconditions(page);
  preconditionReadyDatasources.add(datasource.cacheKey);
}

/**
 * After creating a rule set, the server processes the package/rule records asynchronously.
 * The `ruleTypes` API only returns results once the server has indexed the rules (~1-2 minutes).
 * This function polls until the package is indexed or the timeout is exceeded.
 */
async function waitForRuleSetPackageIndexed(
  page: Page,
  tableName: string,
  packageName: string,
  timeoutMs = 180000,
): Promise<void> {
  const datasource = getCurrentDatasource();
  const dataSourceId = Number((await getProjectDatasource(page).catch(() => null))?.id ?? NaN);
  if (!Number.isFinite(dataSourceId)) {
    process.stderr.write(`[ruleset] waitForIndexed: could not resolve datasource id, skipping wait.\n`);
    return;
  }

  // Build schema name candidates (e.g. "pw_test" → ["pw_test", "pw"])
  const strippedWaitDb = datasource.database.replace(/_test$/, "");
  const waitSchemaCandidates = [datasource.database, strippedWaitDb].filter(
    (v, i, a) => v && a.indexOf(v) === i,
  );

  const deadline = Date.now() + timeoutMs;
  let checkedPackageId: number | null = null;

  while (Date.now() < deadline) {
    await page.waitForTimeout(10000);

    // Find the package ID for the newly created rule set (try all schema name candidates)
    let packageRow: RulePackageRow | undefined;
    for (const schemaCandidate of waitSchemaCandidates) {
      const packageListResponse =
        (await postTaskApi<{ success?: boolean; data?: RulePackageRow[] }>(
          page,
          "/dassets/v1/valid/monitorRulePackage/ruleSetList",
          {
            dataSourceId,
            tableName,
            schemaName: schemaCandidate,
          },
        ).catch(() => null)) ?? {};
      packageRow = (packageListResponse.data ?? []).find((item) => item.packageName === packageName);
      if (packageRow) break;
    }
    const resolvedId = packageRow?.packageId ?? packageRow?.id;
    if (!packageRow || !resolvedId) {
      process.stderr.write(`[ruleset] waitForIndexed: package "${packageName}" not yet visible in ruleSetList.\n`);
      continue;
    }
    const pkgId = Number(resolvedId);
    checkedPackageId = pkgId;

    let ruleTypeApiError: unknown = null;
    const ruleTypeResponse =
      (await postTaskApi<{ success?: boolean; data?: RuleTypeRow[] }>(
        page,
        "/dassets/v1/valid/monitorRulePackage/ruleTypes",
        { packageIdList: [pkgId] },
      ).catch((err) => { ruleTypeApiError = err; return null; })) ?? {};
    if (ruleTypeApiError) {
      process.stderr.write(
        `[ruleset] waitForIndexed: ruleTypes API error: ${ruleTypeApiError instanceof Error ? ruleTypeApiError.message.slice(0, 200) : String(ruleTypeApiError).slice(0, 200)}\n`,
      );
    }
    const ruleTypes = (ruleTypeResponse.data ?? [])
      .map((item) => parseRuleTypeValue(item))
      .filter((value) => Number.isFinite(value));

    if (ruleTypes.length > 0) {
      process.stderr.write(
        `[ruleset] package "${packageName}" (id=${pkgId}) indexed successfully with ruleTypes=${JSON.stringify(ruleTypes)}.\n`,
      );
      return;
    }
    process.stderr.write(
      `[ruleset] package "${packageName}" (id=${pkgId}) not yet indexed: ruleTypeResponse=${JSON.stringify(ruleTypeResponse).slice(0, 200)}\n`,
    );
  }
  process.stderr.write(
    `[ruleset] waitForIndexed timed out after ${timeoutMs}ms for package "${packageName}" (lastCheckedId=${checkedPackageId}). Proceeding anyway.\n`,
  );
}

async function ensureSupportingRuleSet(
  page: Page,
  config: SupportingRuleSetConfig | undefined,
): Promise<void> {
  if (!config) {
    return;
  }
  await gotoRuleSetList(page);
  let reuseExistingRuleSet = false;
  await deleteRuleSetsByTableNames(page, [config.tableName]).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!/HTTP (502|503|504)\b/.test(message)) {
      throw error;
    }
    process.stderr.write(
      `[ruleset] delete for ${config.tableName} hit gateway error, reusing existing rulesets.\n`,
    );
    reuseExistingRuleSet = true;
  });
  if (reuseExistingRuleSet) {
    return;
  }
  const UNSTABLE_RULESET_RE =
    /(HTTP (502|503|504)\b|Timeout \d+ms exceeded|ETIMEDOUT|Rule set create page is unavailable|waiting for locator\('.ant-form-item'.*选择数据源)/;
  for (let createAttempt = 1; createAttempt <= 3; createAttempt += 1) {
    let createFailed = false;
    await createRuleSetForTable(page, config.tableName, config.packageName, config.ruleConfig, "有效性校验")
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        if (!UNSTABLE_RULESET_RE.test(message)) {
          throw error;
        }
        process.stderr.write(
          `[ruleset] create attempt ${createAttempt} for ${config.tableName} hit unstable state: ${message.slice(0, 120)}. Will retry if possible.\n`,
        );
        createFailed = true;
      });
    if (!createFailed) {
      process.stderr.write(`[ruleset] create succeeded for ${config.tableName} (attempt ${createAttempt}).\n`);
      await waitForRuleSetPackageIndexed(page, config.tableName, config.packageName);
      return;
    }
    if (createAttempt < 3) {
      await page.waitForTimeout(3000 * createAttempt);
      await gotoRuleSetList(page).catch(() => undefined);
    }
  }
  process.stderr.write(
    `[ruleset] all create attempts failed for ${config.tableName}, proceeding without guaranteed rule set.\n`,
  );
}

async function deleteTasksByNames(page: Page, taskNames: string[]): Promise<void> {
  if (taskNames.length === 0) {
    return;
  }
  const actualTaskNames = taskNames.map((taskName) => resolveTaskName(taskName));
  const rows: MonitorListRow[] = [];

  for (let pageIndex = 1; pageIndex <= 20; pageIndex += 1) {
    const listResponse =
      (await postTaskApi<{
        data?: { data?: MonitorListRow[]; contentList?: MonitorListRow[]; list?: MonitorListRow[] };
      }>(page, "/dassets/v1/valid/monitor/pageQuery", {
        pageIndex,
        pageSize: TASK_API_PAGE_SIZE,
      })) ?? {};

    const pageRows = extractMonitorRows(listResponse);
    rows.push(...pageRows.filter((row) => actualTaskNames.includes(getMonitorName(row))));
    if (pageRows.length < TASK_API_PAGE_SIZE) {
      break;
    }
  }

  for (const row of rows) {
    const monitorId = getMonitorId(row);
    if (monitorId === null) {
      continue;
    }
    await postTaskApi(page, "/dassets/v1/valid/monitor/delete", {
      monitorId,
    });
  }

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const existingRows = await Promise.all(
      taskNames.map(async (taskName) => {
        try {
          await getTaskMonitorRow(page, taskName);
          return true;
        } catch {
          return false;
        }
      }),
    );
    if (existingRows.every((exists) => !exists)) {
      return;
    }
    await page.waitForTimeout(2000);
  }
}

async function fillTaskBaseInfo(
  page: Page,
  taskName: string,
  config: TaskSetupConfig,
): Promise<void> {
  const datasource = getCurrentDatasource();
  const ruleNameInput = page
    .locator(".ant-form-item")
    .filter({ hasText: /^规则名称/ })
    .locator("input")
    .first();
  await ruleNameInput.waitFor({ state: "visible", timeout: 10000 });
  await ruleNameInput.fill(resolveTaskName(taskName));

  const sourceFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据源/ })
    .first();
  await selectAntOption(
    page,
    sourceFormItem.locator(".ant-select").first(),
    datasource.optionPattern,
  );

  const schemaFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据库/ })
    .first();
  await selectAntOption(page, schemaFormItem.locator(".ant-select").first(), datasource.database);
  await page.waitForTimeout(1000);

  const tableFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据表/ })
    .first();
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

  const nextButton = page.getByRole("button", { name: "下一步" }).first();
  const rulePackageFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /规则包/ })
    .first();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await nextButton.click();
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
    await page.waitForTimeout(1500 * (attempt + 1));
    if (await rulePackageFormItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      return;
    }
  }

  const visibleErrors = await page
    .locator(".ant-form-item-explain-error:visible, .ant-message-notice, .ant-notification-notice")
    .allTextContents()
    .catch(() => [] as string[]);
  const pageText = await page
    .locator("body")
    .innerText()
    .catch(() => "");
  throw new Error(
    `Task form did not advance to rule package step. Visible errors: ${
      visibleErrors.join(" | ") || "none"
    }. Page text: ${pageText.slice(0, 500)}`,
  );
}

async function importRulePackage(page: Page, packageName: string): Promise<void> {
  const packageSelect = page
    .locator(".ant-form-item")
    .filter({ hasText: /规则包/ })
    .first()
    .locator(".ant-select")
    .first();

  let availableOptions: string[] = [];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await packageSelect.locator(".ant-select-selector").click();
    await page.waitForTimeout(500);

    const dropdown = page.locator(".ant-select-dropdown:visible").last();
    await dropdown.waitFor({ state: "visible", timeout: 10000 });

    const packageOption = dropdown
      .locator(".ant-select-item-option")
      .filter({ hasText: packageName })
      .first();
    if (await packageOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await packageOption.click();
      await page.waitForTimeout(1000);
      availableOptions = [];
      break;
    }

    availableOptions = await dropdown
      .locator(".ant-select-item-option")
      .allTextContents()
      .then((items) => items.map((item) => item.trim()).filter(Boolean));

    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(1000 * (attempt + 1));
  }

  if (availableOptions.length > 0) {
    throw new Error(`Task package "${packageName}" not found. Available: ${availableOptions.join(" | ")}`);
  }

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
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
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
  const actualTaskName = resolveTaskName(taskName);
  await page.getByRole("button", { name: "下一步" }).last().click();
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
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
    await reportNameInput.fill(`${actualTaskName}_report`);
  }

  const dataCycleInputs = page
    .locator(".ant-form-item")
    .filter({ hasText: /数据日期|数据周期/ })
    .locator("input");
  if (
    await dataCycleInputs
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await dataCycleInputs.nth(0).fill("1");
    await dataCycleInputs.nth(1).fill("0");
  }

  const needCarNoRadio = page
    .locator(".ant-form-item")
    .filter({ hasText: /是否需要车辆信息/ })
    .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
    .filter({ hasText: /^否$/ })
    .first();
  if (await needCarNoRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
    await needCarNoRadio.click();
    await page.waitForTimeout(300);
  }

  const saveResponsePromise = page
    .waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/valid/monitor/add") ||
      response.url().includes("/dassets/v1/valid/monitor/edit"),
    )
    .catch(() => null);
  const createButton = page.getByRole("button", { name: /新\s*建|保\s*存/ }).last();
  await createButton.click();
  await page.waitForTimeout(1000);

  const confirmModal = page.locator(".ant-modal:visible, .ant-modal-confirm:visible").last();
  if (await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    const confirmButton = confirmModal.getByRole("button", { name: /确\s*认|确\s*定/ }).first();
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
  }

  const saveResponse = await saveResponsePromise;
  if (!saveResponse) {
    const visibleErrors = await page
      .locator(".ant-form-item-explain-error:visible")
      .allTextContents()
      .catch(() => [] as string[]);
    throw new Error(
      `Task save request was not triggered. Visible errors: ${visibleErrors.join(" | ") || "none"}`,
    );
  }

  const saveResult = (await saveResponse.json().catch(() => null)) as { success?: boolean } | null;
  if (!saveResult?.success) {
    throw new Error(`Task save failed via ${saveResponse.url()}`);
  }

  await page.waitForURL(/#\/dq\/rule(?:\?|$)/, { timeout: 15000 });
}

async function createTask(page: Page, taskName: string, config: TaskSetupConfig): Promise<void> {
  await createTaskViaApi(page, taskName, config);
  if (await hasTaskMonitorRow(page, taskName)) {
    return;
  }
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      await getTaskMonitorRow(page, taskName);
      return;
    } catch {
      await page.waitForTimeout(2000);
    }
  }
  throw new Error(
    `Created task "${taskName}" was not returned by monitor pageQuery within 30000ms`,
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

export async function ensureRuleTasks(page: Page, taskNames: string[]): Promise<void> {
  if (isOfflineMode()) {
    await ensureOfflineTasks(page, taskNames);
    for (const taskName of taskNames) {
      preparedTasks.add(resolveTaskName(taskName));
    }
    return;
  }
  await ensureBaseData(page);

  for (const taskName of taskNames) {
    const actualTaskName = resolveTaskName(taskName);
    if (preparedTasks.has(actualTaskName) && (await hasTaskMonitorRow(page, taskName))) {
      continue;
    }

    preparedTasks.delete(actualTaskName);
    executedTasks.delete(actualTaskName);
    readyQualityReports.delete(actualTaskName);

    const config = TASK_SETUP_CONFIGS[taskName];
    if (!config) {
      throw new Error(`Unsupported task setup: ${taskName}`);
    }

    if (config.supportingRuleSet) {
      await ensureSupportingRuleSet(page, config.supportingRuleSet);
    }

    await gotoRuleTaskList(page);
    let reuseExistingTask = false;
    await deleteTasksByNames(page, [taskName]).catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (!/HTTP (502|503|504)\b/.test(message)) {
        throw error;
      }
      reuseExistingTask =
        (await hasTaskMonitorRow(page, taskName).catch(() => false)) ||
        (await hasTaskRowInListUi(page, taskName, 3000));
      process.stderr.write(
        reuseExistingTask
          ? `[task] delete for ${actualTaskName} hit gateway error, reusing existing task.\n`
          : `[task] delete for ${actualTaskName} hit gateway error and no existing task was found, creating a new task.\n`,
      );
    });
    if (!reuseExistingTask) {
      await createTask(page, taskName, config);
    }
    await waitForTaskMonitorReady(page, taskName);
    preparedTasks.add(actualTaskName);
  }
}

async function getTaskMonitorRow(page: Page, taskName: string): Promise<MonitorListRow> {
  const actualTaskName = resolveTaskName(taskName);

  for (let pageIndex = 1; pageIndex <= 20; pageIndex += 1) {
    const listResponse =
      (await postTaskApi<{
        data?: { data?: MonitorListRow[]; contentList?: MonitorListRow[]; list?: MonitorListRow[] };
      }>(page, "/dassets/v1/valid/monitor/pageQuery", {
        pageIndex,
        pageSize: TASK_API_PAGE_SIZE,
      })) ?? {};

    const pageRows = extractMonitorRows(listResponse);
    const taskRow = pageRows.find((row) => getMonitorName(row) === actualTaskName);
    if (taskRow) {
      return taskRow;
    }
    if (pageRows.length < TASK_API_PAGE_SIZE) {
      break;
    }
  }

  throw new Error(`Task "${actualTaskName}" not found in monitor list`);
}

async function getTaskInstanceRecord(page: Page, taskName: string): Promise<MonitorListRow | null> {
  const actualTaskName = resolveTaskName(taskName);
  const listResponse =
    (await postTaskApi<{
      data?: { data?: MonitorListRow[]; contentList?: MonitorListRow[]; list?: MonitorListRow[] };
    }>(page, "/dassets/v1/valid/monitorRecord/pageQuery", {
      pageIndex: 1,
      pageSize: 20,
      name: actualTaskName,
    })) ?? {};

  return (
    extractMonitorRows(listResponse).find((row) => getMonitorName(row) === actualTaskName) ?? null
  );
}

async function listBatchRuns(page: Page, jobKey: string): Promise<BatchRunRecord[]> {
  const response =
    (await postBatchApi<{
      success?: boolean;
      data?: BatchRunRecord[];
    }>(page, "/api/rdos/batch/batchServerLog/runNumList", {
      jobId: jobKey,
      pageInfo: 1,
    })) ?? {};

  return response.success && Array.isArray(response.data) ? response.data : [];
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
    throw new Error(
      `Failed to load task detail for "${taskName}": ${response.message ?? "unknown error"}`,
    );
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
    throw new Error(
      `Failed to load config quality report detail ${reportId}: ${response.message ?? "unknown error"}`,
    );
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

async function waitForConfigReport(
  page: Page,
  taskName: string,
  timeout = 60000,
): Promise<ConfigReportRow> {
  const reportName = getReportName(taskName);
  const actualTaskName = resolveTaskName(taskName);
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const response =
      (await postQualityReportApi<{
        data?: { contentList?: ConfigReportRow[] };
      }>(page, "/dassets/v1/valid/monitorReport/page", {
        current: 1,
        size: 20,
        reportName: actualTaskName,
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

async function listGeneratedQualityReports(
  page: Page,
  taskName: string,
): Promise<GeneratedReportRow[]> {
  const actualTaskName = resolveTaskName(taskName);
  const response =
    (await postQualityReportApi<{
      data?: { contentList?: GeneratedReportRow[] };
    }>(page, "/dassets/v1/valid/monitorReportRecord/pageList", {
      current: 1,
      size: 50,
      search: actualTaskName,
    })) ?? {};

  return (response.data?.contentList ?? []).filter(
    (item) => item.reportName === getReportName(taskName),
  );
}

async function ensureQualityReportConfig(page: Page, taskName: string): Promise<void> {
  const actualTaskName = resolveTaskName(taskName);
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
    throw new Error(`Task "${actualTaskName}" detail is missing report schedule config`);
  }

  const table = (
    taskDetail.monitorReportDetailDTO?.reportRelationTables ?? configRow.reportRelationTables
  )
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
              ruleName: actualTaskName,
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
    throw new Error(
      `Config quality report "${getReportName(taskName)}" still misses schedule config after repair`,
    );
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
  if (isOfflineMode()) {
    await markOfflineTaskExecuted(page, taskName);
    executedTasks.add(resolveTaskName(taskName));
    return;
  }
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

  const successMessage = page.locator(
    ".ant-message-notice, .ant-notification-notice, .ant-message",
  );
  await expect(successMessage.filter({ hasText: /执行|提交|成功/ }).first()).toBeVisible({
    timeout: 10000,
  });
}

export async function openTaskInstanceDetail(page: Page, instanceRow: Locator): Promise<Locator> {
  if (isOfflineMode()) {
    return openOfflineTaskInstanceDetail(page, instanceRow);
  }
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

  const ruleCard = detailDrawer
    .locator(".ruleView")
    .filter({ hasText: "取值范围&枚举范围" })
    .first();
  await expect(ruleCard).toBeVisible({ timeout: 20000 });
  return detailDrawer;
}

export function getTaskDetailRuleCard(drawer: Locator, ruleName: string): Locator {
  return drawer.locator(".ruleView").filter({ hasText: ruleName }).first();
}

export async function openTaskRuleDetailDataDrawer(
  page: Page,
  detailDrawer: Locator,
): Promise<Locator> {
  if (isOfflineMode()) {
    return openOfflineTaskRuleDetailDataDrawer(page, detailDrawer);
  }
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
  if (isOfflineMode()) {
    await markOfflineTaskExecuted(page, taskName);
    executedTasks.add(resolveTaskName(taskName));
    await gotoOfflineValidationResults(page);
    const row = getTableRowByTaskName(page, taskName);
    await expect(row).toBeVisible({ timeout: Math.min(timeout, 10000) });
    return row;
  }
  await gotoValidationResults(page);
  const actualTaskName = resolveTaskName(taskName);
  const deadline = Date.now() + timeout;
  const batchStableThresholdMs = 15_000;
  let finishedBatchRun: BatchRunRecord | null = null;
  let finishedBatchDetectedAt = 0;

  while (Date.now() < deadline) {
    const instanceRow = getTableRowByTaskName(page, taskName);
    const visible = await instanceRow.isVisible({ timeout: 2000 }).catch(() => false);
    const rowText = visible ? await instanceRow.innerText().catch(() => "") : "";
    if (
      canUseFinishedTaskRow({
        rowVisible: visible,
        rowText,
        batchFinished: false,
        batchFinishedStableMs: 0,
        stableThresholdMs: batchStableThresholdMs,
      })
    ) {
      return instanceRow;
    }

    const taskRecord = await getTaskInstanceRecord(page, taskName);
    const jobKey = String(taskRecord?.jobKey ?? "");
    if (jobKey) {
      const latestRun = [...(await listBatchRuns(page, jobKey))]
        .filter((run) => Number.isFinite(run.runNum))
        .sort((left, right) => Number(right.runNum ?? 0) - Number(left.runNum ?? 0))[0];

      if (latestRun?.execEndTime) {
        if (!finishedBatchRun || finishedBatchRun.runNum !== latestRun.runNum) {
          finishedBatchRun = latestRun;
          finishedBatchDetectedAt = Date.now();
        }

        if (
          canUseFinishedTaskRow({
            rowVisible: visible,
            rowText,
            batchFinished: true,
            batchFinishedStableMs: Date.now() - finishedBatchDetectedAt,
            stableThresholdMs: batchStableThresholdMs,
          })
        ) {
          return instanceRow;
        }
      }
    }

    await page.waitForTimeout(5000);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
  }

  throw new Error(`Task instance "${actualTaskName}" did not finish within ${timeout}ms`);
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
  if (isOfflineMode()) {
    await ensureRuleTasks(page, taskNames);
    for (const taskName of taskNames) {
      await markOfflineTaskExecuted(page, taskName);
      executedTasks.add(resolveTaskName(taskName));
    }
    return;
  }
  await ensureRuleTasks(page, taskNames);

  for (const taskName of taskNames) {
    const actualTaskName = resolveTaskName(taskName);
    if (executedTasks.has(actualTaskName)) {
      continue;
    }
    await executeTaskAndWaitForResult(page, taskName);
    executedTasks.add(actualTaskName);
  }
}

export async function waitForQualityReportRow(
  page: Page,
  taskName: string,
  timeout = 180000,
): Promise<Locator> {
  if (isOfflineMode()) {
    await markOfflineReportReady(page, taskName);
    readyQualityReports.add(resolveTaskName(taskName));
    await gotoOfflineQualityReport(page);
    const row = getTableRowByTaskName(page, getReportName(taskName));
    await expect(row).toBeVisible({ timeout: Math.min(timeout, 10000) });
    return row;
  }
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

async function waitForGeneratedQualityReport(
  page: Page,
  taskName: string,
  timeout = 900000,
): Promise<void> {
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
  if (isOfflineMode()) {
    await ensureRuleTasks(page, taskNames);
    for (const taskName of taskNames) {
      await markOfflineReportReady(page, taskName);
      executedTasks.add(resolveTaskName(taskName));
      readyQualityReports.add(resolveTaskName(taskName));
    }
    await gotoOfflineQualityReport(page);
    return;
  }
  await ensureRuleTasks(page, taskNames);

  for (const taskName of taskNames) {
    const actualTaskName = resolveTaskName(taskName);
    await ensureQualityReportConfig(page, taskName);
    if (!executedTasks.has(actualTaskName)) {
      await executeTaskAndWaitForResult(page, taskName, 600000);
      executedTasks.add(actualTaskName);
    }
    if (readyQualityReports.has(actualTaskName)) {
      continue;
    }
    await triggerQualityReportToday(page, taskName);
    await waitForGeneratedQualityReport(page, taskName);
    await waitForQualityReportRow(page, taskName);
    readyQualityReports.add(actualTaskName);
  }
}

export async function openQualityReportDetail(page: Page, taskName: string): Promise<Locator> {
  if (isOfflineMode()) {
    await markOfflineReportReady(page, taskName);
    return openOfflineQualityReportDetail(page, taskName);
  }
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

export async function openQualityReportRuleDetail(page: Page, ruleRow: Locator): Promise<Locator> {
  if (isOfflineMode()) {
    const taskName =
      (await page.locator(".qualityInspection").first().getAttribute("data-task-name")) ??
      "task_15695_enum_fail";
    return openOfflineQualityReportRuleDetail(page, taskName);
  }
  await suppressGuideOverlay(page);
  await ruleRow.getByRole("button", { name: "查看详情" }).first().click({ force: true });
  const dataDrawer = page.locator(".ant-drawer:visible").last();
  await expect(dataDrawer).toBeVisible({ timeout: 10000 });
  return dataDrawer;
}
