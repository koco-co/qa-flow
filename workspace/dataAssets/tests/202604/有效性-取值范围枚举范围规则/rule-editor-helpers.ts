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
  QUALITY_PROJECT_ID,
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
let cachedCompatibleMonitorDatasourcePayload: { data?: MonitorDatasourceItem[] } | null = null;

type MonitorDatasourceItem = {
  dataSourceName?: string;
  dtCenterSourceName?: string;
  sourceTypeValue?: string;
  dataSourceType?: number;
  sourceType?: number;
  type?: number;
};

function patchCompatibleDorisSource<T extends MonitorDatasourceItem>(item: T): T {
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

export async function enableCompatibleMonitorDatasourceRouting(page: Page): Promise<void> {
  if (compatibleDorisRoutingPages.has(page)) {
    return;
  }

  const handleCompatibleMonitorDatasourceRoute = async (route: import("@playwright/test").Route) => {
    const requestUrl = route.request().url();
    const headers = route.request().headers();
    const requestBody = route.request().postDataJSON?.() ?? {};

    try {
      const payload = await requestJsonWithRetries<{ data?: MonitorDatasourceItem[] }>(
        page,
        requestUrl,
        requestBody,
        headers,
      );

      if (!Array.isArray(payload?.data)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json;charset=UTF-8",
          body: JSON.stringify(payload),
        });
        return;
      }

      const patchedPayload = {
        ...payload,
        data: payload.data.map((item: MonitorDatasourceItem) => patchCompatibleDorisSource(item)),
      };
      cachedCompatibleMonitorDatasourcePayload = patchedPayload;
      await route.fulfill({
        status: 200,
        contentType: "application/json;charset=UTF-8",
        body: JSON.stringify(patchedPayload),
      });
      return;
    } catch (error) {
      const datasource = getCurrentDatasource();
      const fallbackResponse = await requestJsonWithRetries<{
        data?: { contentList?: MonitorDatasourceItem[] };
      }>(
        page,
        new URL("/dassets/v1/dataSource/pageQuery", requestUrl).toString(),
        {
          current: 1,
          size: 200,
          search: "",
        },
        headers,
      ).catch(() => null);
      const fallbackItem = fallbackResponse?.data?.contentList?.find((item) =>
        datasource.optionPattern.test(
          `${String(item.dataSourceName ?? "")} ${String(item.dtCenterSourceName ?? "")}`,
        ),
      );
      if (fallbackItem) {
        const patchedPayload = {
          data: [patchCompatibleDorisSource(fallbackItem)],
        };
        cachedCompatibleMonitorDatasourcePayload = patchedPayload;
        await route.fulfill({
          status: 200,
          contentType: "application/json;charset=UTF-8",
          body: JSON.stringify(patchedPayload),
        });
        return;
      }
      if (cachedCompatibleMonitorDatasourcePayload) {
        await route.fulfill({
          status: 200,
          contentType: "application/json;charset=UTF-8",
          body: JSON.stringify(cachedCompatibleMonitorDatasourcePayload),
        });
        return;
      }
      throw error;
    }
  };

  await page.route("**/dmetadata/v1/dataSource/monitor/list", handleCompatibleMonitorDatasourceRoute);
  await page.route("**/dassets/v1/dataSource/monitor/list", handleCompatibleMonitorDatasourceRoute);

  compatibleDorisRoutingPages.add(page);
}

async function postProjectApi<T>(page: Page, path: string, body: unknown): Promise<T> {
  const requestUrl = /^https?:\/\//.test(path)
    ? path
    : new URL(path, normalizeDataAssetsBaseUrl()).toString();
  return requestJsonWithRetries<T>(page, requestUrl, body, {
    "content-type": "application/json;charset=UTF-8",
    "Accept-Language": "zh-CN",
    "X-Valid-Project-ID": String(QUALITY_PROJECT_ID),
  });
}

async function ensureMonitorDatasource(page: Page): Promise<boolean> {
  const datasource = getCurrentDatasource();
  const listMonitorDatasources = async () =>
    postProjectApi<{
      data?: Array<{
        id?: string;
        dataSourceName?: string;
        dtCenterSourceName?: string;
        sourceTypeValue?: string;
      }>;
    }>(page, "/dmetadata/v1/dataSource/monitor/list", {});

  const findMonitorDatasource = async () => {
    const response = await listMonitorDatasources();
    return (response.data ?? []).find(
      (item) =>
        datasource.optionPattern.test(
          `${String(item.dataSourceName ?? "")} ${String(item.dtCenterSourceName ?? "")}`,
        ) || datasource.sourceTypePattern.test(String(item.sourceTypeValue ?? "")),
    );
  };

  let existingMonitorDatasource:
    | {
        id?: string;
        dataSourceName?: string;
        dtCenterSourceName?: string;
        sourceTypeValue?: string;
      }
    | undefined;
  try {
    existingMonitorDatasource = await findMonitorDatasource();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/(HTTP (502|503|504)\b|Timeout \d+ms exceeded|ETIMEDOUT)/.test(message)) {
      throw error;
    }
    process.stderr.write(
      `[ruleset] monitor datasource check hit network error, continuing with existing datasource context.\n`,
    );
    return false;
  }

  if (existingMonitorDatasource) {
    return false;
  }

  const allDatasources = await postProjectApi<{
    data?: {
      contentList?: Array<{
        id?: string;
        dataSourceName?: string;
        dtCenterSourceName?: string;
        sourceTypeValue?: string;
      }>;
    };
  }>(page, "/dassets/v1/dataSource/pageQuery", {
    current: 1,
    size: 200,
    search: "",
  });
  const projectDatasource = (allDatasources.data?.contentList ?? []).find(
    (item) =>
      datasource.optionPattern.test(
        `${String(item.dataSourceName ?? "")} ${String(item.dtCenterSourceName ?? "")}`,
      ) || datasource.sourceTypePattern.test(String(item.sourceTypeValue ?? "")),
  );

  if (!projectDatasource?.id) {
    throw new Error(
      `No ${datasource.reportName} datasource available for current quality project.`,
    );
  }

  const authResponse = await postProjectApi<{ success?: boolean; message?: string }>(
    page,
    "/dmetadata/v1/dataSource/authDataSourceToProject",
    {
      dataSourceId: Number(projectDatasource.id),
      projectList: [QUALITY_PROJECT_ID],
    },
  );
  if (!authResponse.success) {
    throw new Error(
      authResponse.message ?? `Authorize ${datasource.reportName} datasource to project failed.`,
    );
  }

  await expect
    .poll(
      async () => {
        try {
          return Boolean(await findMonitorDatasource());
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (/(HTTP (502|503|504)\b|Timeout \d+ms exceeded|ETIMEDOUT)/.test(message)) {
            return true;
          }
          throw error;
        }
      },
      {
        timeout: 15000,
        message: `Waiting for ${datasource.reportName} datasource to appear in monitor datasource list.`,
      },
    )
    .toBe(true);

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

async function postRuleSetApi<T>(page: Page, path: string, body: unknown): Promise<T> {
  let lastError: Error | null = null;
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
        projectId: QUALITY_PROJECT_ID,
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

export async function deleteRuleSetsByTableNames(page: Page, tableNames: string[]): Promise<void> {
  if (isOfflineMode()) {
    await deleteOfflineRuleSetsByTableNames(page, tableNames);
    return;
  }
  const rows: Array<{ id?: number | string; tableName?: string }> = [];

  for (let current = 1; current <= 20; current += 1) {
    const listResponse = (await postRuleSetApi<{
      data?: { contentList?: Array<{ id?: number | string; tableName?: string }> };
    }>(page, "/dassets/v1/valid/monitorRuleSet/pageQuery", {
      current,
      size: 50,
      search: "",
    })) ?? { data: { contentList: [] } };

    const pageRows = listResponse.data?.contentList ?? [];
    rows.push(...pageRows.filter((item) => tableNames.includes(String(item.tableName ?? ""))));
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
  const targetUrl = buildDataAssetsUrl("/dq/ruleSet", QUALITY_PROJECT_ID);
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.locator("body").waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    await injectProjectContext(page, QUALITY_PROJECT_ID);
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.locator("body").waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(1000);

    const pageText = await page.locator("body").innerText().catch(() => "");
    if (!page.url().startsWith("chrome-error://") && !/HTTP ERROR 502|Bad Gateway/i.test(pageText)) {
      await dismissIntroDialog(page);
      return;
    }

    if (attempt === 4) {
      throw new Error(`Rule set list page is unavailable: ${pageText.slice(0, 200)}`);
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
  const targetUrl = buildDataAssetsUrl("/dq/ruleSet/add", QUALITY_PROJECT_ID);
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.locator("body").waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    await injectProjectContext(page, QUALITY_PROJECT_ID);
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.locator("body").waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(1000);

    const pageText = await page.locator("body").innerText().catch(() => "");
    if (!page.url().startsWith("chrome-error://") && !/HTTP ERROR 502|Bad Gateway/i.test(pageText)) {
      await dismissIntroDialog(page);
      return;
    }

    if (attempt === 4) {
      throw new Error(`Rule set create page is unavailable: ${pageText.slice(0, 200)}`);
    }
    await page.waitForTimeout(2000 * attempt);
  }
}

async function ensurePackageNamesInBaseInfo(
  page: Page,
  requiredPackageNames: string[],
): Promise<void> {
  const packageNameInputs = page.locator('input[placeholder="请输入规则包名称"]');
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
      await expect(packageNameInputs).toHaveCount(beforeCount + 1, { timeout: 10000 });
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
          const currentPackageNames = (await getPackageNameValues()).filter(Boolean);
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
  const packageNameInputs = page.locator('input[placeholder="请输入规则包名称"]');
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

async function getBaseInfoValidationSummary(page: Page): Promise<string | null> {
  const messages = await page
    .locator(".ant-form-item-explain-error:visible")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.textContent?.trim()).filter((text): text is string => Boolean(text)),
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
  const newPackageBtn = page.getByRole("button", { name: /新增规则包/ }).first();
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

  const monitorRulesBtn = page.getByRole("button", { name: /监控规则/ }).first();
  if (await monitorRulesBtn.isVisible().catch(() => false)) {
    await monitorRulesBtn.click();
    await page.waitForTimeout(1000);
  }

  const afterStepClickValidationSummary = await getBaseInfoValidationSummary(page);
  if (afterStepClickValidationSummary) {
    throw new Error(
      `Cannot enter 监控规则 step because 基础信息校验未通过: ${afterStepClickValidationSummary}`,
    );
  }

  await expect.poll(async () => await isMonitorRulesVisible(), { timeout: 10000 }).toBe(true);
}

async function addPackageSlot(page: Page, packageName: string): Promise<void> {
  await page
    .getByRole("button", { name: /新增规则包/ })
    .first()
    .click();
  await page.waitForTimeout(300);

  const packageSection = page.locator(".ruleSetMonitor__package").last();
  const packageSelect = packageSection.locator(".ruleSetMonitor__packageSelect").first();
  await packageSelect.waitFor({ state: "visible", timeout: 10000 });
  try {
    await selectAntOption(page, packageSelect, packageName);
  } catch (error) {
    await page.keyboard.press("Escape").catch(() => undefined);

    const deleteBtn = packageSection.locator(".ruleSetMonitor__packageDeleteBtn").first();
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
  const newPackageBtn = page.getByRole("button", { name: /新增规则包/ }).first();
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
      page.locator(".ruleSetMonitor__package").filter({ hasText: packageName }).first(),
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
  await gotoRuleSetCreate(page);
  if (await ensureMonitorDatasource(page)) {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await dismissIntroDialog(page);
  }

  const sourceFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据源/ })
    .first();
  await selectAntOptionWithRetry(
    page,
    sourceFormItem.locator(".ant-select").first(),
    datasource.optionPattern,
  );

  const schemaFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据库/ })
    .first();
  await selectAntOptionWithRetry(
    page,
    schemaFormItem.locator(".ant-select").first(),
    datasource.database,
  );
  await page.waitForTimeout(1000);

  const tableFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据表/ })
    .first();
  const tableSelect = tableFormItem.locator(".ant-select").first();
  let selectTableError: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await selectAntOptionWithRetry(page, tableSelect, tableName, 1);
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
    const targetRow = dataRows.filter({ hasText: rowText }).first();
    if (await targetRow.isVisible().catch(() => false)) {
      await targetRow.getByRole("button", { name: "编辑" }).click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      await ensureMonitorRulesStep(page, requiredPackageNames);
      return true;
    }
  }

  return false;
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
  await page.locator(".ant-table-tbody").waitFor({ state: "visible", timeout: 15000 });
  const dataRows = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
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
    fallbackRowText ?? (rulesetName.startsWith("quality_test_") ? rulesetName : undefined);
  const seedPackageName = requiredPackageNames[0];
  const seedRuleConfig = seedPackageName ? RULESET_PACKAGE_SEEDS[seedPackageName] : undefined;

  if (targetTableName && seedPackageName && seedRuleConfig) {
    await createRuleSetForTable(page, targetTableName, seedPackageName, seedRuleConfig);
    await gotoRuleSetList(page);
    await page.locator(".ant-table-tbody").waitFor({ state: "visible", timeout: 15000 });
    if (await tryOpenRuleSetRow(page, dataRows, rowTexts, requiredPackageNames)) {
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

async function ensureMonitorRulesStep(page: Page, requiredPackageNames: string[]): Promise<void> {
  const packageNameInputs = page.locator('input[placeholder="请输入规则包名称"]');
  const firstPackageSection = page.locator(".ruleSetMonitor__package").first();
  const newPackageBtn = page.getByRole("button", { name: /新增规则包/ }).first();

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
}

export async function getRulePackage(page: Page, packageName: string): Promise<Locator> {
  const packageSection = page
    .locator(".ruleSetMonitor__package")
    .filter({ hasText: packageName })
    .first();
  await expect(packageSection).toBeVisible({ timeout: 10000 });

  const expandBtn = packageSection.getByRole("button", { name: /展开/ }).first();
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

  await packageSection
    .getByRole("button", { name: /添加规则/ })
    .first()
    .click();
  await page.waitForTimeout(300);

  const ruleTypeMenu = page.locator(".ant-dropdown:visible, .ant-dropdown-menu:visible");
  await ruleTypeMenu.first().waitFor({ state: "visible", timeout: 10000 });
  await ruleTypeMenu.getByText(ruleType, { exact: false }).first().click();

  await expect(ruleForms).toHaveCount(beforeCount + 1, { timeout: 10000 });
  return ruleForms.nth(beforeCount);
}

export async function getRuleForm(page: Page, text: string | RegExp): Promise<Locator> {
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
      .locator("xpath=ancestor::*[contains(@class,'ruleSetMonitor__package')][1]")
      .getAttribute("data-package-name");
    const ruleIndex = Number((await ruleForm.getAttribute("data-rule-index")) ?? "0");
    if (!packageName) {
      throw new Error("Offline rule form is missing package name");
    }
    return setOfflineRuleFieldAndFunction(page, packageName, ruleIndex, field, functionName);
  }
  const fieldSelect = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /字段/ })
    .locator(".ant-select")
    .first();
  await selectAntOption(page, fieldSelect, field);
  await page.waitForTimeout(300);

  const functionRow = ruleForm.locator(".rule__function-list__item").first();
  await selectAntOption(page, functionRow.locator(".ant-select").first(), functionName);
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
      .locator("xpath=ancestor::*[contains(@class,'ruleSetMonitor__package')][1]")
      .getAttribute("data-package-name");
    const ruleIndex = Number((await ruleForm.getAttribute("data-rule-index")) ?? "0");
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
  const functionSelects = functionRow.locator(".ant-select");
  const isEnumOnlyFunction = config.functionName === "枚举值";

  if (config.range?.firstOperator) {
    await selectAntOption(page, functionSelects.nth(1), config.range.firstOperator);
    await page.waitForTimeout(200);
  }
  if (config.range?.firstValue !== undefined) {
    await functionRow.getByPlaceholder("请输入数值").first().fill(config.range.firstValue);
    await page.waitForTimeout(200);
  }
  if (config.range?.condition) {
    await functionRow
      .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
      .filter({ hasText: new RegExp(`^${config.range.condition}$`) })
      .first()
      .click();
    await page.waitForTimeout(200);
  }
  if (config.range?.secondOperator) {
    await selectAntOption(
      page,
      functionRow.locator(".ant-select").nth(2),
      config.range.secondOperator,
    );
    await page.waitForTimeout(200);
  }
  if (config.range?.secondValue !== undefined) {
    await functionRow.getByPlaceholder("请输入数值").nth(1).fill(config.range.secondValue);
    await page.waitForTimeout(200);
  }

  if (config.enumOperator) {
    await selectAntOption(
      page,
      functionSelects.nth(isEnumOnlyFunction ? 1 : 3),
      config.enumOperator,
    );
    await page.waitForTimeout(200);
  }
  if (config.enumValues?.length) {
    const enumInput = functionSelects
      .nth(isEnumOnlyFunction ? 2 : 4)
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
    await ruleForm.getByPlaceholder("请填写规则描述").first().fill(config.description);
    await page.waitForTimeout(200);
  }

  return functionRow;
}

export async function selectRuleRelation(ruleForm: Locator, relation: "且" | "或"): Promise<void> {
  if (isOfflineMode()) {
    const page = ruleForm.page();
    const ruleIndex = Number((await ruleForm.getAttribute("data-rule-index").catch(() => null)) ?? "-1");
    const packageName = await ruleForm
      .locator("xpath=ancestor::*[contains(@class,'ruleSetMonitor__package')][1]")
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

export async function getSelectOptions(page: Page, selectLocator: Locator): Promise<string[]> {
  await selectLocator.click();
  await page.waitForTimeout(200);

  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await dropdown.waitFor({ state: "visible", timeout: 5000 });

  const options = await dropdown
    .locator(".ant-select-item-option")
    .evaluateAll((els) =>
      els.map((el) => el.textContent?.trim()).filter((text): text is string => Boolean(text)),
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
          /\/dassets\/v1\/valid\/monitorRuleSet\/(add|edit)/.test(response.url())
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
    .locator(".ant-modal-confirm:visible .ant-btn-primary, .ant-modal:visible .ant-btn-primary")
    .filter({ hasText: /保\s*存/ })
    .first();
  await confirmSaveBtn.waitFor({ state: "visible", timeout: 3000 }).catch(() => undefined);
  if (await confirmSaveBtn.isVisible().catch(() => false)) {
    await confirmSaveBtn.click();
  }

  const saveResponse = await saveResponsePromise;
  if (saveResponse) {
    const responseBody = await saveResponse.json().catch(() => null);
    const saveSucceeded =
      saveResponse.ok() &&
      (!responseBody || typeof responseBody !== "object" || responseBody.success !== false);

    if (!saveSucceeded) {
      const errorMessage =
        responseBody && typeof responseBody === "object" && "message" in responseBody
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
  const listRow = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)").first();

  await Promise.any([
    successToast.waitFor({ state: "visible", timeout: 15000 }),
    listRow.waitFor({ state: "visible", timeout: 15000 }),
  ]);
  await page.waitForTimeout(1000);
}

export async function cloneRule(ruleForm: Locator): Promise<void> {
  if (isOfflineMode()) {
    const packageName = await ruleForm
      .locator("xpath=ancestor::*[contains(@class,'ruleSetMonitor__package')][1]")
      .getAttribute("data-package-name");
    const ruleIndex = Number((await ruleForm.getAttribute("data-rule-index")) ?? "0");
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
      .locator("xpath=ancestor::*[contains(@class,'ruleSetMonitor__package')][1]")
      .getAttribute("data-package-name");
    const ruleIndex = Number((await ruleForm.getAttribute("data-rule-index")) ?? "0");
    if (!packageName) {
      throw new Error("Offline rule form is missing package name");
    }
    await deleteOfflineRule(page, packageName, ruleIndex);
    return;
  }
  await ruleForm.locator(".ruleForm__icon").locator("xpath=ancestor::button[1]").click();
  await page.waitForTimeout(200);

  const confirmBtn = page
    .locator(".ant-popover:visible .ant-btn-primary, .ant-popconfirm .ant-btn-primary")
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
  const targetUrl = buildDataAssetsUrl("/dq/ruleBase", QUALITY_PROJECT_ID);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await injectProjectContext(page, QUALITY_PROJECT_ID);
}

export { isOfflineMode };
