import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { createClient, setupPreconditions } from "../../../../shared/helpers/preconditions";
import { applyRuntimeCookies, normalizeDataAssetsBaseUrl } from "../../../../shared/helpers/test-setup";
import {
  clearCurrentDatasource as clearLegacyDatasource,
  setCurrentDatasource as setLegacyDatasource,
} from "../../../202604-【内置规则丰富】有效性，支持设置字段多规则的且或关系/tests/data/test-data";

export interface DatasourceConfig {
  readonly id: "sparkthrift2.x" | "doris3.x";
  readonly cacheKey: "sparkthrift2_x" | "doris3_x";
  readonly reportName: "sparkthrift2.x" | "doris";
  readonly preconditionType: "SparkThrift" | "Doris";
  readonly optionPattern: RegExp;
  readonly sourceTypePattern: RegExp;
  readonly database: string;
  readonly primaryFieldType: "string" | "json";
}

type DatasourceSqlMap = Readonly<Record<DatasourceConfig["id"], string>>;

type TableDefinition = {
  readonly name: string;
  readonly sqlByDatasource: DatasourceSqlMap;
};

const TEST_JSON_KEY_RANGE_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.test_json_key_range;
CREATE TABLE pw_test.test_json_key_range (
  id INT,
  info STRING,
  extra_info STRING,
  age INT,
  create_date DATE,
  user_id BIGINT
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.test_json_key_range
SELECT 1, '{"key1":"张三","key2":25,"key11":"广东","key22":"深圳"}', '{"key1":"张三","key2":"ok"}', 25, CAST('2026-04-01' AS DATE), 1001
UNION ALL
SELECT 2, '{"key1":"李四"}', '{"key1":"李四"}', 30, CAST('2026-04-02' AS DATE), 1002
UNION ALL
SELECT 3, '{"key2":30,"key11":"北京","key22":"朝阳"}', '{"key2":30}', 40, CAST('2026-04-03' AS DATE), 1003;
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS test_json_key_range;
CREATE TABLE test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500),
  age INT,
  create_date DATE,
  user_id BIGINT
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_json_key_range VALUES
  (1, '{"key1":"张三","key2":25,"key11":"广东","key22":"深圳"}', '{"key1":"张三","key2":"ok"}', 25, '2026-04-01', 1001),
  (2, '{"key1":"李四"}', '{"key1":"李四"}', 30, '2026-04-02', 1002),
  (3, '{"key2":30,"key11":"北京","key22":"朝阳"}', '{"key2":30}', 40, '2026-04-03', 1003);
`.trim(),
};

const TEST_JSON_METHOD_SWITCH_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.test_json_method_switch;
CREATE TABLE pw_test.test_json_method_switch (
  id INT,
  info STRING
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.test_json_method_switch
SELECT 1, '{"key1":"张三","key2":25}'
UNION ALL
SELECT 2, '{"key1":"李四"}';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS test_json_method_switch;
CREATE TABLE test_json_method_switch (
  id INT,
  info JSON
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_json_method_switch VALUES
  (1, '{"key1":"张三","key2":25}'),
  (2, '{"key1":"李四"}');
`.trim(),
};

const TEST_JSON_KEY_RANGE_PASS_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.test_json_key_range_pass;
CREATE TABLE pw_test.test_json_key_range_pass (
  id INT,
  info STRING,
  extra_info STRING
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.test_json_key_range_pass
SELECT 20, '{"key1":"赵六","key2":35}', '{"key1":"赵六","key2":"ok"}';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS test_json_key_range_pass;
CREATE TABLE test_json_key_range_pass (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_json_key_range_pass VALUES
  (20, '{"key1":"赵六","key2":35}', '{"key1":"赵六","key2":"ok"}');
`.trim(),
};

const TEST_JSON_NOT_INCLUDE_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.test_json_not_include;
CREATE TABLE pw_test.test_json_not_include (
  id INT,
  info STRING
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.test_json_not_include
SELECT 31, '{"key3":"通过"}'
UNION ALL
SELECT 32, '{"key1":"命中","key2":"命中"}';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS test_json_not_include;
CREATE TABLE test_json_not_include (
  id INT,
  info JSON
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_json_not_include VALUES
  (31, '{"key3":"通过"}'),
  (32, '{"key1":"命中","key2":"命中"}');
`.trim(),
};

const TABLE_DEFINITIONS: readonly TableDefinition[] = [
  { name: "test_json_key_range", sqlByDatasource: TEST_JSON_KEY_RANGE_SQL },
  { name: "test_json_method_switch", sqlByDatasource: TEST_JSON_METHOD_SWITCH_SQL },
  { name: "test_json_key_range_pass", sqlByDatasource: TEST_JSON_KEY_RANGE_PASS_SQL },
  { name: "test_json_not_include", sqlByDatasource: TEST_JSON_NOT_INCLUDE_SQL },
] as const;

const DEFAULT_DATASOURCES: readonly DatasourceConfig[] = [
  {
    id: "sparkthrift2.x",
    cacheKey: "sparkthrift2_x",
    reportName: "sparkthrift2.x",
    preconditionType: "SparkThrift",
    optionPattern: /(sparkthrift|hadoop)/i,
    sourceTypePattern: /sparkthrift/i,
    database: "pw_test",
    primaryFieldType: "string",
  },
  {
    id: "doris3.x",
    cacheKey: "doris3_x",
    reportName: "doris",
    preconditionType: "Doris",
    optionPattern: /doris/i,
    sourceTypePattern: /doris/i,
    database: "pw_test",
    primaryFieldType: "json",
  },
] as const;

const DATASOURCE_BY_ID = new Map(DEFAULT_DATASOURCES.map((item) => [item.id, item] as const));
const DEFAULT_ACTIVE_DATASOURCE_IDS: readonly DatasourceConfig["id"][] = ["sparkthrift2.x"];

function loadActiveDatasources(): readonly DatasourceConfig[] {
  const rawMatrix = process.env.QA_DATASOURCE_MATRIX?.trim();
  if (!rawMatrix) {
    return DEFAULT_ACTIVE_DATASOURCE_IDS.map((id) => DATASOURCE_BY_ID.get(id)!);
  }

  const resolved = rawMatrix
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => DATASOURCE_BY_ID.get(item as DatasourceConfig["id"]));

  if (resolved.some((item) => !item)) {
    throw new Error(`Unsupported QA_DATASOURCE_MATRIX value: ${rawMatrix}`);
  }

  return resolved as readonly DatasourceConfig[];
}

export const ACTIVE_DATASOURCES = loadActiveDatasources();
export const ALL_TABLES = TABLE_DEFINITIONS.map((table) => table.name) as readonly string[];
export const QUALITY_PROJECT_ID = 90;
export const QUALITY_PROJECT_NAME = "pw_test";
export const SUITE_KEYS = ["key1", "key2", "key3", "key11", "key22", "key33"] as const;

if (process.env.QA_OFFLINE_MODE === "1") {
  const suiteDir = dirname(fileURLToPath(import.meta.url));
  process.env.UI_AUTOTEST_SESSION_PATH = resolve(suiteDir, "./offline-storage-state.json");
}

let currentDatasource = ACTIVE_DATASOURCES[0] ?? DEFAULT_DATASOURCES[0];

export function setCurrentDatasource(datasource: DatasourceConfig): void {
  currentDatasource = datasource;
  setLegacyDatasource(datasource as never);
}

export function clearCurrentDatasource(): void {
  currentDatasource = ACTIVE_DATASOURCES[0] ?? DEFAULT_DATASOURCES[0];
  clearLegacyDatasource();
  setLegacyDatasource(currentDatasource as never);
}

export function getCurrentDatasource(): DatasourceConfig {
  return currentDatasource;
}

export function resolveVariantName(baseName: string, datasource = getCurrentDatasource()): string {
  return `${baseName}_${datasource.cacheKey}`;
}

const BATCH_PROJECT_CANDIDATES = [QUALITY_PROJECT_NAME, QUALITY_PROJECT_NAME.replace(/_test$/, "")].filter(
  (value, index, array) => value && array.indexOf(value) === index,
);

export async function runPreconditions(
  page: Page,
  datasource = getCurrentDatasource(),
): Promise<void> {
  if (process.env.QA_OFFLINE_MODE === "1") {
    return;
  }
  await applyRuntimeCookies(page);

  process.stderr.write(`[preconditions] Preparing ${datasource.reportName} tables...\n`);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let lastAttemptError: Error | null = null;
    for (const candidateProjectName of BATCH_PROJECT_CANDIDATES) {
      try {
        await setupPreconditions({
          client: await createClient(page),
          project: candidateProjectName,
          datasource: datasource.preconditionType,
          tables: TABLE_DEFINITIONS.map((table) => ({
            name: table.name,
            sql: table.sqlByDatasource[datasource.id],
          })),
          syncTimeout: 90,
        });
        process.stderr.write(
          `[preconditions] ${datasource.reportName} preconditions complete (project="${candidateProjectName}").\n`,
        );
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Metadata sync timed out")) {
          process.stderr.write(
            `[preconditions] ${datasource.reportName} metadata sync timed out, continuing with existing synced metadata.\n`,
          );
          process.stderr.write(`[preconditions] ${datasource.reportName} preconditions complete.\n`);
          return;
        }
        const retryableError =
          /HTTP (502|503|504)\b/.test(message) ||
          /Timeout \d+ms exceeded/.test(message) ||
          /net::ERR_/.test(message) ||
          /ETIMEDOUT/.test(message) ||
          /not found in offline development/.test(message) ||
          /Datasource type .* not found in project/.test(message);
        if (!retryableError) {
          throw error;
        }
        lastAttemptError = error instanceof Error ? error : new Error(message);
        process.stderr.write(
          `[preconditions] ${datasource.reportName} project="${candidateProjectName}" hit error: ${message.slice(0, 100)}\n`,
        );
      }
    }
    if (attempt === 3) {
      process.stderr.write(
        `[preconditions] ${datasource.reportName} setup kept hitting transient errors, continuing with existing project metadata.\n`,
      );
      process.stderr.write(`[preconditions] ${datasource.reportName} preconditions complete.\n`);
      return;
    }
    process.stderr.write(
      `[preconditions] ${datasource.reportName} hit transient error, retrying setup (${attempt}/3)...\n`,
    );
    await page.waitForTimeout(3000 * attempt);
  }
}

export async function injectProjectContext(page: Page, projectId: number): Promise<void> {
  await page.evaluate((pid) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(pid));
  }, projectId);
}

let cachedEffectiveQualityProjectId: number | null = null;

export async function resolveEffectiveQualityProjectId(page: Page): Promise<number> {
  if (cachedEffectiveQualityProjectId !== null) {
    return cachedEffectiveQualityProjectId;
  }

  try {
    const baseUrl = normalizeDataAssetsBaseUrl();
    const requestUrl = new URL("/dassets/v1/valid/project/getProjects", baseUrl).toString();

    const response = await page.context().request.post(requestUrl, {
      data: {},
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      },
      timeout: 15_000,
    });

    if (response.ok()) {
      const text = await response.text();
      if (text.trim()) {
        const json = JSON.parse(text) as {
          data?: Array<{ id?: number | string; name?: string; projectName?: string }>;
        };
        const projects = json.data ?? [];
        const namedProject = projects.find((project) =>
          (project.name ?? project.projectName ?? "")
            .toLowerCase()
            .includes(QUALITY_PROJECT_NAME.toLowerCase()),
        );
        const resolvedId = namedProject?.id
          ? Number(namedProject.id)
          : projects[0]?.id
            ? Number(projects[0].id)
            : null;

        if (resolvedId !== null && Number.isFinite(resolvedId)) {
          cachedEffectiveQualityProjectId = resolvedId;
          return cachedEffectiveQualityProjectId;
        }
      }
    }
  } catch {
    // ignore and fall back to hardcoded id
  }

  cachedEffectiveQualityProjectId = QUALITY_PROJECT_ID;
  return cachedEffectiveQualityProjectId;
}
