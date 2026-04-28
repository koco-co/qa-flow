process.env.QA_DATASOURCE_MATRIX ??= "sparkthrift2.x";

import type { Page } from "@playwright/test";
import { setupPreconditions } from "../../../shared/helpers/preconditions";
import { applyRuntimeCookies } from "../../../shared/helpers/test-setup";
import type { DatasourceConfig as BaseDatasourceConfig } from "../有效性-取值范围枚举范围规则/test-data";
import { buildSparkFixtureSql, versionJsonFixtureName } from "./json-fixture-sql";
import { runRetriablePreconditions } from "./json-suite-preconditions";

const base = await import("../有效性-取值范围枚举范围规则/test-data");

export type DatasourceConfig = BaseDatasourceConfig;
export const ACTIVE_DATASOURCES = base.ACTIVE_DATASOURCES;
export const clearCurrentDatasource = base.clearCurrentDatasource;
export const getCurrentDatasource = base.getCurrentDatasource;
export const injectProjectContext = base.injectProjectContext;
export const resolveEffectiveQualityProjectId = base.resolveEffectiveQualityProjectId;
export const resolveVariantName = base.resolveVariantName;
export const setCurrentDatasource = base.setCurrentDatasource;

export const SUITE_NAME = "【内置规则丰富】有效性，json中key对应的value值格式校验";
export const SPARKTHRIFT2X_SOURCE_TYPE = 45;
export const HIVE2X_SOURCE_TYPE = 7;
export const DORIS3X_SOURCE_TYPE = 129;

export type JsonValidationSeed = {
  readonly path: readonly string[];
  readonly name?: string;
  readonly value?: string;
};

export type JsonRuleScenario = {
  readonly tableName: string;
  readonly packageName: string;
  readonly taskName: string;
  readonly field: string;
  readonly selectedKeyPaths: readonly string[];
  readonly ruleStrength?: "强规则" | "弱规则";
  readonly keyPresets: readonly (keyof typeof JSON_KEY_PRESETS)[];
};

type DatasourceSqlMap = Readonly<Record<DatasourceConfig["id"], string>>;
type TableDefinition = {
  readonly name: string;
  readonly sqlByDatasource: DatasourceSqlMap;
};

const RULE_CONFIG_TABLE = versionJsonFixtureName("quality_test_json_rule_config");
const MULTI_TYPE_TABLE = versionJsonFixtureName("quality_test_json_multi_type");
const MAIN_PASS_TABLE = versionJsonFixtureName("quality_test_json_main_pass");
const MAIN_FAIL_TABLE = versionJsonFixtureName("quality_test_json_main_fail");
const REPORT_PASS_TABLE = versionJsonFixtureName("quality_test_json_report_pass");
const REPORT_FAIL_TABLE = versionJsonFixtureName("quality_test_json_report_fail");
const DELETE_REFERENCE_TABLE = versionJsonFixtureName("quality_test_json_delete_ref");
const PREVIEW_DELETE_TABLE = versionJsonFixtureName("quality_test_json_preview_del");

const RULE_CONFIG_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": buildSparkFixtureSql(
    RULE_CONFIG_TABLE,
    `
SELECT
  1 AS id,
  CAST('{"person":{"name":"张三","age":"25","email":"test@example.com"}}' AS STRING) AS info,
  CAST('row1' AS VARCHAR(255)) AS name
UNION ALL
SELECT
  2 AS id,
  CAST('{"person":{"name":"李四","age":"30","email":"admin@test.com"}}' AS STRING) AS info,
  CAST('row2' AS VARCHAR(255)) AS name
    `,
  ),
  "doris3.x": `
 DROP TABLE IF EXISTS ${RULE_CONFIG_TABLE};
 CREATE TABLE ${RULE_CONFIG_TABLE} (
   id INT NOT NULL,
   info JSON,
   name VARCHAR(255)
 ) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
 INSERT INTO ${RULE_CONFIG_TABLE} VALUES
   (1, '{"person":{"name":"张三","age":"25","email":"test@example.com"}}', 'row1'),
   (2, '{"person":{"name":"李四","age":"30","email":"admin@test.com"}}', 'row2');
 `.trim(),
};

const MULTI_TYPE_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": buildSparkFixtureSql(
    MULTI_TYPE_TABLE,
    `
SELECT
  1 AS id,
  CAST('张三' AS VARCHAR(255)) AS name,
  CAST(25 AS INT) AS age,
  CAST(88.80 AS DECIMAL(10,2)) AS salary,
  CAST('{"person":{"name":"张三"}}' AS STRING) AS info,
  CAST('2026-04-21 10:00:00' AS TIMESTAMP) AS created_at
    `,
  ),
  "doris3.x": `
 DROP TABLE IF EXISTS ${MULTI_TYPE_TABLE};
 CREATE TABLE ${MULTI_TYPE_TABLE} (
   id INT NOT NULL,
   name VARCHAR(255),
   age INT,
  salary DECIMAL(10,2),
   info JSON,
   created_at DATETIME
 ) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
 INSERT INTO ${MULTI_TYPE_TABLE} VALUES
   (1, '张三', 25, 88.80, '{"person":{"name":"张三"}}', '2026-04-21 10:00:00');
 `.trim(),
};

const MAIN_PASS_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": buildSparkFixtureSql(
    MAIN_PASS_TABLE,
    `
SELECT
  1 AS id,
  CAST('{"person":{"name":"张三","age":"25","email":"test@example.com"}}' AS STRING) AS info,
  CAST('row1' AS VARCHAR(255)) AS name
UNION ALL
SELECT
  2 AS id,
  CAST('{"person":{"name":"李四","age":"30","email":"admin@test.com"}}' AS STRING) AS info,
  CAST('row2' AS VARCHAR(255)) AS name
    `,
  ),
  "doris3.x": `
 DROP TABLE IF EXISTS ${MAIN_PASS_TABLE};
 CREATE TABLE ${MAIN_PASS_TABLE} (
   id INT NOT NULL,
   info JSON,
   name VARCHAR(255)
 ) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
 INSERT INTO ${MAIN_PASS_TABLE} VALUES
   (1, '{"person":{"name":"张三","age":"25","email":"test@example.com"}}', 'row1'),
   (2, '{"person":{"name":"李四","age":"30","email":"admin@test.com"}}', 'row2');
 `.trim(),
};

const MAIN_FAIL_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": buildSparkFixtureSql(
    MAIN_FAIL_TABLE,
    `
SELECT
  1 AS id,
  CAST('{"person":{"name":"张三","age":"25","email":"test@example.com"}}' AS STRING) AS info,
  CAST('row_valid' AS VARCHAR(255)) AS remark
UNION ALL
SELECT
  2 AS id,
  CAST('{"person":{"name":"Tom","age":"18","email":"test@example.com"}}' AS STRING) AS info,
  CAST('row_invalid_name' AS VARCHAR(255)) AS remark
UNION ALL
SELECT
  3 AS id,
  CAST('{"person":{"name":"王五","age":"1000","email":"ops@test.com"}}' AS STRING) AS info,
  CAST('row_invalid_age' AS VARCHAR(255)) AS remark
    `,
  ),
  "doris3.x": `
 DROP TABLE IF EXISTS ${MAIN_FAIL_TABLE};
 CREATE TABLE ${MAIN_FAIL_TABLE} (
   id INT NOT NULL,
   info JSON,
   remark VARCHAR(255)
 ) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
 INSERT INTO ${MAIN_FAIL_TABLE} VALUES
   (1, '{"person":{"name":"张三","age":"25","email":"test@example.com"}}', 'row_valid'),
   (2, '{"person":{"name":"Tom","age":"18","email":"test@example.com"}}', 'row_invalid_name'),
   (3, '{"person":{"name":"王五","age":"1000","email":"ops@test.com"}}', 'row_invalid_age');
 `.trim(),
};

const REPORT_PASS_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": buildSparkFixtureSql(
    REPORT_PASS_TABLE,
    `
SELECT 1 AS id, CAST('{"meta":{"version":"v1.0"}}' AS STRING) AS info
UNION ALL
SELECT 2 AS id, CAST('{"meta":{"version":"v2.3"}}' AS STRING) AS info
    `,
  ),
  "doris3.x": `
 DROP TABLE IF EXISTS ${REPORT_PASS_TABLE};
 CREATE TABLE ${REPORT_PASS_TABLE} (
   id INT NOT NULL,
   info JSON
 ) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
 INSERT INTO ${REPORT_PASS_TABLE} VALUES
   (1, '{"meta":{"version":"v1.0"}}'),
   (2, '{"meta":{"version":"v2.3"}}');
 `.trim(),
};

const REPORT_FAIL_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": buildSparkFixtureSql(
    REPORT_FAIL_TABLE,
    `
SELECT 1 AS id, CAST('{"log":{"level":"INFO","code":"ERR00001"}}' AS STRING) AS log_info
UNION ALL
SELECT 2 AS id, CAST('{"log":{"level":"DEBUG","code":"invalid"}}' AS STRING) AS log_info
    `,
  ),
  "doris3.x": `
 DROP TABLE IF EXISTS ${REPORT_FAIL_TABLE};
 CREATE TABLE ${REPORT_FAIL_TABLE} (
   id INT NOT NULL,
   log_info JSON
 ) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
 INSERT INTO ${REPORT_FAIL_TABLE} VALUES
   (1, '{"log":{"level":"INFO","code":"ERR00001"}}'),
   (2, '{"log":{"level":"DEBUG","code":"invalid"}}');
 `.trim(),
};

const DELETE_REFERENCE_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": buildSparkFixtureSql(
    DELETE_REFERENCE_TABLE,
    `
SELECT 1 AS id, CAST('{"del":{"key":{"a":"ABC","b":"123"}}}' AS STRING) AS del_info
    `,
  ),
  "doris3.x": `
 DROP TABLE IF EXISTS ${DELETE_REFERENCE_TABLE};
 CREATE TABLE ${DELETE_REFERENCE_TABLE} (
   id INT NOT NULL,
   del_info JSON
 ) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
 INSERT INTO ${DELETE_REFERENCE_TABLE} VALUES
   (1, '{"del":{"key":{"a":"ABC","b":"123"}}}');
 `.trim(),
};

const PREVIEW_DELETE_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": buildSparkFixtureSql(
    PREVIEW_DELETE_TABLE,
    `
SELECT 1 AS id, CAST('{"preview":{"key":{"x":"123","y":"abc"}}}' AS STRING) AS preview_info
UNION ALL
SELECT 2 AS id, CAST('{"preview":{"key":{"x":"456","y":"def"}}}' AS STRING) AS preview_info
    `,
  ),
  "doris3.x": `
 DROP TABLE IF EXISTS ${PREVIEW_DELETE_TABLE};
 CREATE TABLE ${PREVIEW_DELETE_TABLE} (
   id INT NOT NULL,
   preview_info JSON
 ) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
 INSERT INTO ${PREVIEW_DELETE_TABLE} VALUES
   (1, '{"preview":{"key":{"x":"123","y":"abc"}}}'),
   (2, '{"preview":{"key":{"x":"456","y":"def"}}}');
 `.trim(),
};

const TABLE_DEFINITIONS: readonly TableDefinition[] = [
  { name: RULE_CONFIG_TABLE, sqlByDatasource: RULE_CONFIG_SQL },
  { name: MULTI_TYPE_TABLE, sqlByDatasource: MULTI_TYPE_SQL },
  { name: MAIN_PASS_TABLE, sqlByDatasource: MAIN_PASS_SQL },
  { name: MAIN_FAIL_TABLE, sqlByDatasource: MAIN_FAIL_SQL },
  { name: REPORT_PASS_TABLE, sqlByDatasource: REPORT_PASS_SQL },
  { name: REPORT_FAIL_TABLE, sqlByDatasource: REPORT_FAIL_SQL },
  {
    name: DELETE_REFERENCE_TABLE,
    sqlByDatasource: DELETE_REFERENCE_SQL,
  },
  {
    name: PREVIEW_DELETE_TABLE,
    sqlByDatasource: PREVIEW_DELETE_SQL,
  },
] as const;

const preconditionsReady = new Set<string>();
const DEFAULT_METADATA_SYNC_TIMEOUT_SECONDS = 90;

function getMetadataSyncTimeoutSeconds(): number {
  const raw = process.env.UI_AUTOTEST_METADATA_SYNC_TIMEOUT_SECONDS;
  if (!raw) {
    return DEFAULT_METADATA_SYNC_TIMEOUT_SECONDS;
  }

  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_METADATA_SYNC_TIMEOUT_SECONDS;
}

function namedSeed(path: readonly string[], value?: string): JsonValidationSeed {
  return value ? { path, name: path.join("-"), value } : { path, name: path.join("-") };
}

function createSingleLevelSeeds(
  prefix: string,
  start: number,
  end: number,
  padLength: number,
  valueFactory: (padded: string) => string,
): JsonValidationSeed[] {
  return Array.from({ length: end - start + 1 }, (_, offset) => {
    const padded = String(start + offset).padStart(padLength, "0");
    return namedSeed([`${prefix}${padded}`], valueFactory(padded));
  });
}

export const JSON_KEY_PRESETS = {
  personHierarchy: [
    namedSeed(["person"]),
    namedSeed(["person", "name"], "^[\\u4e00-\\u9fa5]+$"),
    namedSeed(["person", "age"], "^\\d{1,3}$"),
    namedSeed(["person", "email"]),
  ],
  addressHierarchy: [namedSeed(["address"]), namedSeed(["address", "city"], "^.{1,20}$")],
  productSelection: [
    namedSeed(["product", "name"], "^.{1,50}$"),
    namedSeed(["product", "code"], "^[A-Z]{2}\\d{6}$"),
    namedSeed(["product", "desc"]),
  ],
  multiSelect: [
    namedSeed(["user", "name"], "^[\\u4e00-\\u9fa5a-zA-Z]{1,20}$"),
    namedSeed(["user", "phone"], "^1[3-9]\\d{9}$"),
    namedSeed(["user", "id"], "^\\d{18}$"),
  ],
  searchBasic: [
    namedSeed(["order", "amount"], "^\\d+\\.\\d{2}$"),
    namedSeed(["order", "status"], "^(paid|pending)$"),
    namedSeed(["user", "name"], "^.{1,20}$"),
  ],
  largeKeySet: createSingleLevelSeeds("test-key-", 1, 210, 3, () => "^.+$"),
  previewSet: createSingleLevelSeeds("check-key-", 1, 15, 2, (padded) => {
    if (padded === "01") {
      return "^[A-Z]{2}\\d{4}$";
    }
    if (padded === "02") {
      return "^1[3-9]\\d{9}$";
    }
    return `^VALUE_${padded}.+$`;
  }),
  hoverKeys: createSingleLevelSeeds("field-key", 1, 4, 1, () => "^.+$"),
  deleteReference: [
    namedSeed(["del", "key", "a"], "^[A-Z]+$"),
    namedSeed(["del", "key", "b"], "^\\d+$"),
  ],
  previewDelete: [
    namedSeed(["preview", "key", "x"], "^[0-9]+$"),
    namedSeed(["preview", "key", "y"], "^[a-z]+$"),
  ],
  metaVersion: [namedSeed(["meta", "version"], "^v\\d+\\.\\d+$")],
  logLevel: [
    namedSeed(["log", "level"], "^(INFO|WARN|ERROR)$"),
    namedSeed(["log", "code"], "^[A-Z]{3}\\d{5}$"),
  ],
} as const satisfies Record<string, readonly JsonValidationSeed[]>;

export const P0_PASS_SCENARIO: JsonRuleScenario = {
  tableName: MAIN_PASS_TABLE,
  packageName: "P0主流程测试包",
  taskName: "json格式校验任务_P0通过",
  field: "info",
  selectedKeyPaths: ["person-name", "person-age"],
  ruleStrength: "强规则",
  keyPresets: ["personHierarchy"],
};

export const P0_FAIL_SCENARIO: JsonRuleScenario = {
  tableName: MAIN_FAIL_TABLE,
  packageName: "校验不通过测试包",
  taskName: "json格式校验任务_P0不通过",
  field: "info",
  selectedKeyPaths: ["person-name", "person-age"],
  ruleStrength: "强规则",
  keyPresets: ["personHierarchy"],
};

export const REPORT_PASS_SCENARIO: JsonRuleScenario = {
  tableName: REPORT_PASS_TABLE,
  packageName: "报告通过测试包",
  taskName: "报告通过展示任务",
  field: "info",
  selectedKeyPaths: ["meta-version"],
  ruleStrength: "强规则",
  keyPresets: ["metaVersion"],
};

export const REPORT_FAIL_SCENARIO: JsonRuleScenario = {
  tableName: REPORT_FAIL_TABLE,
  packageName: "报告不通过测试包",
  taskName: "报告不通过展示任务",
  field: "log_info",
  selectedKeyPaths: ["log-level", "log-code"],
  ruleStrength: "强规则",
  keyPresets: ["logLevel"],
};

export const DELETE_REFERENCE_SCENARIO: JsonRuleScenario = {
  tableName: DELETE_REFERENCE_TABLE,
  packageName: "key删除测试包",
  taskName: "key删除影响测试任务",
  field: "del_info",
  selectedKeyPaths: ["del-key-a", "del-key-b"],
  ruleStrength: "强规则",
  keyPresets: ["deleteReference"],
};

export const PREVIEW_DELETE_SCENARIO: JsonRuleScenario = {
  tableName: PREVIEW_DELETE_TABLE,
  packageName: "key删除预览测试包",
  taskName: "key删除预览测试任务",
  field: "preview_info",
  selectedKeyPaths: ["preview-key-x", "preview-key-y"],
  ruleStrength: "强规则",
  keyPresets: ["previewDelete"],
};

export function getJsonValidationDataSourceType(datasource = getCurrentDatasource()): number {
  switch (datasource.id) {
    case "doris3.x":
      return DORIS3X_SOURCE_TYPE;
    case "sparkthrift2.x":
      return SPARKTHRIFT2X_SOURCE_TYPE;
    default:
      return HIVE2X_SOURCE_TYPE;
  }
}

export async function runSuitePreconditions(
  page: Page,
  datasource = getCurrentDatasource(),
): Promise<void> {
  const cacheKey = `json-format:${datasource.cacheKey}`;
  if (preconditionsReady.has(cacheKey)) {
    return;
  }

  await applyRuntimeCookies(page);
  process.stderr.write(`[preconditions] Preparing ${datasource.reportName} tables...\n`);
  await runRetriablePreconditions({
    reportName: datasource.reportName,
    projectNames: ["pw_test", "pw"],
    wait: async (ms) => page.waitForTimeout(ms),
    log: (message) => process.stderr.write(message),
    runForProject: async (projectName) => {
      await setupPreconditions(page, {
        datasourceType: datasource.preconditionType,
        tables: TABLE_DEFINITIONS.map((table) => ({
          name: table.name,
          sql: table.sqlByDatasource[datasource.id],
        })),
        projectName,
        syncTimeout: getMetadataSyncTimeoutSeconds(),
      });
    },
  });
  preconditionsReady.add(cacheKey);
}
