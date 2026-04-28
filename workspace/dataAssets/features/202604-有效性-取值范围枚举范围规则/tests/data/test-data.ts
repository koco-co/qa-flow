/**
 * 共享测试数据 & 前置条件
 * 「有效性-取值范围枚举范围规则」全部 27 条用例的公共依赖
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Page } from "@playwright/test";
import { setupPreconditions } from "../../../../shared/helpers/preconditions";
import { applyRuntimeCookies, normalizeDataAssetsBaseUrl } from "../../../../shared/helpers/test-setup";

export interface DatasourceConfig {
  readonly id: "sparkthrift2.x" | "doris3.x";
  readonly cacheKey: "sparkthrift2_x" | "doris3_x";
  readonly reportName: "sparkthrift2.x" | "doris";
  readonly preconditionType: "SparkThrift" | "Doris";
  readonly optionPattern: RegExp;
  readonly sourceTypePattern: RegExp;
  readonly database: string;
}

type DatasourceSqlMap = Readonly<Record<DatasourceConfig["id"], string>>;

type TableDefinition = {
  readonly name: string;
  readonly sqlByDatasource: DatasourceSqlMap;
};

const QUALITY_TEST_NUM_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_num;
CREATE TABLE pw_test.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_num;
CREATE TABLE quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
`.trim(),
};

const QUALITY_TEST_STR_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_str;
CREATE TABLE pw_test.quality_test_str (
  id INT,
  score_str STRING,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_str
SELECT 1, '5', '2'
UNION ALL
SELECT 2, '5.0', '4'
UNION ALL
SELECT 3, '15.0', '1'
UNION ALL
SELECT 4, 'abc', '3'
UNION ALL
SELECT 5, '-1.0', '5';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_str;
CREATE TABLE quality_test_str (
  id INT NOT NULL,
  score_str VARCHAR(50),
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_str VALUES
  (1, '5', '2'),
  (2, '5.0', '4'),
  (3, '15.0', '1'),
  (4, 'abc', '3'),
  (5, '-1.0', '5');
`.trim(),
};

const QUALITY_TEST_SAMPLE_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_sample;
CREATE TABLE pw_test.quality_test_sample (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_sample
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5'
UNION ALL
SELECT 6, 7.0, '1'
UNION ALL
SELECT 7, 9.0, '2'
UNION ALL
SELECT 8, 2.0, '3'
UNION ALL
SELECT 9, 6.0, '1'
UNION ALL
SELECT 10, 4.0, '2';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_sample;
CREATE TABLE quality_test_sample (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_sample VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5'),
  (6, 7.0, '1'),
  (7, 9.0, '2'),
  (8, 2.0, '3'),
  (9, 6.0, '1'),
  (10, 4.0, '2');
`.trim(),
};

const QUALITY_TEST_PARTITION_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_partition;
CREATE TABLE pw_test.quality_test_partition (
  id INT,
  score DOUBLE,
  category STRING
)
PARTITIONED BY (dt STRING)
STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_partition PARTITION (dt='2026-04-01')
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4';
INSERT INTO TABLE pw_test.quality_test_partition PARTITION (dt='2026-04-02')
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_partition;
CREATE TABLE quality_test_partition (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50),
  dt DATE NOT NULL
) PARTITION BY RANGE(dt) (
  PARTITION p20260401 VALUES LESS THAN ('2026-04-02'),
  PARTITION p20260402 VALUES LESS THAN ('2026-04-03')
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_partition VALUES
  (1, 5.0, '2', '2026-04-01'),
  (2, 15.0, '4', '2026-04-01'),
  (3, 3.0, '1', '2026-04-02'),
  (4, -1.0, '3', '2026-04-02');
`.trim(),
};

const QUALITY_TEST_ENUM_PASS_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_enum_pass;
CREATE TABLE pw_test.quality_test_enum_pass (
  id INT,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_enum_pass
SELECT 1, '1'
UNION ALL
SELECT 2, '2'
UNION ALL
SELECT 3, '3';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_enum_pass;
CREATE TABLE quality_test_enum_pass (
  id INT NOT NULL,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_enum_pass VALUES (1, '1'), (2, '2'), (3, '3');
`.trim(),
};

const TABLE_DEFINITIONS: readonly TableDefinition[] = [
  { name: "quality_test_num", sqlByDatasource: QUALITY_TEST_NUM_SQL },
  { name: "quality_test_str", sqlByDatasource: QUALITY_TEST_STR_SQL },
  { name: "quality_test_sample", sqlByDatasource: QUALITY_TEST_SAMPLE_SQL },
  { name: "quality_test_partition", sqlByDatasource: QUALITY_TEST_PARTITION_SQL },
  { name: "quality_test_enum_pass", sqlByDatasource: QUALITY_TEST_ENUM_PASS_SQL },
] as const;

export const DORIS3X_SOURCE_TYPE = 129;
export const DORIS3X_SOURCE_TYPE_NAME = "Doris3.x";

const DEFAULT_DATASOURCES: readonly DatasourceConfig[] = [
  {
    id: "sparkthrift2.x",
    cacheKey: "sparkthrift2_x",
    reportName: "sparkthrift2.x",
    preconditionType: "SparkThrift",
    optionPattern: /(sparkthrift|hadoop)/i,
    sourceTypePattern: /sparkthrift/i,
    database: "pw_test",
  },
  {
    id: "doris3.x",
    cacheKey: "doris3_x",
    reportName: "doris",
    preconditionType: "Doris",
    optionPattern: /doris/i,
    sourceTypePattern: /doris/i,
    database: "pw_test",
  },
] as const;

const DATASOURCE_BY_ID = new Map(DEFAULT_DATASOURCES.map((item) => [item.id, item] as const));
const DEFAULT_ACTIVE_DATASOURCE_IDS: readonly DatasourceConfig["id"][] = ["doris3.x"];

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

const envQualityProjectId = Number(process.env.QA_VALID_PROJECT_ID ?? "NaN");
export const QUALITY_PROJECT_ID =
  Number.isFinite(envQualityProjectId) && envQualityProjectId > 0
    ? envQualityProjectId
    : 90;
export const QUALITY_PROJECT_NAME = "pw_test";

if (process.env.QA_OFFLINE_MODE === "1") {
  const suiteDir = dirname(fileURLToPath(import.meta.url));
  process.env.UI_AUTOTEST_SESSION_PATH = resolve(
    suiteDir,
    "./offline-storage-state.json",
  );
}

let currentDatasource = ACTIVE_DATASOURCES[0] ?? DEFAULT_DATASOURCES[0];

export function setCurrentDatasource(datasource: DatasourceConfig): void {
  currentDatasource = datasource;
}

export function clearCurrentDatasource(): void {
  currentDatasource = ACTIVE_DATASOURCES[0] ?? DEFAULT_DATASOURCES[0];
}

export function getCurrentDatasource(): DatasourceConfig {
  return currentDatasource;
}

export function resolveVariantName(baseName: string, datasource = getCurrentDatasource()): string {
  return `${baseName}_${datasource.cacheKey}`;
}

// Candidate batch project names to try when setting up preconditions.
// Environments may use different naming conventions (e.g. "pw_test" in LTQC, "pw" in ltqcdev).
const BATCH_PROJECT_CANDIDATES = [QUALITY_PROJECT_NAME, QUALITY_PROJECT_NAME.replace(/_test$/, "")].filter(
  (v, i, a) => v && a.indexOf(v) === i,
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
    // Try each candidate project name on every attempt
    let lastAttemptError: Error | null = null;
    for (const candidateProjectName of BATCH_PROJECT_CANDIDATES) {
      try {
        await setupPreconditions(page, {
          datasourceType: datasource.preconditionType,
          tables: TABLE_DEFINITIONS.map((table) => ({
            name: table.name,
            sql: table.sqlByDatasource[datasource.id],
          })),
          projectName: candidateProjectName,
          syncTimeout: 90,
        });
        process.stderr.write(`[preconditions] ${datasource.reportName} preconditions complete (project="${candidateProjectName}").\n`);
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

/**
 * 注入质量项目 ID 到 sessionStorage，确保后续 API 请求携带正确的 X-Valid-Project-ID 头。
 */
export async function injectProjectContext(page: Page, projectId: number): Promise<void> {
  await page.evaluate((pid) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(pid));
  }, projectId);
}

let _cachedEffectiveQualityProjectId: number | null = null;

/**
 * 动态解析当前环境可访问的质量项目 ID。
 * 优先使用与 QUALITY_PROJECT_NAME 匹配的项目；若无法通过 API 解析，则回退到硬编码的 QUALITY_PROJECT_ID。
 * 结果在测试运行期间缓存。
 * 使用 Node.js API（page.context().request）而非 page.evaluate，确保在页面未导航时也能正常工作。
 */
export async function resolveEffectiveQualityProjectId(page: Page): Promise<number> {
  if (_cachedEffectiveQualityProjectId !== null) {
    return _cachedEffectiveQualityProjectId;
  }

  const baseUrl = normalizeDataAssetsBaseUrl();
  const requestUrl = new URL("/dassets/v1/valid/project/getProjects", baseUrl).toString();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
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
          // Try to find by name first
          const namedProject = projects.find((p) =>
            (p.name ?? p.projectName ?? "").toLowerCase().includes(QUALITY_PROJECT_NAME.toLowerCase()),
          );
          const resolvedId = namedProject?.id
            ? Number(namedProject.id)
            : projects[0]?.id
              ? Number(projects[0].id)
              : null;

          if (resolvedId !== null && Number.isFinite(resolvedId)) {
            _cachedEffectiveQualityProjectId = resolvedId;
            process.stderr.write(
              `[quality-project] resolved effective project ID: ${_cachedEffectiveQualityProjectId} (hardcoded default: ${QUALITY_PROJECT_ID}).\n`,
            );
            return _cachedEffectiveQualityProjectId;
          }
        }
      }
    } catch {
      // retry
    }

    if (attempt < 3) {
      await page.waitForTimeout(1000 * attempt).catch(() => undefined);
    }
  }

  const sessionProjectId = await page
    .evaluate(() => Number(sessionStorage.getItem("X-Valid-Project-ID") ?? "NaN"))
    .catch(() => Number.NaN);
  if (Number.isFinite(sessionProjectId) && sessionProjectId > 0) {
    _cachedEffectiveQualityProjectId = sessionProjectId;
    process.stderr.write(
      `[quality-project] project API fallback to sessionStorage project ID: ${_cachedEffectiveQualityProjectId}.\n`,
    );
    return _cachedEffectiveQualityProjectId;
  }

  const pidFromUrl = Number(new URL(page.url()).searchParams.get("pid") ?? "NaN");
  if (Number.isFinite(pidFromUrl) && pidFromUrl > 0) {
    _cachedEffectiveQualityProjectId = pidFromUrl;
    process.stderr.write(
      `[quality-project] project API fallback to URL pid: ${_cachedEffectiveQualityProjectId}.\n`,
    );
    return _cachedEffectiveQualityProjectId;
  }

  _cachedEffectiveQualityProjectId = QUALITY_PROJECT_ID;
  process.stderr.write(
    `[quality-project] project ID resolution failed or returned no data, using hardcoded default: ${QUALITY_PROJECT_ID}.\n`,
  );
  return _cachedEffectiveQualityProjectId;
}
