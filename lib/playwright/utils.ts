/**
 * 通用测试工具函数
 */

/**
 * 生成带时间戳的唯一名称，用于测试数据避免命名冲突
 *
 * @param prefix - 名称前缀
 * @returns 格式如 "prefix_1713250800000"
 */
export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

/**
 * 获取当天日期字符串
 *
 * @returns 格式如 "20260416"
 */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
