process.env.QA_DATASOURCE_MATRIX ??= "sparkthrift2.x";

import type { Page } from "@playwright/test";
import { setupPreconditions } from "../../helpers/preconditions";
import { applyRuntimeCookies } from "../../helpers/test-setup";
import type { DatasourceConfig as BaseDatasourceConfig } from "../有效性-取值范围枚举范围规则/test-data";

const base = await import("../有效性-取值范围枚举范围规则/test-data");

export type DatasourceConfig = BaseDatasourceConfig;
export const ACTIVE_DATASOURCES = base.ACTIVE_DATASOURCES;
export const clearCurrentDatasource = base.clearCurrentDatasource;
export const getCurrentDatasource = base.getCurrentDatasource;
export const injectProjectContext = base.injectProjectContext;
export const resolveEffectiveQualityProjectId =
  base.resolveEffectiveQualityProjectId;
export const resolveVariantName = base.resolveVariantName;
export const setCurrentDatasource = base.setCurrentDatasource;

export const SUITE_NAME =
  "【内置规则丰富】有效性，json中key对应的value值格式校验";
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

const RULE_CONFIG_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_json_rule_config;
CREATE TABLE pw_test.quality_test_json_rule_config (
  id INT,
  info STRING,
  name VARCHAR(255)
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_json_rule_config
SELECT 1, '{"person":{"name":"张三","age":"25","email":"test@example.com"}}', 'row1'
UNION ALL
SELECT 2, '{"person":{"name":"李四","age":"30","email":"admin@test.com"}}', 'row2';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_json_rule_config;
CREATE TABLE quality_test_json_rule_config (
  id INT NOT NULL,
  info JSON,
  name VARCHAR(255)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_json_rule_config VALUES
  (1, '{"person":{"name":"张三","age":"25","email":"test@example.com"}}', 'row1'),
  (2, '{"person":{"name":"李四","age":"30","email":"admin@test.com"}}', 'row2');
`.trim(),
};

const MULTI_TYPE_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_json_multi_type;
CREATE TABLE pw_test.quality_test_json_multi_type (
  id INT,
  name VARCHAR(255),
  age INT,
  salary DECIMAL(10,2),
  info STRING,
  created_at TIMESTAMP
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_json_multi_type
SELECT 1, '张三', 25, 88.80, '{"person":{"name":"张三"}}', TIMESTAMP '2026-04-21 10:00:00';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_json_multi_type;
CREATE TABLE quality_test_json_multi_type (
  id INT NOT NULL,
  name VARCHAR(255),
  age INT,
  salary DECIMAL(10,2),
  info JSON,
  created_at DATETIME
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_json_multi_type VALUES
  (1, '张三', 25, 88.80, '{"person":{"name":"张三"}}', '2026-04-21 10:00:00');
`.trim(),
};

const MAIN_PASS_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_json_main_pass;
CREATE TABLE pw_test.quality_test_json_main_pass (
  id INT,
  info STRING,
  name VARCHAR(255)
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_json_main_pass
SELECT 1, '{"person":{"name":"张三","age":"25","email":"test@example.com"}}', 'row1'
UNION ALL
SELECT 2, '{"person":{"name":"李四","age":"30","email":"admin@test.com"}}', 'row2';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_json_main_pass;
CREATE TABLE quality_test_json_main_pass (
  id INT NOT NULL,
  info JSON,
  name VARCHAR(255)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_json_main_pass VALUES
  (1, '{"person":{"name":"张三","age":"25","email":"test@example.com"}}', 'row1'),
  (2, '{"person":{"name":"李四","age":"30","email":"admin@test.com"}}', 'row2');
`.trim(),
};

const MAIN_FAIL_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_json_main_fail;
CREATE TABLE pw_test.quality_test_json_main_fail (
  id INT,
  info STRING,
  remark VARCHAR(255)
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_json_main_fail
SELECT 1, '{"person":{"name":"张三","age":"25","email":"test@example.com"}}', 'row_valid'
UNION ALL
SELECT 2, '{"person":{"name":"Tom","age":"18","email":"test@example.com"}}', 'row_invalid_name'
UNION ALL
SELECT 3, '{"person":{"name":"王五","age":"1000","email":"ops@test.com"}}', 'row_invalid_age';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_json_main_fail;
CREATE TABLE quality_test_json_main_fail (
  id INT NOT NULL,
  info JSON,
  remark VARCHAR(255)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_json_main_fail VALUES
  (1, '{"person":{"name":"张三","age":"25","email":"test@example.com"}}', 'row_valid'),
  (2, '{"person":{"name":"Tom","age":"18","email":"test@example.com"}}', 'row_invalid_name'),
  (3, '{"person":{"name":"王五","age":"1000","email":"ops@test.com"}}', 'row_invalid_age');
`.trim(),
};

const REPORT_PASS_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_json_report_pass;
CREATE TABLE pw_test.quality_test_json_report_pass (
  id INT,
  info STRING
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_json_report_pass
SELECT 1, '{"meta":{"version":"v1.0"}}'
UNION ALL
SELECT 2, '{"meta":{"version":"v2.3"}}';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_json_report_pass;
CREATE TABLE quality_test_json_report_pass (
  id INT NOT NULL,
  info JSON
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_json_report_pass VALUES
  (1, '{"meta":{"version":"v1.0"}}'),
  (2, '{"meta":{"version":"v2.3"}}');
`.trim(),
};

const REPORT_FAIL_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_json_report_fail;
CREATE TABLE pw_test.quality_test_json_report_fail (
  id INT,
  log_info STRING
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_json_report_fail
SELECT 1, '{"log":{"level":"INFO","code":"ERR00001"}}'
UNION ALL
SELECT 2, '{"log":{"level":"DEBUG","code":"invalid"}}';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_json_report_fail;
CREATE TABLE quality_test_json_report_fail (
  id INT NOT NULL,
  log_info JSON
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_json_report_fail VALUES
  (1, '{"log":{"level":"INFO","code":"ERR00001"}}'),
  (2, '{"log":{"level":"DEBUG","code":"invalid"}}');
`.trim(),
};

const DELETE_REFERENCE_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_json_delete_ref;
CREATE TABLE pw_test.quality_test_json_delete_ref (
  id INT,
  del_info STRING
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_json_delete_ref
SELECT 1, '{"del":{"key":{"a":"ABC","b":"123"}}}';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_json_delete_ref;
CREATE TABLE quality_test_json_delete_ref (
  id INT NOT NULL,
  del_info JSON
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_json_delete_ref VALUES
  (1, '{"del":{"key":{"a":"ABC","b":"123"}}}');
`.trim(),
};

const PREVIEW_DELETE_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS pw_test.quality_test_json_preview_del;
CREATE TABLE pw_test.quality_test_json_preview_del (
  id INT,
  preview_info STRING
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.quality_test_json_preview_del
SELECT 1, '{"preview":{"key":{"x":"123","y":"abc"}}}'
UNION ALL
SELECT 2, '{"preview":{"key":{"x":"456","y":"def"}}}';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS quality_test_json_preview_del;
CREATE TABLE quality_test_json_preview_del (
  id INT NOT NULL,
  preview_info JSON
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_json_preview_del VALUES
  (1, '{"preview":{"key":{"x":"123","y":"abc"}}}'),
  (2, '{"preview":{"key":{"x":"456","y":"def"}}}');
`.trim(),
};

const TABLE_DEFINITIONS: readonly TableDefinition[] = [
  { name: "quality_test_json_rule_config", sqlByDatasource: RULE_CONFIG_SQL },
  { name: "quality_test_json_multi_type", sqlByDatasource: MULTI_TYPE_SQL },
  { name: "quality_test_json_main_pass", sqlByDatasource: MAIN_PASS_SQL },
  { name: "quality_test_json_main_fail", sqlByDatasource: MAIN_FAIL_SQL },
  { name: "quality_test_json_report_pass", sqlByDatasource: REPORT_PASS_SQL },
  { name: "quality_test_json_report_fail", sqlByDatasource: REPORT_FAIL_SQL },
  {
    name: "quality_test_json_delete_ref",
    sqlByDatasource: DELETE_REFERENCE_SQL,
  },
  {
    name: "quality_test_json_preview_del",
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

function namedSeed(
  path: readonly string[],
  value?: string,
): JsonValidationSeed {
  return value
    ? { path, name: path.join("-"), value }
    : { path, name: path.join("-") };
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
  addressHierarchy: [
    namedSeed(["address"]),
    namedSeed(["address", "city"], "^.{1,20}$"),
  ],
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
  tableName: "quality_test_json_main_pass",
  packageName: "P0主流程测试包",
  taskName: "json格式校验任务_P0通过",
  field: "info",
  selectedKeyPaths: ["person-name", "person-age"],
  ruleStrength: "强规则",
  keyPresets: ["personHierarchy"],
};

export const P0_FAIL_SCENARIO: JsonRuleScenario = {
  tableName: "quality_test_json_main_fail",
  packageName: "校验不通过测试包",
  taskName: "json格式校验任务_P0不通过",
  field: "info",
  selectedKeyPaths: ["person-name", "person-age"],
  ruleStrength: "强规则",
  keyPresets: ["personHierarchy"],
};

export const REPORT_PASS_SCENARIO: JsonRuleScenario = {
  tableName: "quality_test_json_report_pass",
  packageName: "报告通过测试包",
  taskName: "报告通过展示任务",
  field: "info",
  selectedKeyPaths: ["meta-version"],
  ruleStrength: "强规则",
  keyPresets: ["metaVersion"],
};

export const REPORT_FAIL_SCENARIO: JsonRuleScenario = {
  tableName: "quality_test_json_report_fail",
  packageName: "报告不通过测试包",
  taskName: "报告不通过展示任务",
  field: "log_info",
  selectedKeyPaths: ["log-level", "log-code"],
  ruleStrength: "强规则",
  keyPresets: ["logLevel"],
};

export const DELETE_REFERENCE_SCENARIO: JsonRuleScenario = {
  tableName: "quality_test_json_delete_ref",
  packageName: "key删除测试包",
  taskName: "key删除影响测试任务",
  field: "del_info",
  selectedKeyPaths: ["del-key-a", "del-key-b"],
  ruleStrength: "强规则",
  keyPresets: ["deleteReference"],
};

export const PREVIEW_DELETE_SCENARIO: JsonRuleScenario = {
  tableName: "quality_test_json_preview_del",
  packageName: "key删除预览测试包",
  taskName: "key删除预览测试任务",
  field: "preview_info",
  selectedKeyPaths: ["preview-key-x", "preview-key-y"],
  ruleStrength: "强规则",
  keyPresets: ["previewDelete"],
};

export function getJsonValidationDataSourceType(
  datasource = getCurrentDatasource(),
): number {
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
  try {
    await setupPreconditions(page, {
      datasourceType: datasource.preconditionType,
      tables: TABLE_DEFINITIONS.map((table) => ({
        name: table.name,
        sql: table.sqlByDatasource[datasource.id],
      })),
      projectName: "pw_test",
      syncTimeout: getMetadataSyncTimeoutSeconds(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Metadata sync timed out")) {
      throw error;
    }
    process.stderr.write(
      `[preconditions] ${datasource.reportName} metadata sync timed out, continuing with existing synced metadata.\n`,
    );
  }
  preconditionsReady.add(cacheKey);
}
