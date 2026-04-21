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

const TABLE_DEFINITIONS: readonly TableDefinition[] = [
  { name: "quality_test_json_rule_config", sqlByDatasource: RULE_CONFIG_SQL },
  { name: "quality_test_json_multi_type", sqlByDatasource: MULTI_TYPE_SQL },
  { name: "quality_test_json_main_pass", sqlByDatasource: MAIN_PASS_SQL },
  { name: "quality_test_json_main_fail", sqlByDatasource: MAIN_FAIL_SQL },
  { name: "quality_test_json_report_pass", sqlByDatasource: REPORT_PASS_SQL },
  { name: "quality_test_json_report_fail", sqlByDatasource: REPORT_FAIL_SQL },
] as const;

const preconditionsReady = new Set<string>();

export const JSON_KEY_PRESETS = {
  personHierarchy: [
    { path: ["person"], name: "人员" },
    { path: ["person", "name"], name: "人员姓名", value: "^[\\u4e00-\\u9fa5]+$" },
    { path: ["person", "age"], name: "人员年龄", value: "^\\d{1,3}$" },
    { path: ["person", "email"], name: "人员邮箱" },
  ],
  productSelection: [
    { path: ["product", "name"], name: "产品名称", value: "^.{1,50}$" },
    { path: ["product", "code"], name: "产品编码", value: "^[A-Z]{2}\\d{6}$" },
    { path: ["product", "desc"], name: "产品描述" },
  ],
  multiSelect: [
    { path: ["user", "name"], name: "用户姓名", value: "^[\\u4e00-\\u9fa5a-zA-Z]{1,20}$" },
    { path: ["user", "phone"], name: "用户手机号", value: "^1[3-9]\\d{9}$" },
    { path: ["user", "id"], name: "用户身份证号", value: "^\\d{18}$" },
  ],
  searchBasic: [
    { path: ["order", "amount"], name: "订单金额", value: "^\\d+\\.\\d{2}$" },
    { path: ["order", "status"], name: "订单状态", value: "^(paid|pending)$" },
    { path: ["user", "name"], name: "用户姓名", value: "^.{1,20}$" },
  ],
  largeKeySet: [
    { path: ["test-key-001"], name: "测试键001", value: "^.+$" },
    { path: ["test-key-002"], name: "测试键002", value: "^.+$" },
    { path: ["test-key-003"], name: "测试键003", value: "^.+$" },
    { path: ["test-key-004"], name: "测试键004", value: "^.+$" },
    { path: ["test-key-005"], name: "测试键005", value: "^.+$" },
    { path: ["test-key-006"], name: "测试键006", value: "^.+$" },
    { path: ["test-key-007"], name: "测试键007", value: "^.+$" },
    { path: ["test-key-008"], name: "测试键008", value: "^.+$" },
    { path: ["test-key-009"], name: "测试键009", value: "^.+$" },
    { path: ["test-key-010"], name: "测试键010", value: "^.+$" },
    { path: ["test-key-011"], name: "测试键011", value: "^.+$" },
    { path: ["test-key-012"], name: "测试键012", value: "^.+$" },
    { path: ["test-key-013"], name: "测试键013", value: "^.+$" },
    { path: ["test-key-014"], name: "测试键014", value: "^.+$" },
    { path: ["test-key-015"], name: "测试键015", value: "^.+$" },
    { path: ["test-key-016"], name: "测试键016", value: "^.+$" },
    { path: ["test-key-017"], name: "测试键017", value: "^.+$" },
    { path: ["test-key-018"], name: "测试键018", value: "^.+$" },
    { path: ["test-key-019"], name: "测试键019", value: "^.+$" },
    { path: ["test-key-020"], name: "测试键020", value: "^.+$" },
    { path: ["test-key-021"], name: "测试键021", value: "^.+$" },
    { path: ["test-key-022"], name: "测试键022", value: "^.+$" },
    { path: ["test-key-023"], name: "测试键023", value: "^.+$" },
    { path: ["test-key-024"], name: "测试键024", value: "^.+$" },
    { path: ["test-key-025"], name: "测试键025", value: "^.+$" },
    { path: ["test-key-026"], name: "测试键026", value: "^.+$" },
    { path: ["test-key-027"], name: "测试键027", value: "^.+$" },
    { path: ["test-key-028"], name: "测试键028", value: "^.+$" },
    { path: ["test-key-029"], name: "测试键029", value: "^.+$" },
    { path: ["test-key-030"], name: "测试键030", value: "^.+$" },
    { path: ["test-key-031"], name: "测试键031", value: "^.+$" },
    { path: ["test-key-032"], name: "测试键032", value: "^.+$" },
    { path: ["test-key-033"], name: "测试键033", value: "^.+$" },
    { path: ["test-key-034"], name: "测试键034", value: "^.+$" },
    { path: ["test-key-035"], name: "测试键035", value: "^.+$" },
    { path: ["test-key-036"], name: "测试键036", value: "^.+$" },
    { path: ["test-key-037"], name: "测试键037", value: "^.+$" },
    { path: ["test-key-038"], name: "测试键038", value: "^.+$" },
    { path: ["test-key-039"], name: "测试键039", value: "^.+$" },
    { path: ["test-key-040"], name: "测试键040", value: "^.+$" },
    { path: ["test-key-041"], name: "测试键041", value: "^.+$" },
    { path: ["test-key-042"], name: "测试键042", value: "^.+$" },
    { path: ["test-key-043"], name: "测试键043", value: "^.+$" },
    { path: ["test-key-044"], name: "测试键044", value: "^.+$" },
    { path: ["test-key-045"], name: "测试键045", value: "^.+$" },
    { path: ["test-key-046"], name: "测试键046", value: "^.+$" },
    { path: ["test-key-047"], name: "测试键047", value: "^.+$" },
    { path: ["test-key-048"], name: "测试键048", value: "^.+$" },
    { path: ["test-key-049"], name: "测试键049", value: "^.+$" },
    { path: ["test-key-050"], name: "测试键050", value: "^.+$" },
    { path: ["test-key-051"], name: "测试键051", value: "^.+$" },
    { path: ["test-key-052"], name: "测试键052", value: "^.+$" },
    { path: ["test-key-053"], name: "测试键053", value: "^.+$" },
    { path: ["test-key-054"], name: "测试键054", value: "^.+$" },
    { path: ["test-key-055"], name: "测试键055", value: "^.+$" },
    { path: ["test-key-056"], name: "测试键056", value: "^.+$" },
    { path: ["test-key-057"], name: "测试键057", value: "^.+$" },
    { path: ["test-key-058"], name: "测试键058", value: "^.+$" },
    { path: ["test-key-059"], name: "测试键059", value: "^.+$" },
    { path: ["test-key-060"], name: "测试键060", value: "^.+$" },
    { path: ["test-key-061"], name: "测试键061", value: "^.+$" },
    { path: ["test-key-062"], name: "测试键062", value: "^.+$" },
    { path: ["test-key-063"], name: "测试键063", value: "^.+$" },
    { path: ["test-key-064"], name: "测试键064", value: "^.+$" },
    { path: ["test-key-065"], name: "测试键065", value: "^.+$" },
    { path: ["test-key-066"], name: "测试键066", value: "^.+$" },
    { path: ["test-key-067"], name: "测试键067", value: "^.+$" },
    { path: ["test-key-068"], name: "测试键068", value: "^.+$" },
    { path: ["test-key-069"], name: "测试键069", value: "^.+$" },
    { path: ["test-key-070"], name: "测试键070", value: "^.+$" },
    { path: ["test-key-071"], name: "测试键071", value: "^.+$" },
    { path: ["test-key-072"], name: "测试键072", value: "^.+$" },
    { path: ["test-key-073"], name: "测试键073", value: "^.+$" },
    { path: ["test-key-074"], name: "测试键074", value: "^.+$" },
    { path: ["test-key-075"], name: "测试键075", value: "^.+$" },
    { path: ["test-key-076"], name: "测试键076", value: "^.+$" },
    { path: ["test-key-077"], name: "测试键077", value: "^.+$" },
    { path: ["test-key-078"], name: "测试键078", value: "^.+$" },
    { path: ["test-key-079"], name: "测试键079", value: "^.+$" },
    { path: ["test-key-080"], name: "测试键080", value: "^.+$" },
    { path: ["test-key-081"], name: "测试键081", value: "^.+$" },
    { path: ["test-key-082"], name: "测试键082", value: "^.+$" },
    { path: ["test-key-083"], name: "测试键083", value: "^.+$" },
    { path: ["test-key-084"], name: "测试键084", value: "^.+$" },
    { path: ["test-key-085"], name: "测试键085", value: "^.+$" },
    { path: ["test-key-086"], name: "测试键086", value: "^.+$" },
    { path: ["test-key-087"], name: "测试键087", value: "^.+$" },
    { path: ["test-key-088"], name: "测试键088", value: "^.+$" },
    { path: ["test-key-089"], name: "测试键089", value: "^.+$" },
    { path: ["test-key-090"], name: "测试键090", value: "^.+$" },
    { path: ["test-key-091"], name: "测试键091", value: "^.+$" },
    { path: ["test-key-092"], name: "测试键092", value: "^.+$" },
    { path: ["test-key-093"], name: "测试键093", value: "^.+$" },
    { path: ["test-key-094"], name: "测试键094", value: "^.+$" },
    { path: ["test-key-095"], name: "测试键095", value: "^.+$" },
    { path: ["test-key-096"], name: "测试键096", value: "^.+$" },
    { path: ["test-key-097"], name: "测试键097", value: "^.+$" },
    { path: ["test-key-098"], name: "测试键098", value: "^.+$" },
    { path: ["test-key-099"], name: "测试键099", value: "^.+$" },
    { path: ["test-key-100"], name: "测试键100", value: "^.+$" },
    { path: ["test-key-101"], name: "测试键101", value: "^.+$" },
    { path: ["test-key-102"], name: "测试键102", value: "^.+$" },
    { path: ["test-key-103"], name: "测试键103", value: "^.+$" },
    { path: ["test-key-104"], name: "测试键104", value: "^.+$" },
    { path: ["test-key-105"], name: "测试键105", value: "^.+$" },
    { path: ["test-key-106"], name: "测试键106", value: "^.+$" },
    { path: ["test-key-107"], name: "测试键107", value: "^.+$" },
    { path: ["test-key-108"], name: "测试键108", value: "^.+$" },
    { path: ["test-key-109"], name: "测试键109", value: "^.+$" },
    { path: ["test-key-110"], name: "测试键110", value: "^.+$" },
    { path: ["test-key-111"], name: "测试键111", value: "^.+$" },
    { path: ["test-key-112"], name: "测试键112", value: "^.+$" },
    { path: ["test-key-113"], name: "测试键113", value: "^.+$" },
    { path: ["test-key-114"], name: "测试键114", value: "^.+$" },
    { path: ["test-key-115"], name: "测试键115", value: "^.+$" },
    { path: ["test-key-116"], name: "测试键116", value: "^.+$" },
    { path: ["test-key-117"], name: "测试键117", value: "^.+$" },
    { path: ["test-key-118"], name: "测试键118", value: "^.+$" },
    { path: ["test-key-119"], name: "测试键119", value: "^.+$" },
    { path: ["test-key-120"], name: "测试键120", value: "^.+$" },
    { path: ["test-key-121"], name: "测试键121", value: "^.+$" },
    { path: ["test-key-122"], name: "测试键122", value: "^.+$" },
    { path: ["test-key-123"], name: "测试键123", value: "^.+$" },
    { path: ["test-key-124"], name: "测试键124", value: "^.+$" },
    { path: ["test-key-125"], name: "测试键125", value: "^.+$" },
    { path: ["test-key-126"], name: "测试键126", value: "^.+$" },
    { path: ["test-key-127"], name: "测试键127", value: "^.+$" },
    { path: ["test-key-128"], name: "测试键128", value: "^.+$" },
    { path: ["test-key-129"], name: "测试键129", value: "^.+$" },
    { path: ["test-key-130"], name: "测试键130", value: "^.+$" },
    { path: ["test-key-131"], name: "测试键131", value: "^.+$" },
    { path: ["test-key-132"], name: "测试键132", value: "^.+$" },
    { path: ["test-key-133"], name: "测试键133", value: "^.+$" },
    { path: ["test-key-134"], name: "测试键134", value: "^.+$" },
    { path: ["test-key-135"], name: "测试键135", value: "^.+$" },
    { path: ["test-key-136"], name: "测试键136", value: "^.+$" },
    { path: ["test-key-137"], name: "测试键137", value: "^.+$" },
    { path: ["test-key-138"], name: "测试键138", value: "^.+$" },
    { path: ["test-key-139"], name: "测试键139", value: "^.+$" },
    { path: ["test-key-140"], name: "测试键140", value: "^.+$" },
    { path: ["test-key-141"], name: "测试键141", value: "^.+$" },
    { path: ["test-key-142"], name: "测试键142", value: "^.+$" },
    { path: ["test-key-143"], name: "测试键143", value: "^.+$" },
    { path: ["test-key-144"], name: "测试键144", value: "^.+$" },
    { path: ["test-key-145"], name: "测试键145", value: "^.+$" },
    { path: ["test-key-146"], name: "测试键146", value: "^.+$" },
    { path: ["test-key-147"], name: "测试键147", value: "^.+$" },
    { path: ["test-key-148"], name: "测试键148", value: "^.+$" },
    { path: ["test-key-149"], name: "测试键149", value: "^.+$" },
    { path: ["test-key-150"], name: "测试键150", value: "^.+$" },
    { path: ["test-key-151"], name: "测试键151", value: "^.+$" },
    { path: ["test-key-152"], name: "测试键152", value: "^.+$" },
    { path: ["test-key-153"], name: "测试键153", value: "^.+$" },
    { path: ["test-key-154"], name: "测试键154", value: "^.+$" },
    { path: ["test-key-155"], name: "测试键155", value: "^.+$" },
    { path: ["test-key-156"], name: "测试键156", value: "^.+$" },
    { path: ["test-key-157"], name: "测试键157", value: "^.+$" },
    { path: ["test-key-158"], name: "测试键158", value: "^.+$" },
    { path: ["test-key-159"], name: "测试键159", value: "^.+$" },
    { path: ["test-key-160"], name: "测试键160", value: "^.+$" },
    { path: ["test-key-161"], name: "测试键161", value: "^.+$" },
    { path: ["test-key-162"], name: "测试键162", value: "^.+$" },
    { path: ["test-key-163"], name: "测试键163", value: "^.+$" },
    { path: ["test-key-164"], name: "测试键164", value: "^.+$" },
    { path: ["test-key-165"], name: "测试键165", value: "^.+$" },
    { path: ["test-key-166"], name: "测试键166", value: "^.+$" },
    { path: ["test-key-167"], name: "测试键167", value: "^.+$" },
    { path: ["test-key-168"], name: "测试键168", value: "^.+$" },
    { path: ["test-key-169"], name: "测试键169", value: "^.+$" },
    { path: ["test-key-170"], name: "测试键170", value: "^.+$" },
    { path: ["test-key-171"], name: "测试键171", value: "^.+$" },
    { path: ["test-key-172"], name: "测试键172", value: "^.+$" },
    { path: ["test-key-173"], name: "测试键173", value: "^.+$" },
    { path: ["test-key-174"], name: "测试键174", value: "^.+$" },
    { path: ["test-key-175"], name: "测试键175", value: "^.+$" },
    { path: ["test-key-176"], name: "测试键176", value: "^.+$" },
    { path: ["test-key-177"], name: "测试键177", value: "^.+$" },
    { path: ["test-key-178"], name: "测试键178", value: "^.+$" },
    { path: ["test-key-179"], name: "测试键179", value: "^.+$" },
    { path: ["test-key-180"], name: "测试键180", value: "^.+$" },
    { path: ["test-key-181"], name: "测试键181", value: "^.+$" },
    { path: ["test-key-182"], name: "测试键182", value: "^.+$" },
    { path: ["test-key-183"], name: "测试键183", value: "^.+$" },
    { path: ["test-key-184"], name: "测试键184", value: "^.+$" },
    { path: ["test-key-185"], name: "测试键185", value: "^.+$" },
    { path: ["test-key-186"], name: "测试键186", value: "^.+$" },
    { path: ["test-key-187"], name: "测试键187", value: "^.+$" },
    { path: ["test-key-188"], name: "测试键188", value: "^.+$" },
    { path: ["test-key-189"], name: "测试键189", value: "^.+$" },
    { path: ["test-key-190"], name: "测试键190", value: "^.+$" },
    { path: ["test-key-191"], name: "测试键191", value: "^.+$" },
    { path: ["test-key-192"], name: "测试键192", value: "^.+$" },
    { path: ["test-key-193"], name: "测试键193", value: "^.+$" },
    { path: ["test-key-194"], name: "测试键194", value: "^.+$" },
    { path: ["test-key-195"], name: "测试键195", value: "^.+$" },
    { path: ["test-key-196"], name: "测试键196", value: "^.+$" },
    { path: ["test-key-197"], name: "测试键197", value: "^.+$" },
    { path: ["test-key-198"], name: "测试键198", value: "^.+$" },
    { path: ["test-key-199"], name: "测试键199", value: "^.+$" },
    { path: ["test-key-200"], name: "测试键200", value: "^.+$" },
    { path: ["test-key-201"], name: "测试键201", value: "^.+$" },
    { path: ["test-key-202"], name: "测试键202", value: "^.+$" },
    { path: ["test-key-203"], name: "测试键203", value: "^.+$" },
    { path: ["test-key-204"], name: "测试键204", value: "^.+$" },
    { path: ["test-key-205"], name: "测试键205", value: "^.+$" },
    { path: ["test-key-206"], name: "测试键206", value: "^.+$" },
    { path: ["test-key-207"], name: "测试键207", value: "^.+$" },
    { path: ["test-key-208"], name: "测试键208", value: "^.+$" },
    { path: ["test-key-209"], name: "测试键209", value: "^.+$" },
    { path: ["test-key-210"], name: "测试键210", value: "^.+$" },
  ],
  previewSet: [
    { path: ["check-key-01"], name: "校验键01", value: "^[A-Z]{2}\\d{4}$" },
    { path: ["check-key-02"], name: "校验键02", value: "^1[3-9]\\d{9}$" },
    { path: ["check-key-03"], name: "校验键03", value: "^VALUE_03.+$" },
    { path: ["check-key-04"], name: "校验键04", value: "^VALUE_04.+$" },
    { path: ["check-key-05"], name: "校验键05", value: "^VALUE_05.+$" },
    { path: ["check-key-06"], name: "校验键06", value: "^VALUE_06.+$" },
    { path: ["check-key-07"], name: "校验键07", value: "^VALUE_07.+$" },
    { path: ["check-key-08"], name: "校验键08", value: "^VALUE_08.+$" },
    { path: ["check-key-09"], name: "校验键09", value: "^VALUE_09.+$" },
    { path: ["check-key-10"], name: "校验键10", value: "^VALUE_10.+$" },
    { path: ["check-key-11"], name: "校验键11", value: "^VALUE_11.+$" },
    { path: ["check-key-12"], name: "校验键12", value: "^VALUE_12.+$" },
    { path: ["check-key-13"], name: "校验键13", value: "^VALUE_13.+$" },
    { path: ["check-key-14"], name: "校验键14", value: "^VALUE_14.+$" },
    { path: ["check-key-15"], name: "校验键15", value: "^VALUE_15.+$" },
  ],
  metaVersion: [
    { path: ["meta", "version"], name: "版本号", value: "^v\\d+\\.\\d+$" },
  ],
  logLevel: [
    { path: ["log", "level"], name: "日志级别", value: "^(INFO|WARN|ERROR)$" },
    { path: ["log", "code"], name: "日志编码", value: "^[A-Z]{3}\\d{5}$" },
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
  await setupPreconditions(page, {
    datasourceType: datasource.preconditionType,
    tables: TABLE_DEFINITIONS.map((table) => ({
      name: table.name,
      sql: table.sqlByDatasource[datasource.id],
    })),
    projectName: "pw_test",
    syncTimeout: 90,
  });
  preconditionsReady.add(cacheKey);
}
