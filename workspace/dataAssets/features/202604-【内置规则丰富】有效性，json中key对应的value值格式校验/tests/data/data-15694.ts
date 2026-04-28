/**
 * 共享测试数据
 * 「#15694 内置规则丰富 - 格式-json格式校验」全部用例的公共依赖
 *
 * 注意：此 suite 依赖已配置了 value格式 的 JSON key 数据。
 * 这些 key 需通过「通用配置 → json格式校验管理」页面手动维护或通过 API 创建。
 * 脚本不负责创建 key，假设环境中已存在：
 *   - person-name：已配置 value格式
 *   - person-age：已配置 value格式
 *   - person-email：未配置 value格式（在 TreeSelect 中显示为 disabled）
 */
import type { Page } from "@playwright/test";
import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
} from "../../../../shared/helpers/test-setup";
import { versionJsonFixtureName } from "./json-fixture-sql";

// ── Re-export 公共工具（方便 helpers 文件直接从此处 import）──────────────────
export {
  applyRuntimeCookies,
  buildDataAssetsUrl,
} from "../../../../shared/helpers/test-setup";

// ── 质量项目配置 ──────────────────────────────────────────────────────────────

/** 当前 dataAssets 套件使用的质量项目 ID */
export const QUALITY_PROJECT_ID = 90;

/** 所有数据源统一使用的测试数据库名 */
export const SHARED_DATABASE = "pw_test";

/** Doris 数据源数据库名 */
export const DORIS_DATABASE = SHARED_DATABASE;

/** SparkThrift2.x 数据源数据库名 */
export const SPARKTHRIFT_DATABASE = SHARED_DATABASE;

/** 数据源匹配关键字 */
export const DORIS_DATASOURCE_KEYWORD = "doris";
export const SPARKTHRIFT_DATASOURCE_KEYWORD = "spark|thrift|hadoop";

/**
 * 用于 json格式校验规则的测试表名。
 * 表需包含 json 类型或 string 类型字段，以供字段选择。
 * 表结构示例：
 *   id INT, payload JSON, raw_str VARCHAR(1000)
 * 该表需提前建立并已在数据资产中完成元数据同步。
 */
export const VALUE_FORMAT_TABLE = versionJsonFixtureName("quality_test_json_rule_config");

// ── 统计函数常量 ──────────────────────────────────────────────────────────────

/**
 * 格式-json格式校验 统计函数枚举值（来自源码 FORMAT_JSON_VERIFICATION = '51'）
 *
 * 在规则编辑器的统计函数下拉框中对应选项文本为「格式-json格式校验」。
 */
export const FORMAT_JSON_VERIFICATION_FUNC = "格式-json格式校验";

// ── 前置条件工具函数 ──────────────────────────────────────────────────────────

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

/**
 * 进入规则集列表页并完成 cookie 注入和项目上下文初始化。
 * 在每个测试 beforeEach 中调用，保证页面状态干净。
 */
export async function gotoRuleSetListWithContext(page: Page): Promise<void> {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/ruleSet", QUALITY_PROJECT_ID));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await injectProjectContext(page, QUALITY_PROJECT_ID);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}
