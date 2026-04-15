/**
 * 共享测试数据 & 前置条件
 * 「有效性-取值范围枚举范围规则」全部 27 条用例的公共依赖
 */
import type { Page } from "@playwright/test";
import { setupPreconditions } from "../../helpers/preconditions";
import { applyRuntimeCookies, normalizeBaseUrl, syncMetadata } from "../../helpers/test-setup";

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

// ── 质量项目名称 ─────────────────────────────────────────────

export const QUALITY_PROJECT_NAME = "Story_15695";
export const QUALITY_PROJECT_ALIAS = "Story_15695";

// ── 前置条件：建表 + 数据源导入 + 元数据同步 ─────────────────

export async function runPreconditions(page: Page): Promise<void> {
  await applyRuntimeCookies(page);

  process.stderr.write("[preconditions] Starting table creation via API...\n");

  await setupPreconditions(page, {
    datasourceType: "Doris",
    tables: ALL_TABLES.map((t) => ({ name: t.name, sql: t.sql })),
    projectName: "pw",
    syncTimeout: 10, // 不依赖 API 同步，改用 UI 同步
  }).catch((err) => {
    process.stderr.write(`[preconditions] API setup partial: ${(err as Error).message}\n`);
  });

  // 通过 UI 自动化执行元数据同步（新建周期同步任务 → 临时同步）
  process.stderr.write("[preconditions] Starting UI-based metadata sync...\n");
  await syncMetadata(page, "doris3").catch((err) => {
    process.stderr.write(`[preconditions] Metadata sync warning: ${(err as Error).message}\n`);
  });

  process.stderr.write("[preconditions] Preconditions complete.\n");
}

// ── 前置条件：质量项目创建 + 数据源授权 ─────────────────────

interface QualityProjectResult {
  readonly projectId: number | null;
  readonly skipped: boolean;
}

/**
 * 确保数据质量项目存在。
 * 如果已存在则跳过创建，返回项目 ID。
 */
export async function ensureQualityProject(
  page: Page,
): Promise<QualityProjectResult> {
  const baseUrl = normalizeBaseUrl("dataAssets");

  // 确保 page 在正确的 origin（cookie 才能生效）
  const currentUrl = page.url();
  if (currentUrl === "about:blank" || !currentUrl.includes(new URL(baseUrl).hostname)) {
    await page.goto(`${baseUrl}/#/dataStandard`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
  }

  const result = await page.evaluate(
    async ({ projectName, projectAlias }) => {
      const headers: HeadersInit = {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      };
      const post = async (url: string, body: unknown) => {
        const resp = await fetch(url, {
          method: "POST",
          credentials: "same-origin",
          headers,
          body: JSON.stringify(body),
        });
        return resp.json() as Promise<{
          code?: number;
          success?: boolean;
          data?: unknown;
          message?: string;
        }>;
      };

      // 1. 查询已有质量项目
      const listResp = await post(
        "/dassets/v1/valid/project/getProjects",
        {},
      );
      const projects = (listResp.data ?? []) as Array<{
        id?: number;
        projectName?: string;
        projectAlias?: string;
      }>;
      const existing = projects.find(
        (p) =>
          p.projectName === projectName || p.projectAlias === projectAlias,
      );
      if (existing?.id) {
        return { projectId: existing.id, skipped: true };
      }

      // 2. 创建质量项目（projectAdminUserId=1 即 admin）
      const createResp = await post(
        "/dassets/v1/valid/project/createProject",
        {
          projectAlias,
          projectName,
          projectAdminUserId: 1,
          projectDesc: `Auto-created for test #15695`,
        },
      );
      if (createResp.code !== 1 && !createResp.success) {
        // 可能已存在（并发场景），再查一次
        const retryResp = await post(
          "/dassets/v1/valid/project/getProjects",
          {},
        );
        const retryProjects = (retryResp.data ?? []) as Array<{
          id?: number;
          projectName?: string;
        }>;
        const retryMatch = retryProjects.find(
          (p) => p.projectName === projectName,
        );
        return {
          projectId: retryMatch?.id ?? null,
          skipped: false,
        };
      }

      // 3. 获取新建的项目 ID
      const afterCreateResp = await post(
        "/dassets/v1/valid/project/getProjects",
        {},
      );
      const afterProjects = (afterCreateResp.data ?? []) as Array<{
        id?: number;
        projectName?: string;
      }>;
      const created = afterProjects.find(
        (p) => p.projectName === projectName,
      );
      return { projectId: created?.id ?? null, skipped: false };
    },
    { projectName: QUALITY_PROJECT_NAME, projectAlias: QUALITY_PROJECT_ALIAS },
  );

  if (result.skipped) {
    process.stderr.write(
      `[preconditions] Quality project "${QUALITY_PROJECT_NAME}" already exists (id=${result.projectId})\n`,
    );
  } else {
    process.stderr.write(
      `[preconditions] Quality project "${QUALITY_PROJECT_NAME}" created (id=${result.projectId})\n`,
    );
  }

  return result;
}

/**
 * 将数据源授权给质量项目。
 * 调用 /dmetadata/v1/dataSource/authDataSourceToProject
 */
export async function authDatasourceToProject(
  page: Page,
  qualityProjectId: number,
): Promise<void> {
  await page.evaluate(
    async ({ projectId }) => {
      const headers: HeadersInit = {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      };
      const post = async (url: string, body: unknown) => {
        const resp = await fetch(url, {
          method: "POST",
          credentials: "same-origin",
          headers,
          body: JSON.stringify(body),
        });
        return resp.json() as Promise<{
          code?: number;
          success?: boolean;
          data?: unknown;
          message?: string;
        }>;
      };

      // 查找已导入到元数据的 Doris 3.x 数据源
      const dsResp = await post(
        "/dmetadata/v1/dataSource/pageQuery",
        { current: 1, size: 50 },
      );
      const rawData = dsResp.data as
        | { contentList?: unknown[]; records?: unknown[]; list?: unknown[] }
        | unknown[];
      const dsList = (
        Array.isArray(rawData) ? rawData
        : (rawData as { contentList?: unknown[]; records?: unknown[]; list?: unknown[] })?.contentList
          ?? (rawData as { contentList?: unknown[]; records?: unknown[]; list?: unknown[] })?.records
          ?? (rawData as { contentList?: unknown[]; records?: unknown[]; list?: unknown[] })?.list
          ?? []
      ) as Array<{
        id?: number | string;
        dataSourceName?: string;
        dataSourceType?: number;
        sourceTypeValue?: string;
      }>;
      // 优先匹配 Doris 3.x 数据源
      const dorisSource = dsList.find(
        (ds) => ds.sourceTypeValue?.includes("Doris3"),
      ) ?? dsList.find(
        (ds) => ds.dataSourceName?.toLowerCase().includes("doris"),
      );
      if (!dorisSource?.id) {
        console.warn("[preconditions] Doris datasource not found in metadata, skipping auth");
        return;
      }

      // 授权数据源到质量项目
      const authResp = await post(
        "/dmetadata/v1/dataSource/authDataSourceToProject",
        {
          dataSourceId: dorisSource.id,
          projectIds: [projectId],
        },
      );
      if (authResp.code !== 1 && !authResp.success) {
        console.warn(
          `[preconditions] Auth datasource failed: ${authResp.message ?? "unknown"}`,
        );
      }
    },
    { projectId: qualityProjectId },
  );

  process.stderr.write(
    `[preconditions] Datasource authorized to quality project (id=${qualityProjectId})\n`,
  );
}
