/**
 * 共享测试数据 & 前置条件
 * 「有效性-取值范围枚举范围规则」全部 27 条用例的公共依赖
 */
import type { Page } from "@playwright/test";
import { setupPreconditions } from "../../helpers/preconditions";
import { applyRuntimeCookies, executeSqlViaBatchDoris } from "../../helpers/test-setup";

// ── SQL 表定义 ─────────────────────────────────────────────

const QUALITY_TEST_NUM_SQL = `
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
  (5, 8.0, '5')
`.trim();

const QUALITY_TEST_NUM_SEED_SQL =
  "INSERT OVERWRITE TABLE quality_test_num VALUES (1, 5.0, '2'), (2, 15.0, '4'), (3, 3.0, '1'), (4, -1.0, '3'), (5, 8.0, '5')";

const QUALITY_TEST_STR_SQL = `
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
  (5, '-1.0', '5')
`.trim();

const QUALITY_TEST_STR_SEED_SQL =
  "INSERT OVERWRITE TABLE quality_test_str VALUES (1, '5', '2'), (2, '5.0', '4'), (3, '15.0', '1'), (4, 'abc', '3'), (5, '-1.0', '5')";

const QUALITY_TEST_SAMPLE_SQL = `
DROP TABLE IF EXISTS quality_test_sample;
CREATE TABLE quality_test_sample (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_sample VALUES
  (1, 5.0, '2'), (2, 15.0, '4'), (3, 3.0, '1'), (4, -1.0, '3'), (5, 8.0, '5'),
  (6, 7.0, '1'), (7, 9.0, '2'), (8, 2.0, '3'), (9, 6.0, '1'), (10, 4.0, '2')
`.trim();

const QUALITY_TEST_SAMPLE_SEED_SQL =
  "INSERT OVERWRITE TABLE quality_test_sample VALUES (1, 5.0, '2'), (2, 15.0, '4'), (3, 3.0, '1'), (4, -1.0, '3'), (5, 8.0, '5'), (6, 7.0, '1'), (7, 9.0, '2'), (8, 2.0, '3'), (9, 6.0, '1'), (10, 4.0, '2')";

const QUALITY_TEST_PARTITION_SQL = `
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
  (1, 5.0, '2', '2026-04-01'), (2, 15.0, '4', '2026-04-01'),
  (3, 3.0, '1', '2026-04-02'), (4, -1.0, '3', '2026-04-02')
`.trim();

const QUALITY_TEST_PARTITION_SEED_SQL =
  "INSERT OVERWRITE TABLE quality_test_partition VALUES (1, 5.0, '2', '2026-04-01'), (2, 15.0, '4', '2026-04-01'), (3, 3.0, '1', '2026-04-02'), (4, -1.0, '3', '2026-04-02')";

const QUALITY_TEST_ENUM_PASS_SQL = `
DROP TABLE IF EXISTS quality_test_enum_pass;
CREATE TABLE quality_test_enum_pass (
  id INT NOT NULL,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_enum_pass VALUES (1, '1'), (2, '2'), (3, '3')
`.trim();

const QUALITY_TEST_ENUM_PASS_SEED_SQL =
  "INSERT OVERWRITE TABLE quality_test_enum_pass VALUES (1, '1'), (2, '2'), (3, '3')";

export const ALL_TABLES = [
  { name: "quality_test_num", sql: QUALITY_TEST_NUM_SQL },
  { name: "quality_test_str", sql: QUALITY_TEST_STR_SQL },
  { name: "quality_test_sample", sql: QUALITY_TEST_SAMPLE_SQL },
  { name: "quality_test_partition", sql: QUALITY_TEST_PARTITION_SQL },
  { name: "quality_test_enum_pass", sql: QUALITY_TEST_ENUM_PASS_SQL },
] as const;
const TABLE_SEED_SQLS = [
  { name: "quality_test_num", sql: QUALITY_TEST_NUM_SEED_SQL },
  { name: "quality_test_str", sql: QUALITY_TEST_STR_SEED_SQL },
  { name: "quality_test_sample", sql: QUALITY_TEST_SAMPLE_SEED_SQL },
  { name: "quality_test_partition", sql: QUALITY_TEST_PARTITION_SEED_SQL },
  { name: "quality_test_enum_pass", sql: QUALITY_TEST_ENUM_PASS_SEED_SQL },
] as const;

// ── 前置条件：建表 + 数据源导入 + 元数据同步 ─────────────────

export async function runPreconditions(page: Page): Promise<void> {
  await applyRuntimeCookies(page);

  process.stderr.write("[preconditions] Starting table creation via API...\n");

  await setupPreconditions(page, {
    datasourceType: "Doris",
    tables: ALL_TABLES.map((t) => ({ name: t.name, sql: t.sql })),
    projectName: QUALITY_PROJECT_NAME,
    syncTimeout: 90, // API 元数据同步轮询超时（秒）
  }).catch((err) => {
    process.stderr.write(`[preconditions] API setup partial: ${(err as Error).message}\n`);
  });

  process.stderr.write("[preconditions] Reseeding Doris tables via batch SQL...\n");
  for (const { name, sql } of TABLE_SEED_SQLS) {
    process.stderr.write(`[preconditions] Overwriting ${name}...\n`);
    await executeSqlViaBatchDoris(
      page,
      sql,
      `seed_${name}_${Date.now().toString(36)}`,
      QUALITY_PROJECT_NAME,
    );
  }

  process.stderr.write("[preconditions] Preconditions complete.\n");
}

// ── 前置条件：找到有 Doris 数据源的质量项目 ─────────────────────

interface QualityProjectResult {
  readonly projectId: number | null;
  readonly projectName: string;
}

// ── 质量项目 ID（环境中已配置 tongmeng_doris3 Doris3.x 数据源的项目）──
export const QUALITY_PROJECT_ID = 87;
export const QUALITY_PROJECT_NAME = "pw_test";

// ── 数据源和数据库配置 ──
export const DORIS_DATASOURCE_KEYWORD = "doris"; // 数据源下拉框匹配关键字
export const DORIS_DATABASE = "pw"; // 建表所在的 Doris 数据库

/**
 * 注入质量项目 ID 到 sessionStorage，确保后续 API 请求携带正确的 X-Valid-Project-ID 头。
 */
export async function injectProjectContext(page: Page, projectId: number): Promise<void> {
  await page.evaluate((pid) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(pid));
  }, projectId);
}
