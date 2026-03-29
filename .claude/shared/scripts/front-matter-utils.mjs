/**
 * front-matter-utils.mjs
 * 归档 MD front-matter 生成/解析工具函数
 *
 * 导出:
 *   buildFrontMatter(fields, docType?)                 → YAML front-matter 字符串
 *   inferTags({ title, headings, modulePath, meta })   → string[]
 *   parseFrontMatter(mdContent)                        → { frontMatter, body, docType }
 *   validateFrontMatter(fields, docType)               → { valid: boolean, missing: string[] }
 *   extractModuleKey(filePath)                         → string | null
 *   extractVersionFromPath(filePath)                   → string | null
 */
import { loadConfig } from "./load-config.mjs";

// 页面级/操作级停用词，不作为 tag
const STOP_WORDS = new Set([
  "列表页", "新增页", "编辑页", "详情页", "设置页", "配置页", "权限验证",
  "新增", "编辑", "删除", "详情", "查询", "搜索", "导入", "导出",
  "页面", "功能", "模块", "列表", "测试", "验证", "测试用例", "用例",
  "步骤", "预期", "前置条件",
]);

// ─── buildFrontMatter ────────────────────────────────────────────────────────

/**
 * 将 fields 对象序列化为 YAML front-matter 字符串（含开闭 --- 分隔符）
 * 支持: string / number / string[] / { key: number|string }（case_types）
 * null/undefined 字段自动跳过
 *
 * @param {Record<string, any>} fields
 * @param {"prd" | "archive" | null} [docType]  若提供，自动注入 doc_type 字段
 * @returns {string}  以 \n 结尾
 */
// 即使为空也强制输出 `field: []` 的字段（不跳过）
const FORCE_EMPTY_ARRAY_FIELDS = new Set(["repos", "health_warnings", "tags"]);

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
    } else if (typeof val === "object") {
      const entries = Object.entries(val).filter(
        ([, v]) => v !== null && v !== undefined,
      );
      if (entries.length === 0) continue;
      lines.push(`${key}:`);
      for (const [k, v] of entries) {
        lines.push(`  ${k}: ${v}`);
      }
    } else if (typeof val === "number") {
      lines.push(`${key}: ${val}`);
    } else {
      lines.push(`${key}: ${yamlStr(String(val))}`);
    }
  }
  lines.push("---");
  return lines.join("\n") + "\n";
}

/** 当字符串含特殊字符时加双引号 */
function yamlStr(s) {
  if (s === "") return '""';
  // 含 YAML 特殊字符 或 首尾有空格 时引号包裹
  if (/[:#{}[\],&*!|>'"%@`]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return s;
}

// ─── inferTags ───────────────────────────────────────────────────────────────

/**
 * 从多个来源推断 tags 列表（领域关键词）
 *
 * @param {object} opts
 * @param {string}   opts.title       H1 标题
 * @param {string[]} opts.headings    H2/H3 标题列表（功能模块/菜单名）
 * @param {string}   opts.modulePath  输出目录路径（推断模块中文名）
 * @param {object}   opts.meta        JSON meta 对象（可选）
 * @returns {string[]}
 */
export function inferTags({
  title = "",
  headings = [],
  modulePath = "",
  meta = {},
} = {}) {
  const candidates = new Set();

  // 1. 从目录路径推断模块中文名
  const moduleKey = extractModuleKeyFromPath(modulePath);
  if (moduleKey) {
    const zhName = getZhNameForModuleKey(moduleKey);
    if (zhName) candidates.add(zhName);
  }

  // 2. Writer 已推断的 meta.tags 直接纳入
  if (Array.isArray(meta.tags)) {
    for (const t of meta.tags) {
      const s = String(t).trim();
      if (s.length >= 2 && !STOP_WORDS.has(s)) candidates.add(s);
    }
  }

  // 3. 从 meta 字段提取关键词
  if (meta.requirement_name) {
    for (const p of splitKeywords(meta.requirement_name)) {
      if (!STOP_WORDS.has(p)) candidates.add(p);
    }
  }
  if (meta.product) {
    const p = String(meta.product).trim();
    if (p.length >= 2 && !STOP_WORDS.has(p)) candidates.add(p);
  }

  // 4. 从 H2/H3 标题（功能模块/菜单名）提取
  for (const h of headings) {
    const cleaned = h
      .replace(/^#{1,6}\s*/, "")
      .replace(/【[^】]*】/g, "")
      .replace(/\(#\d+\)/g, "")
      .replace(/（#\d+）/g, "")
      .replace(/（[^）]*）/g, "")  // 去掉「（XMind）」等全角括号后缀
      .replace(/[❯►»>]+/g, "")    // 去掉面包屑导航符号
      .trim();
    if (
      cleaned.length >= 2 &&
      !STOP_WORDS.has(cleaned) &&
      !cleaned.startsWith("验证") &&   // 跳过测试用例标题
      !/^\d+$/.test(cleaned)           // 跳过纯数字
    ) {
      candidates.add(cleaned);
    }
  }

  // 5. 从 H1 标题分词补充
  for (const p of splitKeywords(title)) {
    if (!STOP_WORDS.has(p)) candidates.add(p);
  }

  return [...candidates].filter((t) => t.length >= 2).slice(0, 10);
}

/** 从文本中分词提取关键词短语 */
function splitKeywords(text) {
  if (!text) return [];
  return (
    text
      // 提取 【...】 内容，去掉括号
      .replace(/【([^】]*)】/g, " $1 ")
      // 去掉 (#123) 和（#123）
      .replace(/\(#\d+\)/g, " ")
      .replace(/（#\d+）/g, " ")
      // 去掉版本号
      .replace(/v?\d+\.\d+(\.\d+)*/gi, " ")
      // 去掉全角括号包裹的内容（如「（XMind）」「（来源）」）
      .replace(/（[^）]*）/g, " ")
      // 去掉半角括号包裹的内容（如「(XMind)」）
      .replace(/\([^)]*\)/g, " ")
      // 按分隔符拆分
      .split(/[-\s、，,·/·—]+/)
      .map((s) => s.trim())
      // 过滤纯数字（YYYYMM、日期戳等）
      .filter((s) => s.length >= 2 && !/^\d+$/.test(s))
  );
}

// ─── parseFrontMatter ────────────────────────────────────────────────────────

/**
 * 解析 Markdown 文件的 YAML front-matter
 *
 * @param {string} mdContent
 * @returns {{ frontMatter: Record<string, any> | null, body: string }}
 *   frontMatter 为 null 表示文件没有 front-matter
 */
export function parseFrontMatter(mdContent) {
  const normalized = mdContent.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontMatter: null, body: mdContent };
  }
  const endIdx = normalized.indexOf("\n---\n", 4);
  if (endIdx === -1) {
    return { frontMatter: null, body: mdContent };
  }

  const fmText = normalized.slice(4, endIdx);
  const body = normalized.slice(endIdx + 5); // after "\n---\n"

  const frontMatter = {};
  let currentKey = null;
  let currentList = null;
  let currentObj = null;

  for (const line of fmText.split("\n")) {
    // 数组元素：`  - value`
    const listItem = line.match(/^  - (.+)$/);
    if (listItem && currentKey && Array.isArray(frontMatter[currentKey])) {
      frontMatter[currentKey].push(unquoteYaml(listItem[1]));
      continue;
    }

    // 对象属性：`  key: value`
    const objProp = line.match(/^  ([a-z_]+):\s*(.*)$/);
    if (objProp && currentObj !== null) {
      currentObj[objProp[1]] = unquoteYaml(objProp[2].trim());
      continue;
    }

    // 顶层键值对：`key: value` 或 `key:` (array/object)
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      const raw = kv[2].trim();
      currentList = null;
      currentObj = null;
      if (raw === "") {
        // 下一行决定是数组还是对象（保守：先设数组，遇到 `  key:` 时切换）
        frontMatter[currentKey] = [];
        currentList = frontMatter[currentKey];
      } else {
        frontMatter[currentKey] = unquoteYaml(raw);
      }
    }
  }

  const docType = frontMatter.doc_type || null;
  return { frontMatter, body, docType };
}

// ─── validateFrontMatter ──────────────────────────────────────────────────────

// 新格式（suite_name/prd_name/product）
const REQUIRED_ARCHIVE_NEW = ["suite_name", "description", "product", "prd_path", "create_at", "tags"];
const REQUIRED_PRD_NEW = ["prd_name", "description", "product", "prd_source", "create_at"];

// 旧格式（name/module/source/created_at）— 向后兼容
const REQUIRED_COMMON_LEGACY = ["name", "description", "module", "source", "created_at"];
const REQUIRED_ARCHIVE_LEGACY = ["tags"];
const REQUIRED_PRD_LEGACY = [];

/**
 * 检测 front-matter 使用新格式还是旧格式
 * @param {Record<string, any>} fields
 * @returns {"new" | "legacy"}
 */
function detectSchemaVersion(fields) {
  if (fields.suite_name !== undefined || fields.prd_name !== undefined || fields.product !== undefined) {
    return "new";
  }
  return "legacy";
}

/**
 * 按 doc_type 校验 front-matter 必填字段
 * 同时支持新格式（suite_name/product）和旧格式（name/module），自动检测。
 *
 * @param {Record<string, any>} fields
 * @param {"prd" | "archive"} docType
 * @returns {{ valid: boolean, missing: string[], schemaVersion: "new" | "legacy" }}
 */
export function validateFrontMatter(fields, docType) {
  const version = detectSchemaVersion(fields);
  let required;
  if (version === "new") {
    required = docType === "archive" ? REQUIRED_ARCHIVE_NEW : REQUIRED_PRD_NEW;
  } else {
    required = [
      ...REQUIRED_COMMON_LEGACY,
      ...(docType === "archive" ? REQUIRED_ARCHIVE_LEGACY : REQUIRED_PRD_LEGACY),
    ];
  }
  const missing = required.filter(
    (k) => fields[k] === null || fields[k] === undefined || fields[k] === "",
  );
  return { valid: missing.length === 0, missing, schemaVersion: version };
}

/** 去掉 YAML 字符串值的引号 */
function unquoteYaml(s) {
  if (typeof s !== "string") return s;
  s = s.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  const n = Number(s);
  if (!isNaN(n) && s !== "") return n;
  return s;
}

// ─── 路径工具 ────────────────────────────────────────────────────────────────

/**
 * 从任意文件路径推断模块 key
 * 处理:
 *   cases/archive/data-assets/...         → data-assets
 *   cases/archive/custom/xyzh/...         → xyzh
 *   cases/xmind/data-assets/...           → data-assets
 *   cases/xmind/custom/xyzh/...           → xyzh
 *   cases/history/xyzh/...                → xyzh
 *   cases/requirements/data-assets/...    → data-assets
 *
 * @param {string} filePath
 * @returns {string | null}
 */
export function extractModuleKey(filePath) {
  return extractModuleKeyFromPath(filePath);
}

function extractModuleKeyFromPath(p) {
  if (!p) return null;
  const s = p.replace(/\\/g, "/");

  // custom/xyzh pattern
  const customM = s.match(/(?:archive|xmind|requirements)\/custom\/([^/]+)/);
  if (customM) return customM[1];

  // archive/<key>  /  xmind/<key>  /  requirements/<key>  /  history/<key>
  const stdM = s.match(
    /(?:archive|xmind|requirements|history)\/([^/]+)/,
  );
  if (stdM && stdM[1] !== "custom") return stdM[1];

  return null;
}

/**
 * 从文件路径中提取语义版本号（如 v6.4.10）
 * @param {string} filePath
 * @returns {string | null}  以 "v" 开头，如 "v6.4.10"
 */
export function extractVersionFromPath(filePath) {
  if (!filePath) return null;
  const m = filePath.replace(/\\/g, "/").match(/\bv(\d+\.\d+\.\d+)\b/i);
  return m ? `v${m[1]}` : null;
}

// ─── 内部辅助 ────────────────────────────────────────────────────────────────

/** 从 config.json 中查找模块 key 对应的中文名 */
function getZhNameForModuleKey(moduleKey) {
  let config;
  try {
    config = loadConfig();
  } catch {
    return null;
  }
  for (const [key, mod] of Object.entries(config.modules || {})) {
    // 计算 moduleDir（与 getModuleMap 逻辑一致）
    let moduleDir = key;
    if (mod.xmind) {
      const m = mod.xmind.match(/cases\/xmind\/(.+?)\/?$/);
      if (m) moduleDir = m[1];
    }
    if (key === moduleKey || moduleDir === moduleKey) {
      return mod.zh || null;
    }
  }
  return null;
}
