/**
 * convert-history-cases.mjs
 * 将历史测试用例（CSV + XMind）转换为 Markdown 文件
 *
 * 所属 Skill: archive-converter
 * 遵循规范:
 *   - .claude/rules/archive-format.md        归档 MD 格式规范（front-matter 字段、层级映射）
 *   - .claude/shared/schemas/front-matter-schema.md  front-matter 字段权威定义
 *   - .claude/rules/directory-naming.md      目录命名与模块 key 规范
 *   - .claude/rules/xmind-output.md          XMind 层级结构规范
 *
 * 用法:
 *   node convert-history-cases.mjs                           # 全量转化（增量，跳过已存在）
 *   node convert-history-cases.mjs --force                   # 强制覆盖所有
 *   node convert-history-cases.mjs --path <file-or-dir>      # 仅转化指定文件/目录
 *   node convert-history-cases.mjs --module <名称或key>      # 仅转化指定模块
 *   node convert-history-cases.mjs --detect                  # 仅检测未转化文件
 *
 * 输入来源:
 *   - cases/history/${module_key}/${version}/*.csv（动态扫描，无需硬编码）
 *   - cases/xmind/**\/*.xmind
 *
 * 输出目标（通过 resolveModulePath 动态解析）:
 *   CSV  → cases/archive/${module_key}/${version}/<文件名>.md
 *   XMind → cases/archive/${module_key}/<文件名>.md（或含版本目录）
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { resolve, join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import {
  loadConfigFromPath,
  loadConfig,
  getModuleKeys,
  resolveModulePath,
} from "../../../shared/scripts/load-config.mjs";
import {
  buildFrontMatter,
  buildCanonicalArchiveCaseBlock,
  inferTags,
  extractModuleKey,
  extractVersionFromPath,
} from "../../../shared/scripts/front-matter-utils.mjs";
import { toArchiveDocumentStatus } from "../../../shared/scripts/frontmatter-status-utils.mjs";
import { parseXmindToArchiveResults } from "./json-to-archive-md.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../../.."); // qa-flow 根目录
const DEFAULT_ARCHIVE_DOCUMENT_STATUS = toArchiveDocumentStatus("archived");

// ─── Config 驱动的模块映射 ──────────────────────────────────────────────────

/**
 * 从 config.modules 动态构建模块名称映射（中文名 + key → key）。
 * 支持任意项目，无需手动维护映射表。
 *
 * @param {string} [configPath] - 可选：自定义 config 路径（用于测试隔离）
 * @returns {Record<string, string>} map: zh名/key → moduleKey
 */
export function buildModuleMap(configPath) {
  const config = configPath ? loadConfigFromPath(configPath) : loadConfig();
  const map = {};
  for (const [key, mod] of Object.entries(config.modules || {})) {
    if (mod.zh) map[mod.zh] = key;
    map[key] = key;
    if (mod.aliases) {
      for (const alias of mod.aliases) {
        map[alias] = key;
      }
    }
  }
  return map;
}

/**
 * 从 meta 信息确定 archive 输出目录（使用 resolveModulePath）。
 *
 * @param {{ module_key?: string, version?: string }} meta
 * @param {string} [configPath] - 可选：自定义 config 路径（用于测试隔离）
 * @returns {string} 工作区相对路径（含尾部斜杠）
 */
export function resolveOutputDir(meta, configPath) {
  const config = configPath ? loadConfigFromPath(configPath) : loadConfig();
  const moduleKey = meta.module_key;
  const version = meta.version;
  if (moduleKey && config.modules?.[moduleKey]) {
    return resolveModulePath(moduleKey, 'archive', config, version || null);
  }
  // 兜底：不带模块键时返回 archive/ 根目录
  const casesRoot = config.casesRoot ?? 'cases/';
  return `${casesRoot}archive/`;
}

// ─── 运行时使用默认 config 的模块映射 ───────────────────────────────────────

const MODULE_MAP = buildModuleMap();
const ALL_MODULE_KEYS = getModuleKeys();

// ─── CLI 参数解析 ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DETECT = args.includes("--detect");
const PATH_ARG = args.includes("--path")
  ? args[args.indexOf("--path") + 1]
  : null;
const MODULE_ARG = args.includes("--module")
  ? args[args.indexOf("--module") + 1]
  : null;

// 模块验证：仅记录有效模块名列表（延迟到 main() 验证，避免影响模块导入）
const VALID_MODULE_NAMES = Object.keys(MODULE_MAP);

// ─── 结果统计 ────────────────────────────────────────────────────────────────
const stats = { skipped: [], success: [], failed: [] };

// ─── 工具函数 ────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** 递归找出目录下所有匹配扩展名的文件 */
function findFiles(dir, ext) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      results.push(...findFiles(full, ext));
    } else if (entry.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * 最简 RFC-4180 CSV 解析器，支持带换行的引用字段
 * 返回二维数组（包含表头行）
 */
function parseCSV(raw) {
  // 去掉 BOM
  const text = raw.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuote = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // 转义双引号
          field += '"';
          i += 2;
        } else {
          inQuote = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
        i++;
      } else if (ch === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (ch === "\r" && text[i + 1] === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i += 2;
      } else if (ch === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }
  // 最后一行（无换行符结尾）
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // 过滤空行
  return rows.filter((r) => r.some((f) => f.trim()));
}

/** 优先级数字 → P0/P1/P2... */
function formatPriority(val) {
  const s = String(val).trim();
  if (/^\d+$/.test(s)) return `P${s}`;
  return s || "—";
}

function normalizeCsvPriority(val) {
  const normalized = formatPriority(val).toUpperCase();
  if (normalized === "P0" || normalized === "P1" || normalized === "P2") return normalized;
  return "P2";
}

/**
 * 将步骤/预期文本格式化为 Markdown 有序列表
 * 如果原文已有 "1. " 编号，保留；否则当做单条输出
 */
function formatSteps(text) {
  const s = (text || "").trim();
  if (!s || s === "无") return "无";
  // 已有编号 "1. " / "1、" 等
  if (/^[1-9][.、]\s/.test(s)) {
    return s
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
  }
  return s;
}

/** Parse numbered text lines into an array, stripping leading numbers */
function parseNumberedLines(text) {
  if (!text || text === "无") return [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) => line.replace(/^\d+[.、)\]]\s*/, ""));
}

/** Escape pipe characters for Markdown tables */
function escPipe(s) {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/** Escape for XMind table cells: escape pipes, convert newlines to <br> */
function escCell(s) {
  return String(s || "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, "<br>")
    .trim();
}

/** XMind priority marker → P0/P1/P2 */
function getNodePriority(node) {
  const markers = node.markers || [];
  for (const m of markers) {
    const match = String(m.markerId || "").match(/^priority-(\d+)$/);
    if (match) {
      const n = parseInt(match[1]) - 1; // priority-1 → P0, priority-2 → P1
      return `P${Math.max(0, n)}`;
    }
  }
  return "P2"; // default
}

function hasPriorityMarker(node) {
  return (node.markers ?? []).some((marker) => /^priority-\d+$/.test(String(marker?.markerId || "")));
}

/**
 * 判断节点是否为测试用例：
 * - 带优先级 marker 的叶子节点视为 marker-only 用例
 * - 其余节点只要所有孙节点都是叶子，即视为步骤/预期结构
 */
function isTestCase(node) {
  if (hasPriorityMarker(node)) return true;
  const children = node.children?.attached || [];
  if (children.length === 0) return false;
  if (!children.some((child) => (child.children?.attached || []).length > 0)) return false;
  return children.every((child) => {
    if ((child.markers?.length || 0) > 0 || child.notes?.plain?.content?.trim()) {
      return false;
    }
    const gc = child.children?.attached || [];
    return gc.every((leaf) =>
      (leaf.children?.attached || []).length === 0
      && !(leaf.markers?.length)
      && !leaf.notes?.plain?.content?.trim(),
    );
  });
}

/** 将测试用例节点转换为 ##### 标题 + 前置条件 + 步骤表格 */
function testCaseToMd(node) {
  const title = (node.title || "").trim();
  const priority = getNodePriority(node);
  const children = node.children?.attached || [];
  const precondition = (node.notes?.plain?.content || "").trim();
  const steps = children.map((stepNode) => ({
    step: stripHtml(stepNode.title || ""),
    expected: (stepNode.children?.attached || [])
      .map((expectedNode) => stripHtml(expectedNode?.title || ""))
      .filter(Boolean)
      .join("\n"),
  }));

  return buildCanonicalArchiveCaseBlock({
    priority,
    title,
    precondition,
    steps,
  });
}

/** 移除 HTML 标签，将 <br> 转为换行 */
function stripHtml(text) {
  if (!text) return text;
  let s = text;
  // <br> / <br/> / <br /> → 换行
  s = s.replace(/<br\s*\/?>/gi, "\n");
  // 移除所有 HTML 标签（含属性）
  s = s.replace(/<[^>]+>/g, "");
  // 清理多余空白行与首尾空白
  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

// ─── CSV → Markdown ──────────────────────────────────────────────────────────

function convertCSV(csvPath, version) {
  const raw = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(raw);
  if (rows.length < 2) throw new Error("CSV 文件为空或仅有表头");

  const header = rows[0];
  const idxModule = header.indexOf("所属模块");
  const idxTitle = header.indexOf("用例标题");
  const idxPre = header.indexOf("前置条件");
  const idxSteps = header.indexOf("步骤");
  const idxExpected = header.indexOf("预期结果");
  const idxPriority = header.indexOf("优先级");

  // 按模块分组
  const groups = new Map(); // module → rows[]
  for (const row of rows.slice(1)) {
    const mod = (row[idxModule] || "").trim() || "（未分类）";
    if (!groups.has(mod)) groups.set(mod, []);
    groups.get(mod).push(row);
  }

  const csvName = basename(csvPath, ".csv");
  const totalCases = rows.length - 1;
  const relPath = csvPath.replace(ROOT + "/", "");

  const headings = [...groups.keys()];
  const moduleKey = extractModuleKey(csvPath);
  const ver = version || extractVersionFromPath(csvPath);
  const title = ver ? `${csvName} ${ver}` : csvName;
  const tags = inferTags({
    title,
    headings,
    modulePath: csvPath,
    meta: {},
  });

  const fm = buildFrontMatter({
    suite_name: title,
    description: csvName,
    product: moduleKey || undefined,
    tags,
    create_at: new Date().toISOString().slice(0, 10),
    update_at: new Date().toISOString().slice(0, 10),
    status: DEFAULT_ARCHIVE_DOCUMENT_STATUS,
    health_warnings: [],
    case_count: totalCases,
    origin: "csv",
  });

  let md = fm + "\n";

  for (const [mod, caseRows] of groups) {
    md += `## ${mod}\n\n`;

    for (const row of caseRows) {
      const title = (row[idxTitle] || "").trim();
      const pre = stripHtml((row[idxPre] || "").trim());
      const stepsRaw = stripHtml((row[idxSteps] || "").trim());
      const expectedRaw = stripHtml((row[idxExpected] || "").trim());
      const priority = normalizeCsvPriority(row[idxPriority] || "");
      const stepLines = parseNumberedLines(stepsRaw);
      const expectLines = parseNumberedLines(expectedRaw);
      const maxLen = Math.max(stepLines.length, expectLines.length);
      const steps = Array.from({ length: maxLen }, (_, i) => ({
        step: stepLines[i] || "",
        expected: expectLines[i] || "",
      }));

      md += buildCanonicalArchiveCaseBlock({
        priority,
        title,
        precondition: pre || "",
        steps,
      });
      md += "\n";
    }
  }

  return md;
}

// ─── XMind → Markdown ────────────────────────────────────────────────────────

/**
 * 遍历 content.json 树，生成 Markdown
 *
 * 调用方式：treeToMd(l1Node, 0)
 * - depth=0：跳过 L1 本身（title 已进入 suite_name），递归其子节点（depth=1）
 * - 分组节点：depth 1→##, 2→###, 3→#### (上限 ####)
 * - 测试用例节点（所有子节点都是步骤→预期对）：始终输出 ##### + 步骤表格
 * - 叶节点：输出 - bullet
 */
function treeToMd(node, depth) {
  const children = node.children?.attached || [];
  const title = (node.title || "").trim();

  if (depth === 0) {
    // L1 节点：从其子节点（depth=1）开始输出
    return children.map((c) => treeToMd(c, 1)).join("");
  }

  const isLeaf = children.length === 0;
  if (isLeaf) {
    return `- ${title}\n`;
  }

  if (isTestCase(node)) {
    return testCaseToMd(node);
  }

  // 分组节点：heading 上限 ####（#####留给用例）
  const level = Math.min(depth + 1, 4);
  const hashes = "#".repeat(level);
  let out = `${hashes} ${title}\n\n`;
  out += children.map((c) => treeToMd(c, depth + 1)).join("");
  return out;
}

/**
 * 用正则从 content.xml 提取层级结构（旧格式兜底）
 */
function xmlToMd(xmlText) {
  // 提取所有 <topic> 标签（可能多层嵌套，用正则做简单处理）
  const lines = [];
  let depth = 0;
  let i = 0;
  while (i < xmlText.length) {
    const openTag = xmlText.indexOf("<topic", i);
    if (openTag === -1) break;
    // 检查是否是关闭标签之前的 </topic>
    const closeIdx = xmlText.indexOf("</topic>", i);
    const selfClose = xmlText.indexOf("/>", openTag);

    // 提取 title 属性
    const titleMatch = xmlText
      .slice(openTag, openTag + 300)
      .match(/title="([^"]*)"/);
    if (titleMatch) {
      const title = titleMatch[1];
      if (depth === 0) {
        // 跳过根节点
      } else {
        lines.push({ depth, title });
      }
    }

    // 寻找下一个开/关标签
    const nextOpen = xmlText.indexOf("<topic", openTag + 1);
    const nextClose = xmlText.indexOf("</topic>", openTag + 1);

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen;
    } else {
      if (nextClose !== -1) {
        depth = Math.max(0, depth - 1);
        i = nextClose + 8;
      } else {
        break;
      }
    }
  }

  // 转 Markdown
  let md = "";
  for (const { depth: d, title } of lines) {
    if (d <= 0) continue;
    const hashes = "#".repeat(Math.min(d + 1, 6));
    md += `${hashes} ${title}\n`;
  }
  return md;
}

async function convertXMind(xmindPath) {
  try {
    const results = await parseXmindToArchiveResults(xmindPath);
    if (results.length === 1) {
      return results[0].content;
    }
    if (results.length > 1) {
      const fileTitle = basename(xmindPath, ".xmind");
      const mergedBody = results
        .map((result) => result.body)
        .filter(Boolean)
        .join("\n\n")
        .trim();
      const headings = [...mergedBody.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
      const moduleKey = extractModuleKey(xmindPath);
      const tags = inferTags({ title: fileTitle, headings, modulePath: xmindPath, meta: {} });
      const today = new Date().toISOString().slice(0, 10);
      const totalCases = results.reduce((sum, result) => sum + (result.totalCases || 0), 0);
      const fm = buildFrontMatter({
        suite_name: fileTitle,
        description: fileTitle.replace(/[（(][^）)]*[）)]/g, "").trim().slice(0, 60),
        product: moduleKey || undefined,
        tags,
        create_at: today,
        update_at: today,
        status: DEFAULT_ARCHIVE_DOCUMENT_STATUS,
        health_warnings: [],
        case_count: totalCases || undefined,
        origin: "xmind",
      });
      return `${fm}\n${mergedBody}\n`;
    }
  } catch {
    // Fall back to the legacy parser for historical XMind packages without content.json.
  }

  const { default: JSZip } = await import("jszip");
  const buf = readFileSync(xmindPath);
  const zip = await JSZip.loadAsync(buf);
  const relPath = xmindPath.replace(ROOT + "/", "");
  const fileTitle = basename(xmindPath, ".xmind");

  let treeMd = "";
  let suiteName = fileTitle; // fallback

  const contentJsonFile = zip.file("content.json");
  if (contentJsonFile) {
    const jsonText = await contentJsonFile.async("string");
    const sheets = JSON.parse(jsonText);
    for (const sheet of sheets) {
      const l1Nodes = sheet.rootTopic?.children?.attached || [];
      for (const l1 of l1Nodes) {
        // L1 标题 → suite_name（frontmatter），不输出为 ## 标题
        suiteName = (l1.title || "").trim() || fileTitle;
        // 从 L1 的 children（L2）开始输出，depth=0 → L2 变为 ##
        treeMd += treeToMd(l1, 0);
      }
    }
  } else {
    const contentXmlFile = zip.file("content.xml");
    if (!contentXmlFile)
      throw new Error("XMind 文件中既无 content.json 也无 content.xml");
    const xmlText = await contentXmlFile.async("string");
    treeMd += xmlToMd(xmlText);
  }

  const headings = [...treeMd.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  const caseCount = [...treeMd.matchAll(/^##### /gm)].length;
  const moduleKey = extractModuleKey(xmindPath);
  const tags = inferTags({ title: suiteName, headings, modulePath: xmindPath, meta: {} });
  const today = new Date().toISOString().slice(0, 10);

  const fm = buildFrontMatter({
    suite_name: suiteName,
    description: suiteName.replace(/[（(][^）)]*[）)]/g, "").trim().slice(0, 60),
    product: moduleKey || undefined,
    tags,
    create_at: today,
    update_at: today,
    status: DEFAULT_ARCHIVE_DOCUMENT_STATUS,
    health_warnings: [],
    case_count: caseCount || undefined,
    origin: "xmind",
  });

  // Body 直接从 ## 层级开始，无 H1
  return `${fm}\n${treeMd}`;
}

// ─── 输出路径映射 ─────────────────────────────────────────────────────────────

/**
 * 根据 xmind 路径决定 archive 输出目录
 * cases/xmind/custom/xyzh/xxx.xmind → cases/archive/custom/xyzh/
 * cases/xmind/batch-works/xxx.xmind → cases/archive/batch-works/
 */
function xmindOutputDir(xmindPath) {
  const config = loadConfig();
  const rel = xmindPath.replace(ROOT + "/", "");
  // rel 类似 cases/xmind/batch-works/xxx.xmind 或
  //          cases/xmind/data-assets/v6.4.9/xxx.xmind 或
  //          cases/xmind/custom/xyzh/xxx.xmind
  const parts = rel.split("/");
  // parts[0]='cases', parts[1]='xmind', parts[2]=模块目录, [3]=子目录或文件名
  const top = parts[2] || "";
  const moduleKey = extractModuleKey(xmindPath);
  const possibleSubdir = parts[3];
  const isSubdir = possibleSubdir && !possibleSubdir.endsWith(".xmind");
  const isVersionDir = isSubdir && /^v?\d+\.\d+/.test(possibleSubdir);
  if (moduleKey && config.modules?.[moduleKey] && (!isSubdir || isVersionDir)) {
    const archivePath = resolveModulePath(moduleKey, "archive", config, isVersionDir ? possibleSubdir : null);
    return join(ROOT, archivePath);
  }
  if (top === "custom") {
    const subProject = parts[3] || "";
    return join(ROOT, "cases/archive/custom", subProject);
  }
  // parts[3] 存在且不是 .xmind 文件时，为版本子目录（如 v6.4.9、6.3.x、主流程）
  if (isSubdir) {
    return join(ROOT, "cases/archive", top, possibleSubdir);
  }
  return join(ROOT, "cases/archive", top);
}

// ─── 模块 / 路径辅助 ─────────────────────────────────────────────────────────

/**
 * 动态扫描 cases/history/ 下的 CSV 目录
 * 结构: cases/history/{moduleKey}/{version}/*.csv
 * 无需硬编码，自动发现所有模块的 CSV 历史文件
 *
 * @param {string} [filterModuleKey] - 可选：只扫描指定 moduleKey
 */
function buildCsvDirs(filterModuleKey) {
  const config = loadConfig();
  const casesRoot = config.casesRoot ?? 'cases/';
  const historyBase = join(ROOT, casesRoot, 'history');
  const dirs = [];
  if (!existsSync(historyBase)) return dirs;

  for (const moduleEntry of readdirSync(historyBase, { withFileTypes: true })) {
    if (!moduleEntry.isDirectory()) continue;
    const moduleKey = moduleEntry.name;
    if (filterModuleKey && moduleKey !== filterModuleKey) continue;
    const moduleDir = join(historyBase, moduleKey);
    // 扫描版本子目录
    for (const versionEntry of readdirSync(moduleDir, { withFileTypes: true })) {
      if (!versionEntry.isDirectory()) continue;
      const version = versionEntry.name;
      dirs.push({ dir: join(moduleDir, version), version, module: moduleKey });
    }
    // 也扫描根目录下的 CSV（无版本子目录）
    const rootCsvs = readdirSync(moduleDir).filter(f => f.endsWith('.csv'));
    if (rootCsvs.length > 0) {
      dirs.push({ dir: moduleDir, version: '', module: moduleKey });
    }
  }
  return dirs;
}

/** 扫描各模块 archive 下的 CSV 文件（兼容遗留归档文件） */
function getArchiveCSVFiles(module) {
  const results = [];
  const modKey = module ? MODULE_MAP[module] || module : null;
  const modules = modKey ? [modKey] : ALL_MODULE_KEYS;
  for (const mod of modules) {
    if (!ALL_MODULE_KEYS.includes(mod)) continue;
    const archiveDir = join(ROOT, "cases/archive", mod);
    if (!existsSync(archiveDir)) continue;
    // 遍历子目录（版本号目录）
    for (const verDir of readdirSync(archiveDir)) {
      const verPath = join(archiveDir, verDir);
      if (!statSync(verPath).isDirectory()) continue;
      const csvFiles = findFiles(verPath, ".csv");
      for (const csvPath of csvFiles) {
        results.push({ csvPath, version: verDir, module: mod });
      }
    }
  }
  return results;
}

/** 根据 --module 返回需要扫描的 XMind 目录列表 */
function getXMindDirs(module) {
  const xmindBase = join(ROOT, "cases/xmind");
  if (!module) return [xmindBase];
  const modKey = MODULE_MAP[module] || module;
  return [join(xmindBase, modKey)];
}

// ─── 主流程 ──────────────────────────────────────────────────────────────────

async function processCSVFiles(module) {
  // 1. 扫描 cases/history/ 下的 CSV 文件（动态，config 驱动）
  const modKey = module ? MODULE_MAP[module] || module : null;
  const historyCsvDirs = buildCsvDirs(modKey || undefined);
  for (const { dir, version, module: csvModule } of historyCsvDirs) {
    const csvFiles = findFiles(dir, ".csv");
    const config = loadConfig();
    for (const csvPath of csvFiles) {
      const name = basename(csvPath, ".csv");
      let outDir;
      if (csvModule && config.modules?.[csvModule]) {
        const archivePath = resolveModulePath(csvModule, 'archive', config, version || null);
        outDir = join(ROOT, archivePath);
      } else {
        outDir = join(ROOT, "cases/archive", csvModule || 'history', version || '');
      }
      const outFile = join(outDir, `${name}.md`);

      if (existsSync(outFile) && !FORCE) {
        stats.skipped.push(outFile.replace(ROOT + "/", ""));
        continue;
      }

      try {
        ensureDir(outDir);
        const md = convertCSV(csvPath, version);
        writeFileSync(outFile, md, "utf-8");
        stats.success.push(outFile.replace(ROOT + "/", ""));
      } catch (e) {
        stats.failed.push({
          file: csvPath.replace(ROOT + "/", ""),
          error: e.message,
        });
      }
    }
  }

  // 2. archive/<module>/<version>/*.csv → 同目录 .md（遗留兜底）
  const archiveCSVs = getArchiveCSVFiles(module);
  for (const { csvPath, version } of archiveCSVs) {
    const name = basename(csvPath, ".csv");
    const outDir = dirname(csvPath);
    const outFile = join(outDir, `${name}.md`);

    if (existsSync(outFile) && !FORCE) {
      stats.skipped.push(outFile.replace(ROOT + "/", ""));
      continue;
    }

    try {
      const md = convertCSV(csvPath, version);
      writeFileSync(outFile, md, "utf-8");
      stats.success.push(outFile.replace(ROOT + "/", ""));
    } catch (e) {
      stats.failed.push({
        file: csvPath.replace(ROOT + "/", ""),
        error: e.message,
      });
    }
  }
}

async function processXMindFiles(module) {
  const dirs = getXMindDirs(module);
  const xmindFiles = dirs.flatMap((dir) => findFiles(dir, ".xmind"));

  for (const xmindPath of xmindFiles) {
    const name = basename(xmindPath, ".xmind");
    const outDir = xmindOutputDir(xmindPath);
    const outFile = join(outDir, `${name}.md`);

    if (existsSync(outFile) && !FORCE) {
      stats.skipped.push(outFile.replace(ROOT + "/", ""));
      continue;
    }

    try {
      ensureDir(outDir);
      const md = await convertXMind(xmindPath);
      writeFileSync(outFile, md, "utf-8");
      stats.success.push(outFile.replace(ROOT + "/", ""));
    } catch (e) {
      stats.failed.push({
        file: xmindPath.replace(ROOT + "/", ""),
        error: e.message,
      });
    }
  }
}

// ─── --detect 模式 ───────────────────────────────────────────────────────────

async function detectUnconverted(module) {
  const unconverted = [];
  let alreadyConverted = 0;

  // CSV 源（动态扫描 cases/history/）
  const modKey = module ? MODULE_MAP[module] || module : null;
  const historyCsvDirs = buildCsvDirs(modKey || undefined);
  const config = loadConfig();
  for (const { dir, version, module: csvModule } of historyCsvDirs) {
    const csvFiles = findFiles(dir, ".csv");
    for (const csvPath of csvFiles) {
      const name = basename(csvPath, ".csv");
      let outDir;
      if (csvModule && config.modules?.[csvModule]) {
        const archivePath = resolveModulePath(csvModule, 'archive', config, version || null);
        outDir = join(ROOT, archivePath);
      } else {
        outDir = join(ROOT, "cases/archive", csvModule || 'history', version || '');
      }
      const outFile = join(outDir, `${name}.md`);
      if (existsSync(outFile)) {
        alreadyConverted++;
      } else {
        unconverted.push({
          source: csvPath.replace(ROOT + "/", ""),
          target: outFile.replace(ROOT + "/", ""),
          type: "csv",
        });
      }
    }
  }

  // CSV 源（archive 下遗留 CSV）
  const archiveCSVs = getArchiveCSVFiles(module);
  for (const { csvPath } of archiveCSVs) {
    const name = basename(csvPath, ".csv");
    const outFile = join(dirname(csvPath), `${name}.md`);
    if (existsSync(outFile)) {
      alreadyConverted++;
    } else {
      unconverted.push({
        source: csvPath.replace(ROOT + "/", ""),
        target: outFile.replace(ROOT + "/", ""),
        type: "csv",
      });
    }
  }

  // XMind 源
  const dirs = getXMindDirs(module);
  const xmindFiles = dirs.flatMap((dir) => findFiles(dir, ".xmind"));
  for (const xmindPath of xmindFiles) {
    const name = basename(xmindPath, ".xmind");
    const outDir = xmindOutputDir(xmindPath);
    const outFile = join(outDir, `${name}.md`);
    if (existsSync(outFile)) {
      alreadyConverted++;
    } else {
      unconverted.push({
        source: xmindPath.replace(ROOT + "/", ""),
        target: outFile.replace(ROOT + "/", ""),
        type: "xmind",
      });
    }
  }

  return {
    unconverted,
    already_converted: alreadyConverted,
    total_unconverted: unconverted.length,
  };
}

// ─── --path 模式 ─────────────────────────────────────────────────────────────

async function processSingleCSV(csvPath) {
  const parentDir = dirname(csvPath);
  const version = basename(parentDir);
  // Determine output: if already in archive dir, output in same dir; else use archive subdir
  const isInArchive =
    csvPath.includes("/archive/") || csvPath.includes("/archive-cases/");
  const outDir = isInArchive ? parentDir : join(dirname(parentDir), version);
  const name = basename(csvPath, ".csv");
  const outFile = join(outDir, `${name}.md`);

  if (existsSync(outFile) && !FORCE) {
    stats.skipped.push(outFile.replace(ROOT + "/", ""));
    return;
  }

  try {
    ensureDir(outDir);
    const md = convertCSV(csvPath, version);
    writeFileSync(outFile, md, "utf-8");
    stats.success.push(outFile.replace(ROOT + "/", ""));
  } catch (e) {
    stats.failed.push({
      file: csvPath.replace(ROOT + "/", ""),
      error: e.message,
    });
  }
}

async function processSingleXMind(xmindPath) {
  const name = basename(xmindPath, ".xmind");
  const outDir = xmindOutputDir(xmindPath);
  const outFile = join(outDir, `${name}.md`);

  if (existsSync(outFile) && !FORCE) {
    stats.skipped.push(outFile.replace(ROOT + "/", ""));
    return;
  }

  try {
    ensureDir(outDir);
    const md = await convertXMind(xmindPath);
    writeFileSync(outFile, md, "utf-8");
    stats.success.push(outFile.replace(ROOT + "/", ""));
  } catch (e) {
    stats.failed.push({
      file: xmindPath.replace(ROOT + "/", ""),
      error: e.message,
    });
  }
}

async function processPath(pathArg) {
  const absPath = resolve(pathArg);
  if (!existsSync(absPath)) {
    console.error(`❌ 路径不存在: ${pathArg}`);
    process.exit(1);
  }

  const st = statSync(absPath);
  if (st.isDirectory()) {
    const csvFiles = findFiles(absPath, ".csv");
    const xmindFiles = findFiles(absPath, ".xmind");
    for (const f of csvFiles) await processSingleCSV(f);
    for (const f of xmindFiles) await processSingleXMind(f);
  } else if (absPath.endsWith(".csv")) {
    await processSingleCSV(absPath);
  } else if (absPath.endsWith(".xmind")) {
    await processSingleXMind(absPath);
  } else {
    console.error(`❌ 不支持的文件类型: ${pathArg}（仅支持 .csv / .xmind）`);
    process.exit(1);
  }
}

// ─── 摘要输出 ────────────────────────────────────────────────────────────────

function printSummary() {
  console.log("─".repeat(60));
  if (stats.success.length) {
    console.log(`✅ 成功生成 (${stats.success.length} 个):`);
    stats.success.forEach((f) => console.log(`   ${f}`));
  }
  if (stats.skipped.length) {
    console.log(`⏭  已跳过 (${stats.skipped.length} 个，使用 --force 覆盖):`);
    stats.skipped.forEach((f) => console.log(`   ${f}`));
  }
  if (stats.failed.length) {
    console.log(`❌ 失败 (${stats.failed.length} 个):`);
    stats.failed.forEach(({ file, error }) =>
      console.log(`   ${file}\n     原因: ${error}`),
    );
  }
  console.log("─".repeat(60));
  console.log(
    `完成：成功 ${stats.success.length}，跳过 ${stats.skipped.length}，失败 ${stats.failed.length}`,
  );
}

// ─── 入口 ────────────────────────────────────────────────────────────────────

async function main() {
  // 模块名验证（使用 config 驱动的有效模块名）
  if (MODULE_ARG && VALID_MODULE_NAMES.length > 0 && !MODULE_MAP[MODULE_ARG]) {
    console.error(`❌ 无效模块名: ${MODULE_ARG}`);
    console.error(`   有效模块: ${VALID_MODULE_NAMES.join(", ")}`);
    process.exit(1);
  }

  // --detect: 仅检测，输出 JSON 后退出
  if (DETECT) {
    const report = await detectUnconverted(MODULE_ARG);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("🔄 开始转换历史测试用例...\n");
  if (FORCE) console.log("⚠️  --force 模式：将覆盖已存在文件\n");
  if (MODULE_ARG) console.log(`📦 模块过滤: ${MODULE_ARG}\n`);

  // --path: 仅处理指定路径
  if (PATH_ARG) {
    console.log(`📂 指定路径: ${PATH_ARG}\n`);
    await processPath(PATH_ARG);
    printSummary();
    return;
  }

  // 默认：全量批处理（受 --module 过滤）
  await processCSVFiles(MODULE_ARG);
  await processXMindFiles(MODULE_ARG);
  printSummary();
}

// 仅在直接执行时运行 main（导入为模块时不执行，便于测试）
function isDirectExecution() {
  if (!process.argv[1]) return false;
  try {
    return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  main().catch((e) => {
    console.error("❌ 脚本执行失败:", e);
    process.exit(1);
  });
}
