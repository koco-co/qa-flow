/**
 * frontmatter-status-utils.mjs
 *
 * normalize* 系列统一返回脚本内部使用的 canonical 英文状态值；
 * to*DocumentStatus 系列返回写回 Markdown frontmatter 的中文状态值。
 * `.qa-state.json` 等运行态枚举不在本模块的中文化/兼容转换范围内。
 */
export const REQUIREMENT_STATUS_READ_MAP = new Map([
  ["raw", "raw"],
  ["elicited", "elicited"],
  ["formalized", "formalized"],
  ["enhanced", "enhanced"],
  ["未开始", "raw"],
  ["已澄清", "elicited"],
  ["已形式化", "formalized"],
  ["已增强", "enhanced"],
]);

export const ARCHIVE_STATUS_READ_MAP = new Map([
  ["draft", "draft"],
  ["reviewed", "reviewed"],
  ["archived", "archived"],
  ["草稿", "draft"],
  ["已评审", "reviewed"],
  ["已归档", "archived"],
]);

function normalizeStatusKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeRequirementStatus(value) {
  const key = normalizeStatusKey(value);
  return REQUIREMENT_STATUS_READ_MAP.get(key) ?? "";
}

export function normalizeArchiveStatus(value) {
  const key = normalizeStatusKey(value);
  return ARCHIVE_STATUS_READ_MAP.get(key) ?? "";
}

export function toRequirementDocumentStatus(value) {
  switch (normalizeRequirementStatus(value)) {
    case "raw":
      return "未开始";
    case "elicited":
      return "已澄清";
    case "formalized":
      return "已形式化";
    case "enhanced":
      return "已增强";
    default:
      return "";
  }
}

export function toArchiveDocumentStatus(value) {
  switch (normalizeArchiveStatus(value)) {
    case "draft":
      return "草稿";
    case "reviewed":
      return "已评审";
    case "archived":
      return "已归档";
    default:
      return "";
  }
}
