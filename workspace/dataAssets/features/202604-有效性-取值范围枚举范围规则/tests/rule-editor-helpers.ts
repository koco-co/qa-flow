import { expect, type Locator, type Page } from "@playwright/test";

import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
  confirmAntModal,
  normalizeDataAssetsBaseUrl,
  selectAntOption,
} from "../../helpers/test-setup";
import {
  DORIS3X_SOURCE_TYPE,
  DORIS3X_SOURCE_TYPE_NAME,
  getCurrentDatasource,
  injectProjectContext,
  resolveEffectiveQualityProjectId,
  runPreconditions,
} from "./test-data";
import {
  addOfflineRuleToPackage,
  cloneOfflineRule,
  configureOfflineRule,
  deleteOfflineRule,
  deleteOfflineRuleSetsByTableNames,
  gotoOfflineRuleBase,
  gotoOfflineRuleSetCreate,
  gotoOfflineRuleSetList,
  isOfflineMode,
  openOfflineRuleSetEditor,
  saveOfflineRuleSet,
  setOfflineRuleFieldAndFunction,
} from "./offline-suite-helper";
import {
  matchesDatasourceCandidate,
  rankDatasourceCandidates,
} from "./datasource-candidates";
import { pollReadiness } from "./page-readiness";

export interface RangeConfig {
  firstOperator?: string;
  firstValue?: string;
  condition?: "且" | "或";
  secondOperator?: string;
  secondValue?: string;
}

export interface RangeEnumConfig {
  field: string;
  functionName?: string;
  range?: RangeConfig;
  enumOperator?: string;
  enumValues?: string[];
  relation?: "且" | "或";
  ruleStrength?: "强规则" | "弱规则";
  description?: string;
}

const RULESET_ROW_FALLBACKS: Record<string, string> = {
  ruleset_15695_and: "quality_test_num",
  ruleset_15695_enum: "quality_test_num",
  ruleset_15695_enum_orig: "quality_test_num",
  ruleset_15695_filter: "quality_test_num",
  ruleset_15695_notin: "quality_test_num",
  ruleset_15695_or: "quality_test_num",
  ruleset_15695_range: "quality_test_num",
  ruleset_15695_str: "quality_test_str",
};

const compatibleDorisRoutingPages = new WeakSet<Page>();
const RETRYABLE_HTTP_STATUS = new Set([502, 503, 504]);
let cachedCompatibleMonitorDatasourcePayload: {
  data?: MonitorDatasourceItem[];
} | null = null;

type MonitorDatasourceItem = {
  id?: string;
  dataSourceName?: string;
  dtCenterSourceName?: string;
  sourceTypeValue?: string;
  dataSourceType?: number;
  sourceType?: number;
  type?: number;
};

function patchCompatibleDorisSource<T extends MonitorDatasourceItem>(
  item: T,
): T {
  const datasource = getCurrentDatasource();
  if (datasource.preconditionType !== "Doris") {
    return item;
  }

  const searchableText = `${String(item.dataSourceName ?? "")} ${String(item.dtCenterSourceName ?? "")}`;
  if (!datasource.optionPattern.test(searchableText)) {
    return item;
  }

  return {
    ...item,
    dataSourceType: DORIS3X_SOURCE_TYPE,
    sourceType: DORIS3X_SOURCE_TYPE,
    type: DORIS3X_SOURCE_TYPE,
    sourceTypeValue: DORIS3X_SOURCE_TYPE_NAME,
  };
}

async function requestJsonWithRetries<T>(
  page: Page,
  requestUrl: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<T> {
  let lastError: Error | null = null;
  const sanitizedHeaders = Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) => !["content-length", "host"].includes(name.toLowerCase()),
    ),
  );

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await page.context().request.post(requestUrl, {
        data: body,
        headers: sanitizedHeaders,
        timeout: 15_000,
      });
      const text = await response.text();
      if (response.ok()) {
        if (!text.trim()) {
          return {} as T;
        }
        return JSON.parse(text) as T;
      }

      lastError = new Error(
        `HTTP ${response.status()} ${response.statusText()} from ${requestUrl}: ${text.slice(0, 200)}`,
      );
      if (!RETRYABLE_HTTP_STATUS.has(response.status()) || attempt === 4) {
        throw lastError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === 4) {
        throw lastError;
      }
    }

    await page.waitForTimeout(1000 * attempt);
  }

  throw lastError ?? new Error(`Request failed: ${requestUrl}`);
}

/**
 * Pre-warms the monitor datasource cache by fetching the list via Node.js API (bypasses route
 * handlers). This ensures the route handler always takes the fast-path on first browser request,
 * preventing the browser from blocking while the slow API call runs in the handler.
 */
async function prewarmMonitorDatasourceCache(page: Page): Promise<void> {
  if (cachedCompatibleMonitorDatasourcePayload) {
    return; // already cached
  }
  const datasource = getCurrentDatasource();
  const baseUrl = normalizeDataAssetsBaseUrl();
  const shouldValidateSchema = datasource.preconditionType === "Doris";
  const strippedDatabase = datasource.database.replace(/_test$/, "");
  const schemaCandidates = [datasource.database, strippedDatabase].filter(
    (v, i, a) => v && a.indexOf(v) === i,
  );

  // Try monitor/list first
  const monitorListUrls = [
    new URL("/dmetadata/v1/dataSource/monitor/list", baseUrl).toString(),
    new URL("/dassets/v1/dataSource/monitor/list", baseUrl).toString(),
  ];
  for (const monitorUrl of monitorListUrls) {
    const monitorResponse = await postProjectApi<{
      data?: MonitorDatasourceItem[];
    }>(page, monitorUrl, {}).catch(() => null);
    const monitorItems = Array.isArray(monitorResponse?.data)
      ? monitorResponse!.data!
      : [];
    if (monitorItems.length > 0) {
      const rankedMonitorItems = rankCurrentDatasources(monitorItems);
      // For Doris: validate that at least one item has the required schema.
      // If none do, we don't cache this result and instead look via pageQuery for the correct datasource.
      if (shouldValidateSchema) {
        const candidateItems =
          rankedMonitorItems.length > 0 ? rankedMonitorItems : monitorItems;
        let schemaValidItem: MonitorDatasourceItem | undefined;
        for (const item of candidateItems) {
          if (!item.id) continue;
          const hasSchema = await getDatasourceSchemas(page, item.id)
            .then((schemas) =>
              schemas.some((s) => schemaCandidates.includes(s)),
            )
            .catch(() => false);
          if (hasSchema) {
            schemaValidItem = item;
            break;
          }
        }
        if (schemaValidItem) {
          const patchedPayload = {
            ...monitorResponse,
            data: [patchCompatibleDorisSource(schemaValidItem)],
          };
          cachedCompatibleMonitorDatasourcePayload = patchedPayload;
          process.stderr.write(
            `[ruleset] monitor datasource cache primed from ${monitorUrl} (schema-validated: "${schemaValidItem.dataSourceName ?? schemaValidItem.dtCenterSourceName}").\n`,
          );
          return;
        }
        process.stderr.write(
          `[ruleset] monitor datasource found in ${monitorUrl} but none have schema "${datasource.database}". Checking pageQuery.\n`,
        );
      } else if (rankedMonitorItems.length > 0) {
        const patchedPayload = {
          ...monitorResponse,
          data: [patchCompatibleDorisSource(rankedMonitorItems[0]!)],
        };
        cachedCompatibleMonitorDatasourcePayload = patchedPayload;
        process.stderr.write(
          `[ruleset] monitor datasource cache primed from ${monitorUrl} (${rankedMonitorItems[0]!.dataSourceName ?? rankedMonitorItems[0]!.dtCenterSourceName}).\n`,
        );
        return;
      }
    }
  }

  // monitor/list returned empty or no schema-valid item — try pageQuery fallback
  const pageQueryUrl = new URL(
    "/dassets/v1/dataSource/pageQuery",
    baseUrl,
  ).toString();
  const pageQueryResponse = await postProjectApi<{
    data?: { contentList?: MonitorDatasourceItem[] };
  }>(page, pageQueryUrl, { current: 1, size: 200, search: "" }).catch(
    () => null,
  );
  const matchingItems = rankCurrentDatasources(
    pageQueryResponse?.data?.contentList ?? [],
  );

  let fallbackItem: MonitorDatasourceItem | undefined;
  if (shouldValidateSchema) {
    for (const item of matchingItems) {
      if (!item.id) continue;
      const hasSchema = await getDatasourceSchemas(page, item.id)
        .then((schemas) => schemas.some((s) => schemaCandidates.includes(s)))
        .catch(() => false);
      if (hasSchema) {
        fallbackItem = item;
        process.stderr.write(
          `[ruleset] pageQuery found schema-valid datasource "${item.dataSourceName ?? item.dtCenterSourceName}" (id=${item.id}).\n`,
        );
        break;
      }
    }
    if (!fallbackItem) {
      fallbackItem = matchingItems[0];
      if (fallbackItem) {
        process.stderr.write(
          `[ruleset] WARN: no pageQuery datasource has schema "${datasource.database}". Using first match.\n`,
        );
      }
    }
  } else {
    fallbackItem = matchingItems[0];
  }

  if (fallbackItem) {
    const patchedPayload = { data: [patchCompatibleDorisSource(fallbackItem)] };
    cachedCompatibleMonitorDatasourcePayload = patchedPayload;
    process.stderr.write(
      `[ruleset] monitor datasource cache primed from pageQuery fallback (${datasource.reportName}).\n`,
    );
    return;
  }

  // Nothing found — set empty sentinel so route handler still takes fast path (will pass through)
  cachedCompatibleMonitorDatasourcePayload = { data: [] };
  process.stderr.write(
    `[ruleset] monitor datasource cache primed with empty sentinel (no matching datasource found).\n`,
  );
}

export async function enableCompatibleMonitorDatasourceRouting(
  page: Page,
): Promise<void> {
  if (compatibleDorisRoutingPages.has(page)) {
    return;
  }

  // Pre-warm the cache before registering the route handler so the handler always takes the
  // fast path. Without this, concurrent browser XHR requests during page load would each
  // trigger slow API calls inside the handler, blocking page rendering for many minutes.
  await prewarmMonitorDatasourceCache(page);

  const handleCompatibleMonitorDatasourceRoute = async (
    route: import("@playwright/test").Route,
  ) => {
    // Always take fast path — cache is guaranteed to be populated by prewarmMonitorDatasourceCache.
    if (cachedCompatibleMonitorDatasourcePayload) {
      const payload = cachedCompatibleMonitorDatasourcePayload;
      // If cache has data, serve it; if empty sentinel, pass through to get real browser response.
      if (Array.isArray(payload.data) && payload.data.length === 0) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json;charset=UTF-8",
        body: JSON.stringify(payload),
      });
      return;
    }

    // Fallback (should not normally reach here after prewarm): pass through to avoid hanging.
    await route.continue();
  };

  await page.route(
    "**/dmetadata/v1/dataSource/monitor/list",
    handleCompatibleMonitorDatasourceRoute,
  );
  await page.route(
    "**/dassets/v1/dataSource/monitor/list",
    handleCompatibleMonitorDatasourceRoute,
  );

  compatibleDorisRoutingPages.add(page);
}

async function postProjectApi<T>(
  page: Page,
  path: string,
  body: unknown,
): Promise<T> {
  const requestUrl = /^https?:\/\//.test(path)
    ? path
    : new URL(path, normalizeDataAssetsBaseUrl()).toString();
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  return requestJsonWithRetries<T>(page, requestUrl, body, {
    "content-type": "application/json;charset=UTF-8",
    "Accept-Language": "zh-CN",
    "X-Valid-Project-ID": String(effectiveProjectId),
  });
}

type DatasourceItem = {
  id?: string;
  dataSourceName?: string;
  dtCenterSourceName?: string;
  sourceTypeValue?: string;
};

/**
 * Returns the list of schema names available for a datasource (via assets API).
 * The API returns string[] directly in data field.
 * Returns an empty array on error.
 */
async function getDatasourceSchemas(
  page: Page,
  datasourceId: string | number,
): Promise<string[]> {
  try {
    // The getAllSchema API returns data as string[] (schema names directly)
    const result = await postProjectApi<{
      data?: string[] | Array<{ name?: string; schemaName?: string }>;
    }>(page, "/dassets/v1/dataSource/getAllSchema", {
      sourceId: Number(datasourceId),
    });
    const data = result.data ?? [];
    if (data.length === 0) return [];
    // Handle both string[] and object[] responses
    if (typeof data[0] === "string") {
      return (data as string[]).filter(Boolean);
    }
    return (data as Array<{ name?: string; schemaName?: string }>)
      .map((s) => s.schemaName ?? s.name ?? "")
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Check if a datasource has any of the candidate schema names.
 */
async function datasourceHasCandidateSchema(
  page: Page,
  datasourceId: string | number,
  schemaCandidates: string[],
): Promise<boolean> {
  const schemas = await getDatasourceSchemas(page, datasourceId);
  return schemas.some((s) => schemaCandidates.includes(s));
}

type DatasourceTableItem = {
  tableName?: string;
  schemaName?: string;
  view?: string;
};

function matchesCurrentDatasource(
  item: MonitorDatasourceItem | DatasourceItem,
): boolean {
  return matchesDatasourceCandidate(item, getCurrentDatasource());
}

function rankCurrentDatasources<T extends MonitorDatasourceItem | DatasourceItem>(
  items: readonly T[],
): T[] {
  return rankDatasourceCandidates(items, getCurrentDatasource());
}

async function getCurrentMonitorDatasource(
  page: Page,
): Promise<MonitorDatasourceItem | undefined> {
  const cachedItems = cachedCompatibleMonitorDatasourcePayload?.data ?? [];
  const cachedMatch = rankCurrentDatasources(cachedItems).find((item) => item?.id);
  if (cachedMatch?.id) {
    return cachedMatch;
  }

  const response = await postProjectApi<{ data?: MonitorDatasourceItem[] }>(
    page,
    "/dmetadata/v1/dataSource/monitor/list",
    {},
  ).catch(() => null);

  return rankCurrentDatasources(response?.data ?? []).find((item) => item?.id);
}

async function getDatasourceTables(
  page: Page,
  datasourceId: string | number,
  schemaName: string,
  search?: string,
): Promise<string[]> {
  const result = await postProjectApi<{ data?: DatasourceTableItem[] }>(
    page,
    "/dassets/v1/dataSource/tablelist",
    {
      sourceId: Number(datasourceId),
      schemaName,
      ...(search ? { search } : {}),
    },
  );

  return (result.data ?? [])
    .map((item) => item.tableName ?? "")
    .filter(Boolean);
}

async function resolveSchemaForTable(
  page: Page,
  datasourceId: string | number,
  tableName: string,
  preferredSchemas: string[],
): Promise<string | null> {
  const allSchemas = await getDatasourceSchemas(page, datasourceId);
  const orderedSchemas = [...preferredSchemas, ...allSchemas].filter(
    (value, index, array) => Boolean(value) && array.indexOf(value) === index,
  );

  for (const schemaName of orderedSchemas) {
    const tableNames = await getDatasourceTables(
      page,
      datasourceId,
      schemaName,
      tableName,
    ).catch(() => []);
    if (tableNames.includes(tableName)) {
      return schemaName;
    }
  }

  return (
    preferredSchemas.find((schemaName) => allSchemas.includes(schemaName)) ??
    orderedSchemas[0] ??
    null
  );
}

async function ensureMonitorDatasource(page: Page): Promise<boolean> {
  const datasource = getCurrentDatasource();

  // For Doris, we validate the found datasource has the expected schema(s).
  // This prevents selecting the wrong Doris instance when multiple are available.
  const strippedDatabase = datasource.database.replace(/_test$/, "");
  const schemaCandidates = [datasource.database, strippedDatabase].filter(
    (v, i, a) => v && a.indexOf(v) === i,
  );
  const shouldValidateSchema = datasource.preconditionType === "Doris";

  const listMonitorDatasources = async () =>
    postProjectApi<{
      data?: DatasourceItem[];
    }>(page, "/dmetadata/v1/dataSource/monitor/list", {});

  const findMonitorDatasource = async () => {
    const response = await listMonitorDatasources();
    return rankCurrentDatasources(response.data ?? []).find((item) => item?.id);
  };

  let existingMonitorDatasource: DatasourceItem | undefined;
  try {
    existingMonitorDatasource = await findMonitorDatasource();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      !/(HTTP (502|503|504)\b|Timeout \d+ms exceeded|ETIMEDOUT)/.test(message)
    ) {
      throw error;
    }
    process.stderr.write(
      `[ruleset] monitor datasource check hit network error, continuing with existing datasource context.\n`,
    );
    return false;
  }

  if (existingMonitorDatasource) {
    // Validate that the existing monitor datasource has the required schema (Doris only).
    if (shouldValidateSchema && existingMonitorDatasource.id) {
      const hasSchema = await datasourceHasCandidateSchema(
        page,
        existingMonitorDatasource.id,
        schemaCandidates,
      );
      if (hasSchema) {
        // The existing datasource is correct.
        return false;
      }
      process.stderr.write(
        `[ruleset] existing monitor datasource (id=${existingMonitorDatasource.id}) missing schema "${datasource.database}". Looking for a better one.\n`,
      );
      // Fall through to find and authorize the correct datasource.
    } else {
      return false;
    }
  }

  const allDatasources = await postProjectApi<{
    data?: {
      contentList?: DatasourceItem[];
    };
  }>(page, "/dassets/v1/dataSource/pageQuery", {
    current: 1,
    size: 200,
    search: "",
  });

  // For Doris: prefer the datasource that has the required schema over a random matching one.
  const matchingDatasources = rankCurrentDatasources(
    allDatasources.data?.contentList ?? [],
  );

  let projectDatasource: DatasourceItem | undefined;
  if (shouldValidateSchema) {
    for (const candidate of matchingDatasources) {
      if (!candidate.id) continue;
      const hasSchema = await datasourceHasCandidateSchema(
        page,
        candidate.id,
        schemaCandidates,
      );
      if (hasSchema) {
        projectDatasource = candidate;
        process.stderr.write(
          `[ruleset] selected datasource "${candidate.dataSourceName ?? candidate.dtCenterSourceName}" (id=${candidate.id}) which has schema "${datasource.database}".\n`,
        );
        break;
      }
    }
    if (!projectDatasource) {
      // Fall back to first match if no schema match found
      projectDatasource = matchingDatasources[0];
      if (projectDatasource) {
        process.stderr.write(
          `[ruleset] WARN: no datasource with schema "${datasource.database}" found. Falling back to first match: "${projectDatasource.dataSourceName ?? projectDatasource.dtCenterSourceName}".\n`,
        );
      }
    }
  } else {
    projectDatasource = matchingDatasources[0];
  }

  if (!projectDatasource?.id) {
    throw new Error(
      `No ${datasource.reportName} datasource available for current quality project.`,
    );
  }

  const effectiveProjectIdForAuth =
    await resolveEffectiveQualityProjectId(page);
  const authResponse = await postProjectApi<{
    success?: boolean;
    message?: string;
  }>(page, "/dmetadata/v1/dataSource/authDataSourceToProject", {
    dataSourceId: Number(projectDatasource.id),
    projectList: [effectiveProjectIdForAuth],
  });
  let alreadyAuthorized = false;
  if (!authResponse.success) {
    const errMsg = authResponse.message ?? "";
    // "被规则所依赖，不能取消引入" means the datasource is already imported and rules depend on it.
    // This happens when the auth API is called on an already-authorized datasource (toggle behavior).
    // Treat this as "already authorized" and skip the monitor list poll.
    if (
      /被规则所依赖|不能取消引入|already imported|already authorized/.test(
        errMsg,
      )
    ) {
      process.stderr.write(
        `[ruleset] auth API returned "${errMsg}", treating as already authorized — skipping reload.\n`,
      );
      // Return false so the caller does NOT trigger a page reload.
      // The datasource is already in the monitor list; the route handler serves it from cache.
      // An extra reload would reset the page to a loading state that may not recover.
      return false;
    } else {
      throw new Error(
        errMsg ||
          `Authorize ${datasource.reportName} datasource to project failed.`,
      );
    }
  }

  if (!alreadyAuthorized) {
    await expect
      .poll(
        async () => {
          try {
            return Boolean(await findMonitorDatasource());
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            if (
              /(HTTP (502|503|504)\b|Timeout \d+ms exceeded|ETIMEDOUT)/.test(
                message,
              )
            ) {
              return true;
            }
            throw error;
          }
        },
        {
          timeout: 30000,
          message: `Waiting for ${datasource.reportName} datasource to appear in monitor datasource list.`,
        },
      )
      .toBe(true);
  }

  return true;
}

export async function selectAntOptionWithRetry(
  page: Page,
  triggerLocator: Locator,
  optionText: string | RegExp,
  attempts = 5,
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await selectAntOption(page, triggerLocator, optionText);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Ant Select option not found")) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(message);
      await page.keyboard.press("Escape").catch(() => undefined);
      await page.waitForTimeout(1000 * (attempt + 1));
    }
  }

  if (lastError) {
    throw lastError;
  }
}

const RANGE_AND_RULE_SEED: RangeEnumConfig = {
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

const RANGE_OR_RULE_SEED: RangeEnumConfig = {
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

const RANGE_ONLY_RULE_SEED: RangeEnumConfig = {
  field: "score",
  range: {
    firstOperator: ">=",
    firstValue: "0",
  },
  ruleStrength: "强规则",
  description: "score取值范围>=0",
};

const ENUM_IN_RULE_SEED: RangeEnumConfig = {
  field: "category",
  functionName: "枚举值",
  enumOperator: "in",
  enumValues: ["1", "2", "3"],
  ruleStrength: "强规则",
  description: "category枚举值in 1,2,3",
};

const ENUM_NOT_IN_RULE_SEED: RangeEnumConfig = {
  field: "category",
  functionName: "枚举值",
  enumOperator: "not in",
  enumValues: ["4", "5"],
  ruleStrength: "强规则",
  description: "category枚举值not in 4,5",
};

const ORIGINAL_ENUM_RULE_SEED: RangeEnumConfig = {
  field: "score",
  functionName: "枚举值",
  enumOperator: "in",
  enumValues: ["5", "15"],
  ruleStrength: "强规则",
  description: "score枚举值in 5,15",
};

const STRING_RULE_SEED: RangeEnumConfig = {
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

const RULESET_PACKAGE_SEEDS: Record<string, RangeEnumConfig> = {
  且关系校验包: RANGE_AND_RULE_SEED,
  或关系校验包: RANGE_OR_RULE_SEED,
  仅取值范围包: RANGE_ONLY_RULE_SEED,
  仅枚举值包: ENUM_IN_RULE_SEED,
  notin校验包: ENUM_NOT_IN_RULE_SEED,
  原枚举值包: ORIGINAL_ENUM_RULE_SEED,
  过滤条件包: RANGE_AND_RULE_SEED,
  string强转包: STRING_RULE_SEED,
};

export function getRuleSetListRow(page: Page, rulesetName: string): Locator {
  const rowText = RULESET_ROW_FALLBACKS[rulesetName] ?? rulesetName;
  return page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasText: rowText })
    .first();
}

async function postRuleSetApi<T>(
  page: Page,
  path: string,
  body: unknown,
): Promise<T> {
  let lastError: Error | null = null;
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await page.evaluate(
      async ({ requestPath, requestBody, projectId }) => {
        const result = await fetch(requestPath, {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "Accept-Language": "zh-CN",
            "X-Valid-Project-ID": String(projectId),
          },
          body: JSON.stringify(requestBody),
        });
        return {
          ok: result.ok,
          status: result.status,
          statusText: result.statusText,
          text: await result.text(),
        };
      },
      {
        requestPath: path,
        requestBody: body,
        projectId: effectiveProjectId,
      },
    );

    if (response.ok) {
      if (!response.text.trim()) {
        return {} as T;
      }
      try {
        return JSON.parse(response.text) as T;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Non-JSON response from ${path}: ${message}. Body: ${response.text.slice(0, 200)}`,
        );
      }
    }

    lastError = new Error(
      `HTTP ${response.status} ${response.statusText} from ${path}: ${response.text.slice(0, 200)}`,
    );
    if (!RETRYABLE_HTTP_STATUS.has(response.status) || attempt === 4) {
      throw lastError;
    }
    await page.waitForTimeout(1000 * attempt);
  }

  throw lastError ?? new Error(`Request failed: ${path}`);
}

export async function deleteRuleSetsByTableNames(
  page: Page,
  tableNames: string[],
): Promise<void> {
  if (isOfflineMode()) {
    await deleteOfflineRuleSetsByTableNames(page, tableNames);
    return;
  }
  const rows: Array<{ id?: number | string; tableName?: string }> = [];

  for (let current = 1; current <= 20; current += 1) {
    const listResponse = (await postRuleSetApi<{
      data?: {
        contentList?: Array<{ id?: number | string; tableName?: string }>;
      };
    }>(page, "/dassets/v1/valid/monitorRuleSet/pageQuery", {
      current,
      size: 50,
      search: "",
    })) ?? { data: { contentList: [] } };

    const pageRows = listResponse.data?.contentList ?? [];
    rows.push(
      ...pageRows.filter((item) =>
        tableNames.includes(String(item.tableName ?? "")),
      ),
    );
    if (pageRows.length < 50) {
      break;
    }
  }

  for (const row of rows) {
    if (!row.id) {
      continue;
    }
    await postRuleSetApi(page, "/dassets/v1/valid/monitorRuleSet/delete", {
      id: Number(row.id),
    });
  }
}

export async function gotoRuleSetList(page: Page): Promise<void> {
  if (isOfflineMode()) {
    await gotoOfflineRuleSetList(page);
    return;
  }
  await applyRuntimeCookies(page);
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  const targetUrl = buildDataAssetsUrl("/dq/ruleSet", effectiveProjectId);
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const gotoResponse = await page
      .goto(targetUrl, { waitUntil: "domcontentloaded" })
      .catch(() => null);
    await page
      .locator("body")
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => undefined);
    await page.waitForTimeout(500);
    await injectProjectContext(page, effectiveProjectId);
    const reloadResponse = await page
      .reload({ waitUntil: "domcontentloaded" })
      .catch(() => null);
    await page
      .locator("body")
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => undefined);
    await page.waitForTimeout(1000);

    const pageReady = await pollReadiness({
      timeoutMs: 8_000,
      intervalMs: 1_000,
      wait: async (ms) => page.waitForTimeout(ms),
      isReady: async () => {
        const pageText = await page
          .locator("body")
          .innerText()
          .catch(() => "");
        const hasServerErrorStatus =
          (gotoResponse?.status() ?? 200) >= 500 ||
          (reloadResponse?.status() ?? 200) >= 500;
        const tableWrapperVisible = await page
          .locator(".ant-table-wrapper")
          .first()
          .isVisible({ timeout: 500 })
          .catch(() => false);
        return (
          !hasServerErrorStatus &&
          !page.url().startsWith("chrome-error://") &&
          !/HTTP ERROR 502|Bad Gateway/i.test(pageText) &&
          tableWrapperVisible
        );
      },
    });
    if (pageReady) {
      await dismissIntroDialog(page);
      return;
    }

    if (attempt === 4) {
      const pageText = await page
        .locator("body")
        .innerText()
        .catch(() => "");
      throw new Error(
        `Rule set list page is unavailable: ${pageText.slice(0, 200)}`,
      );
    }
    await page.waitForTimeout(2000 * attempt);
  }
}

async function dismissIntroDialog(page: Page): Promise<void> {
  const knowBtn = page.getByRole("button", { name: "知道了" });
  if (await knowBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await knowBtn.click();
    await page.waitForTimeout(500);
  }
}

export async function gotoRuleSetCreate(page: Page): Promise<void> {
  if (isOfflineMode()) {
    await gotoOfflineRuleSetCreate(page);
    return;
  }
  await applyRuntimeCookies(page);
  await enableCompatibleMonitorDatasourceRouting(page);
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  const targetUrl = buildDataAssetsUrl("/dq/ruleSet/add", effectiveProjectId);
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const gotoResponse = await page
      .goto(targetUrl, { waitUntil: "domcontentloaded" })
      .catch(() => null);
    await page
      .locator("body")
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => undefined);
    await page.waitForTimeout(500);
    await injectProjectContext(page, effectiveProjectId);
    const reloadResponse = await page
      .reload({ waitUntil: "domcontentloaded" })
      .catch(() => null);
    await page
      .locator("body")
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => undefined);
    await page.waitForTimeout(1000);

    const pageReady = await pollReadiness({
      timeoutMs: 8_000,
      intervalMs: 1_000,
      wait: async (ms) => page.waitForTimeout(ms),
      isReady: async () => {
        const pageText = await page
          .locator("body")
          .innerText()
          .catch(() => "");
        const hasServerErrorStatus =
          (gotoResponse?.status() ?? 200) >= 500 ||
          (reloadResponse?.status() ?? 200) >= 500;
        const formVisible = await page
          .locator(".ant-form-item")
          .first()
          .isVisible({ timeout: 500 })
          .catch(() => false);
        return (
          !hasServerErrorStatus &&
          !page.url().startsWith("chrome-error://") &&
          !/HTTP ERROR 502|Bad Gateway/i.test(pageText) &&
          formVisible
        );
      },
    });
    if (pageReady) {
      await dismissIntroDialog(page);
      return;
    }

    if (attempt === 4) {
      const pageText = await page
        .locator("body")
        .innerText()
        .catch(() => "");
      throw new Error(
        `Rule set create page is unavailable: ${pageText.slice(0, 200)}`,
      );
    }
    await page.waitForTimeout(2000 * attempt);
  }
}

async function ensurePackageNamesInBaseInfo(
  page: Page,
  requiredPackageNames: string[],
): Promise<void> {
  const packageNameInputs = page.locator(
    'input[placeholder="请输入规则包名称"]',
  );
  const addPackageBtn = page
    .locator(".ant-table-footer")
    .getByRole("button", { name: /新增/ })
    .first();
  await packageNameInputs.first().waitFor({ state: "visible", timeout: 10000 });

  const getPackageNameValues = async () =>
    (await packageNameInputs.evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value.trim()),
    )) as string[];

  for (const packageName of requiredPackageNames) {
    const currentValues = await getPackageNameValues();
    if (currentValues.includes(packageName)) {
      continue;
    }

    let targetIndex = currentValues.findIndex((value) => !value);
    if (targetIndex === -1) {
      const beforeCount = await packageNameInputs.count();
      await addPackageBtn.click();
      await expect(packageNameInputs).toHaveCount(beforeCount + 1, {
        timeout: 10000,
      });
      targetIndex = beforeCount;
    }

    const targetInput = packageNameInputs.nth(targetIndex);
    await targetInput.fill(packageName);
    await targetInput.press("Tab");
    await expect(targetInput).toHaveValue(packageName);
  }

  if (requiredPackageNames.length > 0) {
    await expect
      .poll(
        async () => {
          const currentPackageNames = (await getPackageNameValues()).filter(
            Boolean,
          );
          return requiredPackageNames.every((packageName) =>
            currentPackageNames.includes(packageName),
          );
        },
        { timeout: 10000 },
      )
      .toBe(true);
  }
}

async function gotoBaseInfoStep(page: Page): Promise<void> {
  const packageNameInputs = page.locator(
    'input[placeholder="请输入规则包名称"]',
  );
  if (
    await packageNameInputs
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    return;
  }

  const prevBtn = page.getByRole("button", { name: "上一步" }).first();
  if (await prevBtn.isVisible().catch(() => false)) {
    await prevBtn.click();
  } else {
    const baseInfoBtn = page.getByRole("button", { name: /基础信息/ }).first();
    if (await baseInfoBtn.isVisible().catch(() => false)) {
      await baseInfoBtn.click();
    } else {
      throw new Error("Cannot switch to 基础信息 step.");
    }
  }

  await packageNameInputs.first().waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(500);
}

async function getBaseInfoValidationSummary(
  page: Page,
): Promise<string | null> {
  const messages = await page
    .locator(".ant-form-item-explain-error:visible")
    .evaluateAll((nodes) =>
      nodes
        .map((node) => node.textContent?.trim())
        .filter((text): text is string => Boolean(text)),
    )
    .catch(() => [] as string[]);

  if (messages.length === 0) {
    return null;
  }

  const selectedDatasourceText = await page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据源/ })
    .locator(".ant-select-selection-item")
    .first()
    .textContent()
    .catch(() => null);

  const details = Array.from(new Set(messages)).join("；");
  const datasourceInfo = selectedDatasourceText?.trim()
    ? `（当前数据源：${selectedDatasourceText.trim()}）`
    : "";

  return `${details}${datasourceInfo}`;
}

async function gotoMonitorRulesStep(page: Page): Promise<void> {
  const newPackageBtn = page
    .getByRole("button", { name: /新增规则包/ })
    .first();
  const firstPackage = page.locator(".ruleSetMonitor__package").first();
  const isMonitorRulesVisible = async () =>
    (await firstPackage.isVisible().catch(() => false)) ||
    (await newPackageBtn.isVisible().catch(() => false));
  if (await isMonitorRulesVisible()) {
    return;
  }

  const initialValidationSummary = await getBaseInfoValidationSummary(page);
  if (initialValidationSummary) {
    throw new Error(
      `Cannot enter 监控规则 step because 基础信息校验未通过: ${initialValidationSummary}`,
    );
  }

  const nextBtn = page.getByRole("button", { name: "下一步" }).first();
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(1000);
  }

  if (await isMonitorRulesVisible()) {
    return;
  }

  const afterNextValidationSummary = await getBaseInfoValidationSummary(page);
  if (afterNextValidationSummary) {
    throw new Error(
      `Cannot enter 监控规则 step because 基础信息校验未通过: ${afterNextValidationSummary}`,
    );
  }

  const monitorRulesBtn = page
    .getByRole("button", { name: /监控规则/ })
    .first();
  if (await monitorRulesBtn.isVisible().catch(() => false)) {
    await monitorRulesBtn.click();
    await page.waitForTimeout(1000);
  }

  const afterStepClickValidationSummary =
    await getBaseInfoValidationSummary(page);
  if (afterStepClickValidationSummary) {
    throw new Error(
      `Cannot enter 监控规则 step because 基础信息校验未通过: ${afterStepClickValidationSummary}`,
    );
  }

  await expect
    .poll(async () => await isMonitorRulesVisible(), { timeout: 10000 })
    .toBe(true);
}

async function addPackageSlot(page: Page, packageName: string): Promise<void> {
  await page
    .getByRole("button", { name: /新增规则包/ })
    .first()
    .click();
  await page.waitForTimeout(300);

  const packageSection = page.locator(".ruleSetMonitor__package").last();
  const packageSelect = packageSection
    .locator(".ruleSetMonitor__packageSelect")
    .first();
  await packageSelect.waitFor({ state: "visible", timeout: 10000 });
  try {
    await selectAntOption(page, packageSelect, packageName);
  } catch (error) {
    await page.keyboard.press("Escape").catch(() => undefined);

    const deleteBtn = packageSection
      .locator(".ruleSetMonitor__packageDeleteBtn")
      .first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await confirmAntModal(page);
      await page.waitForTimeout(300);
    }

    throw error;
  }
  await page.waitForTimeout(300);
}

async function ensureRuleSetPackagesVisible(
  page: Page,
  requiredPackageNames: string[],
): Promise<void> {
  const newPackageBtn = page
    .getByRole("button", { name: /新增规则包/ })
    .first();
  const firstPackage = page.locator(".ruleSetMonitor__package").first();
  await expect
    .poll(
      async () =>
        (await firstPackage.isVisible().catch(() => false)) ||
        (await newPackageBtn.isVisible().catch(() => false)),
      { timeout: 10000 },
    )
    .toBe(true);

  for (const packageName of requiredPackageNames) {
    const packageSection = page
      .locator(".ruleSetMonitor__package")
      .filter({ hasText: packageName })
      .first();
    if (await packageSection.isVisible().catch(() => false)) {
      continue;
    }
    try {
      await addPackageSlot(page, packageName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Ant Select option not found")) {
        throw error;
      }

      await gotoBaseInfoStep(page);
      await ensurePackageNamesInBaseInfo(page, [packageName]);
      await gotoMonitorRulesStep(page);
      await addPackageSlot(page, packageName);
    }
    await expect(
      page
        .locator(".ruleSetMonitor__package")
        .filter({ hasText: packageName })
        .first(),
    ).toBeVisible({ timeout: 10000 });
  }
}

export async function createRuleSetDraft(
  page: Page,
  tableName: string,
  requiredPackageNames: string[],
): Promise<void> {
  if (isOfflineMode()) {
    await gotoOfflineRuleSetCreate(page, tableName, requiredPackageNames);
    return;
  }
  const datasource = getCurrentDatasource();
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  await gotoRuleSetCreate(page);
  if (await ensureMonitorDatasource(page)) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .waitForLoadState("networkidle", { timeout: 10000 })
      .catch(() => undefined);
    await page.waitForTimeout(1000);
    await dismissIntroDialog(page);
  }
  await injectProjectContext(page, effectiveProjectId);
  const projectUnselected = await page
    .locator("body")
    .innerText({ timeout: 5000 })
    .then((text) => text.includes("请选择项目"))
    .catch(() => false);
  if (projectUnselected) {
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page
      .waitForLoadState("networkidle", { timeout: 10000 })
      .catch(() => undefined);
    await injectProjectContext(page, effectiveProjectId);
    await dismissIntroDialog(page);
    await page.waitForTimeout(800);
  }

  const sourceFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据源/ })
    .first();
  const monitorDatasource = await getCurrentMonitorDatasource(page).catch(
    () => undefined,
  );
  // Wait explicitly for the form item to appear (max 60s) so we fail fast instead of hanging.
  const formItemVisible = await sourceFormItem.isVisible().catch(() => false);
  if (!formItemVisible) {
    const pageUrl = page.url();
    const pageBodySnippet = await page
      .locator("body")
      .innerText({ timeout: 5000 })
      .catch(() => "");
    process.stderr.write(
      `[ruleset] waiting for "选择数据源" form item. url=${pageUrl} body[0:200]=${pageBodySnippet.slice(0, 200)}\n`,
    );
    await sourceFormItem.waitFor({ state: "visible", timeout: 60000 });
  }
  const datasourceSelectionTarget =
    monitorDatasource?.dataSourceName?.trim() ||
    monitorDatasource?.dtCenterSourceName?.trim() ||
    datasource.optionPattern;
  await selectAntOptionWithRetry(
    page,
    sourceFormItem.locator(".ant-select").first(),
    datasourceSelectionTarget,
  );

  const schemaFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据库/ })
    .first();
  // Wait for schema form item to appear after datasource selection (it may load async)
  await schemaFormItem
    .waitFor({ state: "visible", timeout: 30000 })
    .catch(() => undefined);
  // Poll until the schema select shows at least one option before attempting selection
  const schemaSelect = schemaFormItem.locator(".ant-select").first();
  let schemaOptions: string[] = [];
  for (let schemaWait = 0; schemaWait < 15; schemaWait += 1) {
    // Click to open the dropdown and check option count
    await schemaSelect.click().catch(() => undefined);
    await page.waitForTimeout(800);
    const dropdown = page.locator(".ant-select-dropdown:visible").last();
    const currentOptions = await dropdown
      .locator(".ant-select-item-option")
      .evaluateAll((els) =>
        els
          .map((el) => el.textContent?.trim())
          .filter((t): t is string => Boolean(t)),
      )
      .catch(() => [] as string[]);
    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(300);
    if (currentOptions.length > 0) {
      schemaOptions = currentOptions;
      process.stderr.write(
        `[ruleset] schema dropdown loaded (attempt ${schemaWait + 1}): ${currentOptions.join(", ")}\n`,
      );
      break;
    }
    process.stderr.write(
      `[ruleset] schema dropdown empty (attempt ${schemaWait + 1}/15), waiting...\n`,
    );
    if (schemaWait < 14) {
      await page.waitForTimeout(2000);
    }
  }

  // Build candidate schema names in order of preference:
  // 1. Exact configured database name (e.g. "pw_test")
  // 2. Stripped suffix variant (e.g. "pw" for "pw_test")
  // Only include candidates that differ from each other.
  const strippedDatabase = datasource.database.replace(/_test$/, "");
  const schemaCandidates = [datasource.database, strippedDatabase].filter(
    (v, i, a) => v && a.indexOf(v) === i,
  );
  // If the exact name was already found in the visible options, skip the stripped fallback.
  const effectiveCandidates = schemaOptions.includes(datasource.database)
    ? [datasource.database]
    : schemaCandidates;
  const resolvedSchemaForTable =
    monitorDatasource?.id && datasource.preconditionType === "Doris"
      ? await resolveSchemaForTable(
          page,
          monitorDatasource.id,
          tableName,
          effectiveCandidates,
        ).catch(() => null)
      : null;
  const schemaSelectionOrder = [
    resolvedSchemaForTable,
    ...effectiveCandidates,
    ...schemaOptions,
  ].filter(
    (value, index, array): value is string =>
      Boolean(value) && array.indexOf(value) === index,
  );

  let schemaSelected = false;
  let selectedSchemaName = schemaSelectionOrder[0] ?? datasource.database;
  for (const schemaCandidate of schemaSelectionOrder) {
    try {
      await selectAntOptionWithRetry(page, schemaSelect, schemaCandidate, 2);
      selectedSchemaName = schemaCandidate;
      if (schemaCandidate !== datasource.database) {
        process.stderr.write(
          `[ruleset] WARN: database "${datasource.database}" not used. Selected schema "${schemaCandidate}" for table "${tableName}".\n`,
        );
      }
      schemaSelected = true;
      break;
    } catch {
      process.stderr.write(
        `[ruleset] schema candidate "${schemaCandidate}" not found in dropdown. Available (first page): ${schemaOptions.join(", ")}\n`,
      );
    }
  }
  if (!schemaSelected) {
    throw new Error(
      `Cannot select schema: none of ${schemaSelectionOrder.join(", ")} found in dropdown. Available (first page): ${schemaOptions.join(", ")}`,
    );
  }
  await page.waitForTimeout(1000);

  if (monitorDatasource?.id && selectedSchemaName) {
    await expect
      .poll(
        async () =>
          (
            await getDatasourceTables(
              page,
              monitorDatasource.id!,
              selectedSchemaName,
              tableName,
            ).catch(() => [])
          ).includes(tableName),
        {
          timeout: 20000,
          message: `Waiting for table "${tableName}" to appear under schema "${selectedSchemaName}".`,
        },
      )
      .toBe(true);
  }

  const tableFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据表/ })
    .first();
  // Wait for table form item to appear after schema selection
  await tableFormItem
    .waitFor({ state: "visible", timeout: 30000 })
    .catch(() => undefined);
  const tableSelect = tableFormItem.locator(".ant-select").first();
  // Poll until the table select shows at least one option before attempting selection
  let tableOptions: string[] = [];
  let tableSelected = false;
  for (let tableWait = 0; tableWait < 15; tableWait += 1) {
    await tableSelect.click().catch(() => undefined);
    await page.waitForTimeout(800);
    const tableDropdown = page.locator(".ant-select-dropdown:visible").last();
    tableOptions = await tableDropdown
      .locator(".ant-select-item-option")
      .evaluateAll((els) =>
        els
          .map((el) => el.textContent?.trim())
          .filter((t): t is string => Boolean(t)),
      )
      .catch(() => [] as string[]);
    if (tableOptions.length > 0) {
      process.stderr.write(
        `[ruleset] table dropdown loaded (attempt ${tableWait + 1}): ${tableOptions.slice(0, 10).join(", ")}\n`,
      );
      const exactMatchIndex = tableOptions.findIndex(
        (option) => option === tableName,
      );
      if (exactMatchIndex >= 0) {
        await tableDropdown
          .locator(".ant-select-item-option")
          .nth(exactMatchIndex)
          .click();
        await page.waitForTimeout(500);
        tableSelected = true;
        break;
      }

      const searchInput = tableSelect
        .locator("input.ant-select-selection-search-input")
        .or(
          page.locator(
            ".ant-select-open input.ant-select-selection-search-input, .ant-select-focused input.ant-select-selection-search-input",
          ),
        )
        .first();
      if (
        (await searchInput.count()) &&
        (await searchInput.isEditable().catch(() => false))
      ) {
        await searchInput.fill(tableName);
        await page.waitForTimeout(800);
        tableOptions = await tableDropdown
          .locator(".ant-select-item-option")
          .evaluateAll((els) =>
            els
              .map((el) => el.textContent?.trim())
              .filter((t): t is string => Boolean(t)),
          )
          .catch(() => [] as string[]);
        const exactMatchAfterSearch = tableOptions.findIndex(
          (option) => option === tableName,
        );
        if (exactMatchAfterSearch >= 0) {
          await tableDropdown
            .locator(".ant-select-item-option")
            .nth(exactMatchAfterSearch)
            .click();
          await page.waitForTimeout(500);
          tableSelected = true;
          break;
        }
      }

      await page.keyboard.press("Escape").catch(() => undefined);
      await page.waitForTimeout(300);
      process.stderr.write(
        `[ruleset] table "${tableName}" not in dropdown yet (attempt ${tableWait + 1}/15), waiting...\n`,
      );
      if (tableWait < 14) {
        await page.waitForTimeout(2000);
      }
      continue;
    }
    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(300);
    process.stderr.write(
      `[ruleset] table dropdown empty (attempt ${tableWait + 1}/15), waiting...\n`,
    );
    if (tableWait < 14) {
      await page.waitForTimeout(2000);
    }
  }
  if (!tableSelected) {
    let selectTableError: Error | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        await selectAntOptionWithRetry(page, tableSelect, tableName, 2);
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
  }
  await page.waitForTimeout(500);

  await ensurePackageNamesInBaseInfo(page, requiredPackageNames);
  await gotoMonitorRulesStep(page);
  await ensureRuleSetPackagesVisible(page, requiredPackageNames);
}

export async function createRuleSetForTable(
  page: Page,
  tableName: string,
  packageName: string,
  config: RangeEnumConfig,
  ruleType = "有效性校验",
): Promise<void> {
  await createRuleSetDraft(page, tableName, [packageName]);
  const ruleForm = await addRuleToPackage(page, packageName, ruleType);
  await configureRangeEnumRule(page, ruleForm, config);
  await saveRuleSet(page);
}

async function tryOpenRuleSetRow(
  page: Page,
  dataRows: Locator,
  rowTexts: string[],
  requiredPackageNames: string[],
): Promise<boolean> {
  for (const rowText of rowTexts) {
    const matchingRows = dataRows.filter({ hasText: rowText });
    const matchingCount = await matchingRows.count().catch(() => 0);
    for (let rowIndex = 0; rowIndex < matchingCount; rowIndex += 1) {
      const targetRow = matchingRows.nth(rowIndex);
      if (!(await targetRow.isVisible().catch(() => false))) {
        continue;
      }

      await targetRow.getByRole("button", { name: "编辑" }).click();
      await page
        .waitForURL(/\/dq\/ruleSet\/edit\/\d+(?:\?.*)?$/, { timeout: 15000 })
        .catch(() => undefined);
      await page
        .waitForLoadState("networkidle", { timeout: 10000 })
        .catch(() => undefined);
      const packageNameInputs = page.locator(
        'input[placeholder="请输入规则包名称"]',
      );
      const nextBtn = page.getByRole("button", { name: "下一步" }).first();
      const newPackageBtn = page
        .getByRole("button", { name: /新增规则包/ })
        .first();
      await expect
        .poll(
          async () =>
            (await packageNameInputs
              .first()
              .isVisible()
              .catch(() => false)) ||
            (await nextBtn.isVisible().catch(() => false)) ||
            (await newPackageBtn.isVisible().catch(() => false)),
          { timeout: 15000 },
        )
        .toBe(true);
      await page.waitForTimeout(500);

      if (requiredPackageNames.length > 0) {
        await gotoMonitorRulesStep(page);
        const currentPackageNames = await page
          .locator(
            ".ruleSetMonitor__package .ruleSetMonitor__packageSelect .ant-select-selection-item",
          )
          .evaluateAll((nodes) =>
            nodes
              .map((node) => node.textContent?.trim())
              .filter((text): text is string => Boolean(text)),
          )
          .catch(() => [] as string[]);
        const hasAllRequiredPackages = requiredPackageNames.every(
          (packageName) => currentPackageNames.includes(packageName),
        );
        if (!hasAllRequiredPackages) {
          process.stderr.write(
            `[ruleset] skipped row "${rowText}" (${rowIndex + 1}/${matchingCount}) because packages [` +
              `${currentPackageNames.join(", ")}] do not include [` +
              `${requiredPackageNames.join(", ")}].\n`,
          );
          await gotoRuleSetList(page);
          await page
            .locator(".ant-table-tbody")
            .waitFor({ state: "visible", timeout: 15000 });
          continue;
        }
      }

      await ensureMonitorRulesStep(page, requiredPackageNames);
      return true;
    }
  }

  return false;
}

async function findRuleSetIdByTableName(
  page: Page,
  tableName: string,
): Promise<number | string | null> {
  for (let current = 1; current <= 20; current += 1) {
    const response = await postRuleSetApi<{
      data?: {
        contentList?: Array<{ id?: number | string; tableName?: string }>;
      };
    }>(page, "/dassets/v1/valid/monitorRuleSet/pageQuery", {
      current,
      size: 50,
      search: "",
    }).catch(() => null);

    const rows = response?.data?.contentList ?? [];
    const matchedRow = rows.find(
      (row) => String(row.tableName ?? "") === tableName && row.id,
    );
    if (matchedRow?.id) {
      return matchedRow.id;
    }
    if (rows.length < 50) {
      break;
    }
  }

  return null;
}

async function openRuleSetEditorById(
  page: Page,
  ruleSetId: number | string,
  requiredPackageNames: string[],
): Promise<void> {
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  await page.goto(
    buildDataAssetsUrl(`/dq/ruleSet/edit/${ruleSetId}`, effectiveProjectId),
    {
      waitUntil: "domcontentloaded",
    },
  );
  await page
    .waitForLoadState("networkidle", { timeout: 10000 })
    .catch(() => undefined);

  const packageNameInputs = page.locator(
    'input[placeholder="请输入规则包名称"]',
  );
  const nextBtn = page.getByRole("button", { name: "下一步" }).first();
  const newPackageBtn = page
    .getByRole("button", { name: /新增规则包/ })
    .first();
  await expect
    .poll(
      async () =>
        (await packageNameInputs
          .first()
          .isVisible()
          .catch(() => false)) ||
        (await nextBtn.isVisible().catch(() => false)) ||
        (await newPackageBtn.isVisible().catch(() => false)),
      { timeout: 15000 },
    )
    .toBe(true);
  await page.waitForTimeout(500);
  await ensureMonitorRulesStep(page, requiredPackageNames);
}

export async function openRuleSetEditor(
  page: Page,
  rulesetName: string,
  requiredPackageNames: string[] = [],
): Promise<void> {
  if (isOfflineMode()) {
    await openOfflineRuleSetEditor(page, rulesetName, requiredPackageNames);
    return;
  }
  await page
    .locator(".ant-table-tbody")
    .waitFor({ state: "visible", timeout: 15000 });
  const dataRows = page.locator(
    ".ant-table-tbody tr:not(.ant-table-measure-row)",
  );
  await expect(dataRows.first()).toBeVisible({ timeout: 15000 });

  const rowTexts = [rulesetName];
  const fallbackRowText = RULESET_ROW_FALLBACKS[rulesetName];
  if (fallbackRowText && fallbackRowText !== rulesetName) {
    rowTexts.push(fallbackRowText);
  }

  if (await tryOpenRuleSetRow(page, dataRows, rowTexts, requiredPackageNames)) {
    return;
  }

  const targetTableName =
    fallbackRowText ??
    (rulesetName.startsWith("quality_test_") ? rulesetName : undefined);
  const seedPackageName = requiredPackageNames[0];
  const seedRuleConfig = seedPackageName
    ? RULESET_PACKAGE_SEEDS[seedPackageName]
    : undefined;

  if (targetTableName) {
    const existingRuleSetId = await findRuleSetIdByTableName(
      page,
      targetTableName,
    );
    if (existingRuleSetId) {
      process.stderr.write(
        `[ruleset] DOM lookup missed existing ruleset for table "${targetTableName}" (id=${existingRuleSetId}). Opening via API.\n`,
      );
      await openRuleSetEditorById(
        page,
        existingRuleSetId,
        requiredPackageNames,
      );
      return;
    }
  }

  if (targetTableName && seedPackageName && seedRuleConfig) {
    await runPreconditions(page);
    await createRuleSetForTable(
      page,
      targetTableName,
      seedPackageName,
      seedRuleConfig,
    );
    await gotoRuleSetList(page);
    await page
      .locator(".ant-table-tbody")
      .waitFor({ state: "visible", timeout: 15000 });
    if (
      await tryOpenRuleSetRow(page, dataRows, rowTexts, requiredPackageNames)
    ) {
      return;
    }
  }

  if (targetTableName && requiredPackageNames.length > 0) {
    await createRuleSetDraft(page, targetTableName, requiredPackageNames);
    return;
  }

  const availableRows = await dataRows.allTextContents();
  throw new Error(
    `Rule set row not found for "${rulesetName}". Available rows: ${availableRows.join(" | ")}`,
  );
}

async function ensureMonitorRulesStep(
  page: Page,
  requiredPackageNames: string[],
): Promise<void> {
  const packageNameInputs = page.locator(
    'input[placeholder="请输入规则包名称"]',
  );
  const firstPackageSection = page.locator(".ruleSetMonitor__package").first();
  const newPackageBtn = page
    .getByRole("button", { name: /新增规则包/ })
    .first();

  const isMonitorRulesStep =
    (await firstPackageSection.isVisible().catch(() => false)) ||
    (await newPackageBtn.isVisible().catch(() => false));

  if (isMonitorRulesStep) {
    const missingStep2Packages: string[] = [];
    for (const packageName of requiredPackageNames) {
      const packageSection = page
        .locator(".ruleSetMonitor__package")
        .filter({ hasText: packageName })
        .first();
      if (!(await packageSection.isVisible().catch(() => false))) {
        missingStep2Packages.push(packageName);
      }
    }

    if (missingStep2Packages.length === 0) {
      return;
    }

    await gotoBaseInfoStep(page);
  }

  if (
    await packageNameInputs
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await ensurePackageNamesInBaseInfo(page, requiredPackageNames);
  }

  await gotoMonitorRulesStep(page);
  await ensureRuleSetPackagesVisible(page, requiredPackageNames);
  if (requiredPackageNames.length === 1) {
    await keepOnlyRulePackages(page, requiredPackageNames);
  }
}

export async function getRulePackage(
  page: Page,
  packageName: string,
): Promise<Locator> {
  const packageSection = page
    .locator(".ruleSetMonitor__package")
    .filter({ hasText: packageName })
    .first();
  await expect(packageSection).toBeVisible({ timeout: 10000 });

  const expandBtn = packageSection
    .getByRole("button", { name: /展开/ })
    .first();
  if (await expandBtn.isVisible().catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(300);
  }

  return packageSection;
}

export async function addRuleToPackage(
  page: Page,
  packageName: string,
  ruleType = "有效性校验",
): Promise<Locator> {
  if (isOfflineMode()) {
    return addOfflineRuleToPackage(page, packageName);
  }
  const packageSection = await getRulePackage(page, packageName);
  const ruleForms = packageSection.locator(".ruleForm");
  const beforeCount = await ruleForms.count();
  if (beforeCount > 0) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const currentRuleForms = packageSection.locator(".ruleForm");
      const currentCount = await currentRuleForms.count().catch(() => 0);
      if (currentCount <= 1) {
        break;
      }
      await deleteRule(page, currentRuleForms.first());
      await page.waitForTimeout(300);
    }
    const existingRule = packageSection.locator(".ruleForm").last();
    await expect(existingRule).toBeVisible({ timeout: 5000 });
    return existingRule;
  }

  await packageSection
    .getByRole("button", { name: /添加规则/ })
    .first()
    .click();
  await page.waitForTimeout(300);

  const ruleTypeMenu = page.locator(
    ".ant-dropdown:visible, .ant-dropdown-menu:visible",
  );
  await ruleTypeMenu.first().waitFor({ state: "visible", timeout: 10000 });
  await ruleTypeMenu.getByText(ruleType, { exact: false }).first().click();

  await expect(ruleForms).toHaveCount(beforeCount + 1, { timeout: 10000 });
  return ruleForms.nth(beforeCount);
}

export async function clearAllRules(page: Page): Promise<void> {
  const packageSections = page.locator(".ruleSetMonitor__package");
  const packageCount = await packageSections.count().catch(() => 0);
  for (let index = 0; index < packageCount; index += 1) {
    const packageSection = packageSections.nth(index);
    const expandBtn = packageSection
      .getByRole("button", { name: /展开/ })
      .first();
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(200);
    }
  }

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const ruleForms = page.locator(".ruleForm");
    const count = await ruleForms.count().catch(() => 0);
    let deletedVisibleRule = false;
    for (let index = 0; index < count; index += 1) {
      const ruleForm = ruleForms.nth(index);
      if (!(await ruleForm.isVisible().catch(() => false))) {
        continue;
      }
      const deleteBtn = ruleForm
        .locator(".ruleForm__icon")
        .locator("xpath=ancestor::button[1]")
        .first();
      if (!(await deleteBtn.isVisible().catch(() => false))) {
        continue;
      }
      await deleteRule(page, ruleForm);
      await page.waitForTimeout(300);
      deletedVisibleRule = true;
      break;
    }
    if (!deletedVisibleRule) {
      return;
    }
  }

  throw new Error("Failed to clear existing rules from rule set editor.");
}

export async function keepOnlyRulePackages(
  page: Page,
  packageNamesToKeep: string[],
): Promise<void> {
  const clearRulesInPackage = async (packageName: string): Promise<void> => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const packageSection = page
        .locator(".ruleSetMonitor__package")
        .filter({ hasText: packageName })
        .first();
      if (!(await packageSection.isVisible().catch(() => false))) {
        return;
      }

      const ruleForms = packageSection.locator(".ruleForm");
      const count = await ruleForms.count().catch(() => 0);
      let deletedRule = false;
      for (let index = 0; index < count; index += 1) {
        const ruleForm = ruleForms.nth(index);
        if (!(await ruleForm.isVisible().catch(() => false))) {
          continue;
        }
        const deleteBtn = ruleForm
          .locator(".ruleForm__icon")
          .locator("xpath=ancestor::button[1]")
          .first();
        if (!(await deleteBtn.isVisible().catch(() => false))) {
          continue;
        }
        await deleteRule(page, ruleForm);
        await page.waitForTimeout(300);
        deletedRule = true;
        break;
      }

      if (!deletedRule) {
        return;
      }
    }
  };

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const packageSections = page.locator(".ruleSetMonitor__package");
    const count = await packageSections.count().catch(() => 0);
    let removedPackage = false;

    for (let index = count - 1; index >= 0; index -= 1) {
      const packageSection = packageSections.nth(index);
      if (!(await packageSection.isVisible().catch(() => false))) {
        continue;
      }

      const packageName = (
        await packageSection
          .locator(".ruleSetMonitor__packageSelect .ant-select-selection-item")
          .first()
          .textContent()
          .catch(() => "")
      ).trim();
      if (packageNamesToKeep.includes(packageName)) {
        continue;
      }

      const deleteBtn = packageSection
        .locator(".ruleSetMonitor__packageDeleteBtn")
        .first();
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await confirmAntModal(page);
        await page.waitForTimeout(300);
        removedPackage = true;
        break;
      }

      await clearRulesInPackage(packageName);
    }

    if (!removedPackage) {
      break;
    }
  }

  for (const packageName of packageNamesToKeep) {
    await expect(
      page
        .locator(".ruleSetMonitor__package")
        .filter({ hasText: packageName })
        .first(),
    ).toBeVisible({ timeout: 10000 });
  }
}

export async function getRuleForm(
  page: Page,
  text: string | RegExp,
): Promise<Locator> {
  const ruleForm = page.locator(".ruleForm").filter({ hasText: text }).first();
  await expect(ruleForm).toBeVisible({ timeout: 10000 });
  return ruleForm;
}

export async function selectRuleFieldAndFunction(
  page: Page,
  ruleForm: Locator,
  field: string,
  functionName = "取值范围&枚举范围",
): Promise<Locator> {
  if (isOfflineMode()) {
    const packageName = await ruleForm
      .locator(
        "xpath=ancestor::*[contains(@class,'ruleSetMonitor__package')][1]",
      )
      .getAttribute("data-package-name");
    const ruleIndex = Number(
      (await ruleForm.getAttribute("data-rule-index")) ?? "0",
    );
    if (!packageName) {
      throw new Error("Offline rule form is missing package name");
    }
    return setOfflineRuleFieldAndFunction(
      page,
      packageName,
      ruleIndex,
      field,
      functionName,
    );
  }
  const exactFieldSelect = ruleForm
    .locator(".ant-form-item")
    .filter({
      has: ruleForm.locator(".ant-form-item-label", { hasText: /^字段$/ }),
    })
    .locator(".ant-select")
    .first();
  const fieldSelect =
    (await exactFieldSelect.count()) > 0
      ? exactFieldSelect
      : ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /^字段/ })
          .locator(".ant-select")
          .first();
  await selectAntOption(page, fieldSelect, field);
  await page.waitForTimeout(300);

  const functionRow = ruleForm.locator(".rule__function-list__item").first();
  await selectAntOption(
    page,
    functionRow.locator(".ant-select").first(),
    functionName,
  );
  await page.waitForTimeout(300);

  return functionRow;
}

export async function configureRangeEnumRule(
  page: Page,
  ruleForm: Locator,
  config: RangeEnumConfig,
): Promise<Locator> {
  if (isOfflineMode()) {
    const packageName = await ruleForm
      .locator(
        "xpath=ancestor::*[contains(@class,'ruleSetMonitor__package')][1]",
      )
      .getAttribute("data-package-name");
    const ruleIndex = Number(
      (await ruleForm.getAttribute("data-rule-index")) ?? "0",
    );
    if (!packageName) {
      throw new Error("Offline rule form is missing package name");
    }
    return configureOfflineRule(page, packageName, ruleIndex, config);
  }
  const functionRow = await selectRuleFieldAndFunction(
    page,
    ruleForm,
    config.field,
    config.functionName,
  );
  // Wait for the form to fully re-render after function selection.
  await page.waitForTimeout(800);
  const functionSelects = functionRow.locator(".ant-select");
  const isEnumOnlyFunction = config.functionName === "枚举值";

  // Detect form layout: VALUE_AND_ENUM renders valueRange.firstOperator at nth(1),
  // while renderNormalFunction renders verifyType at nth(1).
  // Probe nth(1) by opening it and checking available options.
  let hasVerifyTypeAtNth1 = false;
  if (!isEnumOnlyFunction) {
    try {
      await functionSelects
        .nth(1)
        .click({ timeout: 3000 })
        .catch(() => undefined);
      await page.waitForTimeout(300);
      const probeDropdown = page.locator(".ant-select-dropdown:visible").last();
      const probeOpts = await probeDropdown
        .locator(".ant-select-item-option")
        .evaluateAll((els) =>
          els
            .map((el) => el.textContent?.trim())
            .filter((t): t is string => Boolean(t)),
        )
        .catch(() => [] as string[]);
      await page.keyboard.press("Escape").catch(() => undefined);
      await page.waitForTimeout(200);
      // verifyType options are "固定值" and/or "比例"; operator options contain ">" "<" "=" etc.
      hasVerifyTypeAtNth1 = probeOpts.some(
        (opt) => opt === "固定值" || opt === "比例",
      );
      if (hasVerifyTypeAtNth1) {
        process.stderr.write(
          `[ruleset] INFO: detected renderNormalFunction layout for "${config.functionName ?? "取值范围&枚举范围"}". ` +
            `nth(1) is verifyType (options: ${probeOpts.join(", ")}). Using offset indices.\n`,
        );
      }
    } catch {
      // Detection failed — proceed with default indices.
    }
  }

  if (config.range?.firstOperator) {
    if (hasVerifyTypeAtNth1) {
      // renderNormalFunction layout: set verifyType="固定值" first, then operator at nth(2).
      await selectAntOptionWithRetry(page, functionSelects.nth(1), "固定值", 2);
      await page.waitForTimeout(300);
      await selectAntOption(
        page,
        functionSelects.nth(2),
        config.range.firstOperator,
      );
    } else {
      await selectAntOption(
        page,
        functionSelects.nth(1),
        config.range.firstOperator,
      );
    }
    await page.waitForTimeout(200);
  }
  if (config.range?.firstValue !== undefined) {
    await functionRow
      .getByPlaceholder("请输入数值")
      .first()
      .fill(config.range.firstValue);
    await page.waitForTimeout(200);
  }
  if (config.range?.condition && !hasVerifyTypeAtNth1) {
    await functionRow
      .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
      .filter({ hasText: new RegExp(`^${config.range.condition}$`) })
      .first()
      .click();
    await page.waitForTimeout(200);
  }
  if (config.range?.secondOperator && !hasVerifyTypeAtNth1) {
    await selectAntOption(
      page,
      functionRow.locator(".ant-select").nth(2),
      config.range.secondOperator,
    );
    await page.waitForTimeout(200);
  }
  if (config.range?.secondValue !== undefined && !hasVerifyTypeAtNth1) {
    await functionRow
      .getByPlaceholder("请输入数值")
      .nth(1)
      .fill(config.range.secondValue);
    await page.waitForTimeout(200);
  }

  if (config.enumOperator) {
    const enumOperatorIndex = isEnumOnlyFunction
      ? hasVerifyTypeAtNth1
        ? 2
        : 1
      : hasVerifyTypeAtNth1
        ? 4
        : 3;
    await selectAntOption(
      page,
      functionSelects.nth(enumOperatorIndex),
      config.enumOperator,
    );
    await page.waitForTimeout(200);
  }
  if (config.enumValues?.length) {
    const enumValueIndex = isEnumOnlyFunction
      ? hasVerifyTypeAtNth1
        ? 3
        : 2
      : hasVerifyTypeAtNth1
        ? 5
        : 4;
    const enumInput = functionSelects
      .nth(enumValueIndex)
      .locator("input")
      .last();
    for (const value of config.enumValues) {
      await enumInput.fill(value);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  }
  if (config.relation) {
    await functionRow
      .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
      .filter({ hasText: new RegExp(`^${config.relation}$`) })
      .last()
      .click();
    await page.waitForTimeout(200);
  }

  if (config.ruleStrength) {
    const strengthSelect = ruleForm
      .locator(".ant-form-item")
      .filter({ hasText: /强弱规则/ })
      .locator(".ant-select")
      .first();
    await selectAntOption(page, strengthSelect, config.ruleStrength);
    await page.waitForTimeout(200);
  }

  if (config.description !== undefined) {
    await ruleForm
      .getByPlaceholder("请填写规则描述")
      .first()
      .fill(config.description);
    await page.waitForTimeout(200);
  }

  return functionRow;
}

export async function selectRuleRelation(
  ruleForm: Locator,
  relation: "且" | "或",
): Promise<void> {
  if (isOfflineMode()) {
    const page = ruleForm.page();
    const ruleIndex = Number(
      (await ruleForm.getAttribute("data-rule-index").catch(() => null)) ??
        "-1",
    );
    const packageName = await ruleForm
      .locator(
        "xpath=ancestor::*[contains(@class,'ruleSetMonitor__package')][1]",
      )
      .getAttribute("data-package-name")
      .catch(() => null);
    const currentRuleForm =
      packageName && Number.isFinite(ruleIndex) && ruleIndex >= 0
        ? page
            .locator(".ruleSetMonitor__package")
            .filter({ hasText: packageName })
            .first()
            .locator(".ruleForm")
            .nth(ruleIndex)
        : page.locator(".ruleForm").last();
    await currentRuleForm
      .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
      .filter({ hasText: new RegExp(`^${relation}$`) })
      .last()
      .click();
    return;
  }
  await ruleForm
    .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
    .filter({ hasText: new RegExp(`^${relation}$`) })
    .last()
    .click();
}

export async function getSelectOptions(
  page: Page,
  selectLocator: Locator,
): Promise<string[]> {
  await selectLocator.click();
  await page.waitForTimeout(200);

  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await dropdown.waitFor({ state: "visible", timeout: 5000 });

  const options = await dropdown
    .locator(".ant-select-item-option")
    .evaluateAll((els) =>
      els
        .map((el) => el.textContent?.trim())
        .filter((text): text is string => Boolean(text)),
    );

  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  return options;
}

export async function saveRuleSet(page: Page): Promise<void> {
  if (isOfflineMode()) {
    await saveOfflineRuleSet(page);
    return;
  }
  const saveResponsePromise = page
    .waitForResponse(
      (response) => {
        const request = response.request();
        return (
          request.method() === "POST" &&
          /\/dassets\/v1\/valid\/monitorRuleSet\//.test(
            response.url(),
          )
        );
      },
      { timeout: 15000 },
    )
    .catch(() => null);

  const saveButtons = page.getByRole("button", { name: /保\s*存/ });
  await saveButtons.first().waitFor({ state: "visible", timeout: 10000 });
  await saveButtons.first().click();
  await page.waitForTimeout(500);

  const saveButtonCount = await saveButtons.count();
  if (saveButtonCount > 1) {
    const finalSaveButton = saveButtons.last();
    if (await finalSaveButton.isVisible().catch(() => false)) {
      await finalSaveButton.click();
      await page.waitForTimeout(500);
    }
  }

  const confirmSaveBtn = page
    .locator(
      ".ant-modal-confirm:visible .ant-btn-primary, .ant-modal:visible .ant-btn-primary",
    )
    .filter({ hasText: /保\s*存/ })
    .first();
  await confirmSaveBtn
    .waitFor({ state: "visible", timeout: 3000 })
    .catch(() => undefined);
  if (await confirmSaveBtn.isVisible().catch(() => false)) {
    await confirmSaveBtn.click();
  }

  const saveResponse = await saveResponsePromise;
  if (saveResponse) {
    const responseBody = await saveResponse.json().catch(() => null);
    const saveSucceeded =
      saveResponse.ok() &&
      (!responseBody ||
        typeof responseBody !== "object" ||
        responseBody.success !== false);

    if (!saveSucceeded) {
      const errorMessage =
        responseBody &&
        typeof responseBody === "object" &&
        "message" in responseBody
          ? String(responseBody.message)
          : `HTTP ${saveResponse.status()}`;
      throw new Error(`Save rule set failed: ${errorMessage}`);
    }

    await page.waitForTimeout(1000);
    return;
  }

  const successToast = page
    .locator(".ant-message-notice, .ant-notification-notice, .ant-message")
    .filter({ hasText: /成功/ })
    .first();
  const listRow = page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .first();

  try {
    await Promise.any([
      successToast.waitFor({ state: "visible", timeout: 15000 }),
      listRow.waitFor({ state: "visible", timeout: 15000 }),
    ]);
  } catch {
    const visibleMessages = (
      await page
        .locator(".ant-message-notice, .ant-notification-notice")
        .allTextContents()
        .catch(() => [])
    )
      .map((text) => text.trim())
      .filter(Boolean)
      .join(" | ");
    const formErrors = (
      await page
        .locator(".ant-form-item-explain-error, .ant-form-explain-error")
        .allTextContents()
        .catch(() => [])
    )
      .map((text) => text.trim())
      .filter(Boolean)
      .join(" | ");
    const modalText = (
      await page
        .locator(".ant-modal:visible, .ant-modal-confirm:visible")
        .first()
        .innerText()
        .catch(() => "")
    )
      .trim()
      .slice(0, 400);
    throw new Error(
      `Save rule set did not reach success state. url=${page.url()} messages=${visibleMessages || "<none>"} formErrors=${formErrors || "<none>"} modal=${modalText || "<none>"}`,
    );
  }
  await page.waitForTimeout(1000);
}

export async function cloneRule(ruleForm: Locator): Promise<void> {
  if (isOfflineMode()) {
    const packageName = await ruleForm
      .locator(
        "xpath=ancestor::*[contains(@class,'ruleSetMonitor__package')][1]",
      )
      .getAttribute("data-package-name");
    const ruleIndex = Number(
      (await ruleForm.getAttribute("data-rule-index")) ?? "0",
    );
    if (!packageName) {
      throw new Error("Offline rule form is missing package name");
    }
    await cloneOfflineRule(ruleForm.page(), packageName, ruleIndex);
    return;
  }
  await ruleForm.getByRole("button", { name: "克隆" }).click();
}

export async function deleteRule(page: Page, ruleForm: Locator): Promise<void> {
  if (isOfflineMode()) {
    const packageName = await ruleForm
      .locator(
        "xpath=ancestor::*[contains(@class,'ruleSetMonitor__package')][1]",
      )
      .getAttribute("data-package-name");
    const ruleIndex = Number(
      (await ruleForm.getAttribute("data-rule-index")) ?? "0",
    );
    if (!packageName) {
      throw new Error("Offline rule form is missing package name");
    }
    await deleteOfflineRule(page, packageName, ruleIndex);
    return;
  }
  await ruleForm
    .locator(".ruleForm__icon")
    .locator("xpath=ancestor::button[1]")
    .click();
  await page.waitForTimeout(200);

  const confirmBtn = page
    .locator(
      ".ant-popover:visible .ant-btn-primary, .ant-popconfirm .ant-btn-primary",
    )
    .first();
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click();
    await page.waitForTimeout(300);
  }
}

export async function gotoRuleBase(page: Page): Promise<void> {
  if (isOfflineMode()) {
    await gotoOfflineRuleBase(page);
    return;
  }
  await applyRuntimeCookies(page);
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  const targetUrl = buildDataAssetsUrl("/dq/ruleBase", effectiveProjectId);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page
    .waitForLoadState("networkidle", { timeout: 10000 })
    .catch(() => undefined);
  await injectProjectContext(page, effectiveProjectId);
}

export { isOfflineMode };
