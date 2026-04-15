/**
 * 共享测试数据 & 前置条件
 * 「有效性-取值范围枚举范围规则」全部 27 条用例的公共依赖
 */
import type { Page } from "@playwright/test";
import { setupPreconditions } from "../../helpers/preconditions";
import { applyRuntimeCookies, normalizeBaseUrl } from "../../helpers/test-setup";

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

const QUALITY_TEST_ENUM_PASS_SQL = `
DROP TABLE IF EXISTS quality_test_enum_pass;
CREATE TABLE quality_test_enum_pass (
  id INT NOT NULL,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO quality_test_enum_pass VALUES (1, '1'), (2, '2'), (3, '3')
`.trim();

export const ALL_TABLES = [
  { name: "quality_test_num", sql: QUALITY_TEST_NUM_SQL },
  { name: "quality_test_str", sql: QUALITY_TEST_STR_SQL },
  { name: "quality_test_sample", sql: QUALITY_TEST_SAMPLE_SQL },
  { name: "quality_test_partition", sql: QUALITY_TEST_PARTITION_SQL },
  { name: "quality_test_enum_pass", sql: QUALITY_TEST_ENUM_PASS_SQL },
] as const;

// ── 前置条件：建表 + 数据源导入 + 元数据同步 ─────────────────

export async function runPreconditions(page: Page): Promise<void> {
  await applyRuntimeCookies(page);

  process.stderr.write("[preconditions] Starting table creation via API...\n");

  await setupPreconditions(page, {
    datasourceType: "Doris",
    tables: ALL_TABLES.map((t) => ({ name: t.name, sql: t.sql })),
    projectName: "pw",
    syncTimeout: 90, // API 元数据同步轮询超时（秒）
  }).catch((err) => {
    process.stderr.write(`[preconditions] API setup partial: ${(err as Error).message}\n`);
  });

  process.stderr.write("[preconditions] Preconditions complete.\n");
}

// ── 前置条件：找到有 Doris 数据源的质量项目 ─────────────────────

interface QualityProjectResult {
  readonly projectId: number | null;
  readonly projectName: string;
}

/**
 * 扫描所有质量项目，返回第一个拥有 Doris 数据源的项目。
 * 避免复杂的数据源授权操作。
 */
export async function findProjectWithDoris(
  page: Page,
): Promise<QualityProjectResult> {
  const baseUrl = normalizeBaseUrl("dataAssets");

  const currentUrl = page.url();
  if (currentUrl === "about:blank" || !currentUrl.includes(new URL(baseUrl).hostname)) {
    await page.goto(`${baseUrl}/#/dataStandard`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
  }

  const result = await page.evaluate(async () => {
    const post = async (url: string, body: unknown, headers: Record<string, string> = {}) => {
      const resp = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json;charset=UTF-8", ...headers },
        body: JSON.stringify(body),
      });
      return resp.json() as Promise<{ code?: number; success?: boolean; data?: unknown }>;
    };

    const projResp = await post("/dassets/v1/valid/project/getProjects", {});
    const projects = (projResp.data ?? []) as Array<{
      id?: string | number;
      projectName?: string;
    }>;

    for (const p of projects) {
      const pid = String(p.id);
      const dsResp = await post(
        "/dmetadata/v1/dataSource/monitor/list", {},
        { "X-Valid-Project-ID": pid },
      );
      const dsList = Array.isArray(dsResp?.data) ? dsResp.data : [];
      const hasDoris = dsList.some(
        (d: { sourceTypeValue?: string }) =>
          d.sourceTypeValue?.includes("Doris") || d.sourceTypeValue?.includes("DORIS"),
      );
      if (hasDoris) {
        return { projectId: Number(p.id), projectName: p.projectName ?? "" };
      }
    }
    return { projectId: null, projectName: "" };
  });

  if (result.projectId) {
    process.stderr.write(
      `[preconditions] Found project with Doris: "${result.projectName}" (id=${result.projectId})\n`,
    );
  } else {
    process.stderr.write(
      "[preconditions] WARNING: No project with Doris datasource found!\n",
    );
  }

  return result;
}

/**
 * 注入质量项目 ID 到 sessionStorage，确保后续 API 请求携带正确的 X-Valid-Project-ID 头。
 */
export async function injectProjectContext(
  page: Page,
  projectId: number,
): Promise<void> {
  await page.evaluate((pid) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(pid));
  }, projectId);
}
