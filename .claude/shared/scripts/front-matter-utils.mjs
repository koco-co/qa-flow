/**
 * front-matter-utils.mjs
 * 归档 MD / PRD front-matter 生成、解析与规范化工具函数
 */
import { loadConfig } from "./load-config.mjs";

const STOP_WORDS = new Set([
  "列表页", "新增页", "编辑页", "详情页", "设置页", "配置页", "权限验证",
  "新增", "编辑", "删除", "详情", "查询", "搜索", "导入", "导出",
  "页面", "功能", "模块", "列表", "测试", "验证", "测试用例", "用例",
  "步骤", "预期", "前置条件",
]);

const FORCE_EMPTY_ARRAY_FIELDS = new Set(["repos", "health_warnings", "tags"]);
const LEGACY_FRONTMATTER_KEYS = new Set([
  "name",
  "module",
  "source",
  "created_at",
  "version",
  "story",
  "doc_id",
  "enhanced_at",
  "images_processed",
]);

const ARCHIVE_CANONICAL_FIELD_ORDER = [
  "suite_name",
  "description",
  "prd_id",
  "prd_version",
  "prd_path",
  "prd_url",
  "product",
  "dev_version",
  "tags",
  "create_at",
  "update_at",
  "status",
  "health_warnings",
  "repos",
  "case_count",
  "case_types",
  "origin",
];

const PRD_CANONICAL_FIELD_ORDER = [
  "prd_name",
  "description",
  "prd_id",
  "prd_version",
  "prd_source",
  "prd_url",
  "product",
  "dev_version",
  "tags",
  "create_at",
  "update_at",
  "status",
  "health_warnings",
  "repos",
  "case_path",
];

export function buildFrontMatter(fields, docType = null) {
  const merged = docType ? { doc_type: docType, ...fields } : { ...fields };
  const lines = ["---"];

  for (const [key, val] of Object.entries(merged)) {
    if (val === null || val === undefined) continue;

    if (Array.isArray(val)) {
      if (val.length === 0) {
        if (FORCE_EMPTY_ARRAY_FIELDS.has(key)) {
          lines.push(`${key}: []`);
        }
        continue;
      }
      lines.push(`${key}:`);
      for (const item of val) {
        lines.push(`  - ${yamlStr(String(item))}`);
      }
      continue;
    }

    if (typeof val === "object") {
      const entries = Object.entries(val).filter(
        ([, nestedValue]) => nestedValue !== null && nestedValue !== undefined,
      );
      if (entries.length === 0) continue;
      lines.push(`${key}:`);
      for (const [nestedKey, nestedValue] of entries) {
        if (typeof nestedValue === "number") {
          lines.push(`  ${nestedKey}: ${nestedValue}`);
        } else {
          lines.push(`  ${nestedKey}: ${yamlStr(String(nestedValue))}`);
        }
      }
      continue;
    }

    if (typeof val === "number") {
      lines.push(`${key}: ${val}`);
      continue;
    }

    lines.push(`${key}: ${yamlStr(String(val))}`);
  }

  lines.push("---");
  return lines.join("\n") + "\n";
}

export function buildCanonicalFrontMatter(fields, docType) {
  const order = docType === "prd" ? PRD_CANONICAL_FIELD_ORDER : ARCHIVE_CANONICAL_FIELD_ORDER;
  const ordered = {};

  for (const key of order) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      ordered[key] = fields[key];
    }
  }

  for (const [key, value] of Object.entries(fields)) {
    if (!Object.prototype.hasOwnProperty.call(ordered, key)) {
      ordered[key] = value;
    }
  }

  return buildFrontMatter(ordered);
}

function yamlStr(value) {
  if (value === "") return '""';
  if (/[:#{}[\],&*!|>'"%@`]/.test(value) || /^\s|\s$/.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function inferTags({
  title = "",
  headings = [],
  modulePath = "",
  meta = {},
} = {}) {
  const candidates = new Set();

  const moduleKey = extractModuleKeyFromPath(modulePath);
  if (moduleKey) {
    const zhName = getZhNameForModuleKey(moduleKey);
    if (zhName) candidates.add(zhName);
  }

  if (Array.isArray(meta.tags)) {
    for (const tag of meta.tags) {
      const normalized = String(tag).trim();
      if (normalized.length >= 2 && !STOP_WORDS.has(normalized)) {
        candidates.add(normalized);
      }
    }
  }

  if (meta.requirement_name) {
    for (const part of splitKeywords(meta.requirement_name)) {
      if (!STOP_WORDS.has(part)) candidates.add(part);
    }
  }

  if (meta.product) {
    const normalized = String(meta.product).trim();
    if (normalized.length >= 2 && !STOP_WORDS.has(normalized)) {
      candidates.add(normalized);
    }
  }

  for (const heading of headings) {
    const cleaned = heading
      .replace(/^#{1,6}\s*/, "")
      .replace(/【[^】]*】/g, "")
      .replace(/\(#\d+\)/g, "")
      .replace(/（#\d+）/g, "")
      .replace(/（[^）]*）/g, "")
      .replace(/[❯►»>]+/g, "")
      .trim();

    if (
      cleaned.length >= 2 &&
      !STOP_WORDS.has(cleaned) &&
      !cleaned.startsWith("验证") &&
      !/^\d+$/.test(cleaned)
    ) {
      candidates.add(cleaned);
    }
  }

  for (const part of splitKeywords(title)) {
    if (!STOP_WORDS.has(part)) candidates.add(part);
  }

  return [...candidates].filter((tag) => tag.length >= 2).slice(0, 10);
}

function splitKeywords(text) {
  if (!text) return [];
  return text
    .replace(/【([^】]*)】/g, " $1 ")
    .replace(/\(#\d+\)/g, " ")
    .replace(/（#\d+）/g, " ")
    .replace(/v?\d+\.\d+(\.\d+)*/gi, " ")
    .replace(/（[^）]*）/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .split(/[-\s、，,·/—]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !/^\d+$/.test(item));
}

export function splitFrontMatter(mdContent) {
  const match = mdContent.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return {
      rawFrontMatter: null,
      frontMatterText: null,
      body: mdContent,
    };
  }

  return {
    rawFrontMatter: match[0],
    frontMatterText: match[1],
    body: mdContent.slice(match[0].length),
  };
}

export function parseFrontMatter(mdContent) {
  const { frontMatterText, body } = splitFrontMatter(mdContent);
  if (frontMatterText === null) {
    return { frontMatter: null, body: mdContent, docType: null };
  }

  const lines = frontMatterText.replace(/\r\n/g, "\n").split("\n");
  const frontMatter = {};

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const topLevelMatch = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!topLevelMatch) {
      index += 1;
      continue;
    }

    const [, key, rawValue] = topLevelMatch;
    const trimmedValue = rawValue.trim();

    if (trimmedValue !== "") {
      frontMatter[key] = parseYamlScalar(trimmedValue);
      index += 1;
      continue;
    }

    const blockLines = [];
    index += 1;
    while (index < lines.length && /^  /.test(lines[index])) {
      blockLines.push(lines[index]);
      index += 1;
    }

    if (blockLines.length === 0) {
      frontMatter[key] = "";
      continue;
    }

    if (blockLines.some((blockLine) => /^  - /.test(blockLine))) {
      frontMatter[key] = blockLines
        .filter((blockLine) => /^  - /.test(blockLine))
        .map((blockLine) => parseYamlScalar(blockLine.replace(/^  - /, "").trim()));
      continue;
    }

    const objectValue = {};
    for (const blockLine of blockLines) {
      const objectMatch = blockLine.match(/^  ([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
      if (!objectMatch) continue;
      const [, nestedKey, nestedRawValue] = objectMatch;
      objectValue[nestedKey] = parseYamlScalar(nestedRawValue.trim());
    }
    frontMatter[key] = objectValue;
  }

  const docType = typeof frontMatter.doc_type === "string" ? frontMatter.doc_type : null;
  return { frontMatter, body, docType };
}

function parseYamlScalar(rawValue) {
  const value = rawValue.trim();

  if (value === "[]") return [];
  if (value === "{}") return {};

  if (/^\[(.*)\]$/.test(value)) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => parseYamlScalar(item.trim()));
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  if (/^(true|false)$/i.test(value)) {
    return value.toLowerCase() === "true";
  }

  return value;
}

const REQUIRED_ARCHIVE_CANONICAL = [
  "suite_name",
  "description",
  "product",
  "prd_path",
  "create_at",
  "tags",
];
const REQUIRED_PRD_CANONICAL = [
  "prd_name",
  "description",
  "product",
  "prd_source",
  "create_at",
];

export function hasLegacyFrontMatterKeys(fields = {}) {
  return Object.keys(fields).some((key) => LEGACY_FRONTMATTER_KEYS.has(key));
}

export function validateFrontMatter(fields, docType) {
  const required = docType === "archive"
    ? REQUIRED_ARCHIVE_CANONICAL
    : REQUIRED_PRD_CANONICAL;

  const missing = required.filter((key) => isBlankValue(fields[key]));
  return {
    valid: missing.length === 0,
    missing,
    schemaVersion: hasLegacyFrontMatterKeys(fields) ? "legacy" : "new",
  };
}

function isBlankValue(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

export function normalizeDocumentTitle(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .trim()
    .replace(/\.md$/i, "")
    .replace(/-enhanced$/i, "")
    .replace(/-formalized$/i, "")
    .replace(/（XMind）$/i, "")
    .replace(/\(XMind\)$/i, "")
    .replace(/^PRD[-\s_]?\d+\s*/i, "")
    .replace(/^PRD[-_]\d+-/i, "")
    .replace(/\(#\d+\)/g, "")
    .replace(/（#\d+）/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  return "";
}

export function coerceStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (value === null || value === undefined || value === "[]") {
    return [];
  }

  const normalized = String(value).trim();
  return normalized ? [normalized] : [];
}

export function pickFirstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return "";
}

export function extractModuleKey(filePath) {
  return extractModuleKeyFromPath(filePath);
}

function extractModuleKeyFromPath(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, "/");

  const customMatch = normalized.match(/(?:archive|xmind|requirements)\/custom\/([^/]+)/);
  if (customMatch) return customMatch[1];

  const standardMatch = normalized.match(/(?:archive|xmind|requirements|history)\/([^/]+)/);
  if (standardMatch && standardMatch[1] !== "custom") {
    return standardMatch[1];
  }

  return null;
}

export function extractVersionFromPath(filePath) {
  if (!filePath) return null;
  const match = filePath.replace(/\\/g, "/").match(/\bv(\d+\.\d+\.\d+)\b/i);
  return match ? `v${match[1]}` : null;
}

function getZhNameForModuleKey(moduleKey) {
  let config;
  try {
    config = loadConfig();
  } catch {
    return null;
  }

  for (const [key, moduleConfig] of Object.entries(config.modules || {})) {
    let moduleDir = key;
    if (moduleConfig.xmind) {
      const match = moduleConfig.xmind.match(/cases\/xmind\/(.+?)\/?$/);
      if (match) moduleDir = match[1];
    }

    if (key === moduleKey || moduleDir === moduleKey) {
      return moduleConfig.zh || null;
    }
  }

  return null;
}
