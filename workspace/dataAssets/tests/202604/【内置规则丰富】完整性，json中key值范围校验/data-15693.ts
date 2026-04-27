/**
 * 共享测试数据 & 常量
 * 「完整性-json中key值范围校验」全部用例的公共依赖
 *
 * 注意：
 *   - 此 suite 依赖已配置的 JSON key 数据（key1 姓名、key2 年龄、key3 性别、key11 省份、key22、key33 等）
 *   - 这些 key 通过 /通用配置/json格式校验管理 页面或 API 维护
 *   - 脚本不负责创建 key，假设环境中已存在
 *   - QUALITY_PROJECT_ID=90 对应当前 dataAssets 套件使用的 pw_test 质量项目
 */
import type { Page } from "@playwright/test";
import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
} from "../../helpers/test-setup";

// ── 质量项目常量 ─────────────────────────────────────────────
export const QUALITY_PROJECT_ID = 90;
export const QUALITY_PROJECT_NAME = "pw_test";

// ── 数据源 & 数据库 ──────────────────────────────────────────
export const SHARED_DATABASE = "pw_test";
export const DORIS_DATABASE = SHARED_DATABASE;
export const SPARKTHRIFT_DATABASE = SHARED_DATABASE;
export const DORIS_DATASOURCE_KEYWORD = "doris";
export const SPARKTHRIFT_DATASOURCE_KEYWORD = "spark|thrift|hadoop";

// ── 测试表 ────────────────────────────────────────────────────
/** key 值范围校验专用测试表（建在 "pw" 数据库下） */
export const KEY_RANGE_TABLE = "test_json_key_range";

/**
 * Key 值范围校验测试表 DDL
 *
 * 说明：
 *   - info      列存放主要 JSON 数据（包含 key1~key33 等 key）
 *   - extra_info 列存放附加 JSON 数据
 *   - Doris 使用 VARCHAR(65533) 代替 JSON 类型（兼容 Doris 3.x）
 */
export const KEY_RANGE_TABLE_SQL = `
DROP TABLE IF EXISTS ${KEY_RANGE_TABLE};
CREATE TABLE ${KEY_RANGE_TABLE} (
  id INT NOT NULL,
  info VARCHAR(65533),
  extra_info VARCHAR(65533)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO ${KEY_RANGE_TABLE} VALUES
  (1, '{"key1":"张三","key2":25,"key3":"男","key11":"北京"}', '{"key22":"A","key33":"X"}'),
  (2, '{"key1":"李四","key2":30,"key3":"女","key11":"上海"}', '{"key22":"B","key33":"Y"}'),
  (3, '{"key1":"王五","key2":22}', '{"key22":"C"}'),
  (4, '{"key2":28,"key3":"男"}', null),
  (5, '{}', '{}')
`.trim();

// ── Re-export 常用 helper ─────────────────────────────────────
export { applyRuntimeCookies, buildDataAssetsUrl };

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
