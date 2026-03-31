/**
 * json-to-archive-md.mjs
 * 将测试用例 final-reviewed JSON 或 XMind 文件转换为供 cases/archive/ 使用的 Markdown 文件
 *
 * 用法:
 *   node json-to-archive-md.mjs <input.json> [output-dir]
 *   node json-to-archive-md.mjs --from-xmind <file.xmind> [output-dir]
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";
import { getModuleKeys, loadConfig } from "../../../shared/scripts/load-config.mjs";
import {
  deriveArchiveBaseName,
  deriveArchiveBaseNameFromXmind,
  sanitizeFileName,
} from "../../../shared/scripts/output-naming-contracts.mjs";
import {
  buildFrontMatter,
  buildCanonicalArchiveCaseBlock,
  inferTags,
  extractModuleKey,
  extractVersionFromPath,
} from "../../../shared/scripts/front-matter-utils.mjs";

// ─── JSON → MD ──────────────────────────────────────────────

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CASES_ROOT = resolve(SCRIPT_DIR, "../../../../cases");

function countCaseTypes(modules) {
  const counts = { normal: 0, abnormal: 0, boundary: 0 };
  function tally(tc) {
    const t = tc.case_type || "";
    if (t.includes("正常")) counts.normal++;
    else if (t.includes("异常")) counts.abnormal++;
    else if (t.includes("边界")) counts.boundary++;
  }
  for (const mod of modules ?? []) {
    for (const page of mod.pages ?? []) {
      for (const sg of page.sub_groups ?? []) {
        (sg.test_cases ?? []).forEach(tally);
      }
      (page.test_cases ?? []).forEach(tally);
    }
    for (const sg of mod.sub_groups ?? []) {
      (sg.test_cases ?? []).forEach(tally);
    }
    (mod.test_cases ?? []).forEach(tally);
  }
  const total = counts.normal + counts.abnormal + counts.boundary;
  return total > 0 ? counts : null;
}

export function normalizeArchivePriority(value, fallback = "P2") {
  const normalized = String(value ?? "")
    .toUpperCase()
    .replace(/[【】「」[\]()（）\s]/g, "");
  if (normalized === "P0" || normalized === "0") return "P0";
  if (normalized === "P1" || normalized === "1") return "P1";
  if (normalized === "P2" || normalized === "2" || normalized === "P3" || normalized === "3") return "P2";
  return fallback;
}

function normalizeArchiveSteps(rawSteps = []) {
  return (Array.isArray(rawSteps) ? rawSteps : [])
    .map((entry) => {
      if (typeof entry === "string") {
        return { step: entry, expected: "" };
      }

      return {
        step: entry?.step ?? entry?.action ?? entry?.操作步骤 ?? "",
        expected: entry?.expected ?? entry?.result ?? entry?.预期结果 ?? "",
      };
    })
    .filter((entry) => entry.step || entry.expected);
}

export function buildArchiveCaseInput(tc = {}, options = {}) {
  const normalizedSteps = normalizeArchiveSteps(tc.steps ?? []);
  const fallbackPrecondition = Object.prototype.hasOwnProperty.call(options, "defaultPrecondition")
    ? options.defaultPrecondition
    : "";
  const precondition = tc.precondition ?? tc.preconditions ?? fallbackPrecondition;
  const steps = normalizedSteps.length > 0
    ? normalizedSteps
    : options.ensureStepRow
      ? [{
        step: options.defaultStepText ?? "",
        expected: options.defaultExpectedText ?? "",
      }]
      : [];

  return {
    priority: normalizeArchivePriority(tc.priority, options.defaultPriority ?? "P2"),
    title: tc.title || options.defaultTitle || "(标题缺失)",
    precondition,
    steps,
  };
}

export function formatArchiveCaseMarkdown(tc = {}, options = {}) {
  return buildCanonicalArchiveCaseBlock(buildArchiveCaseInput(tc, options));
}

export function formatArchiveCaseLines(tc = {}, options = {}) {
  return [
    ...formatArchiveCaseMarkdown(tc, options).trimEnd().split("\n"),
    "",
  ];
}

export function jsonToMd(data, sourcePath) {
  const { meta, modules } = data;
  const title = meta.version
    ? `【${meta.version}】${meta.requirement_name}`
    : meta.requirement_name;

  let totalCases = 0;

  for (const mod of modules ?? []) {
    for (const page of mod.pages ?? []) {
      for (const sg of page.sub_groups ?? []) {
        totalCases += (sg.test_cases ?? []).length;
      }
      totalCases += (page.test_cases ?? []).length;
    }
    for (const sg of mod.sub_groups ?? []) {
      totalCases += (sg.test_cases ?? []).length;
    }
    totalCases += (mod.test_cases ?? []).length;
  }

  // 推断输出目录（用于 module/version 提取）
  const inferredOutputDir = determineOutputDirWithMeta(
    meta?.project_name,
    meta?.version,
    meta?.requirement_name,
    meta ?? {},
  );
  const headings = (modules ?? []).map((m) => m.name);
  const tags = inferTags({
    title,
    headings,
    modulePath: inferredOutputDir,
    meta: meta ?? {},
  });
  const caseTypes = countCaseTypes(modules);
  const moduleKey =
    meta?.module_key ||
    extractModuleKey(inferredOutputDir) ||
    extractModuleKey(sourcePath);
  // prd_version 优先（DTStack 语义版本 vX.Y.Z），其次从 version 或输出目录路径提取
  const version =
    extractVersionFromPath(meta?.prd_version || "") ||
    extractVersionFromPath(meta?.version || "") ||
    extractVersionFromPath(inferredOutputDir);

  const today = new Date().toISOString().slice(0, 10);
  const fm = buildFrontMatter({
    suite_name: meta?.requirement_name || title,
    description: meta?.requirement_name || title,
    prd_id: meta?.requirement_id ? Number(String(meta.requirement_id).replace(/\D/g, "")) || undefined : undefined,
    prd_version: version || undefined,
    prd_path: meta?.prd_path || undefined,
    prd_url: meta?.prd_url || "",
    product: moduleKey || undefined,
    dev_version: meta?.dev_version || "",
    tags,
    create_at: today,
    update_at: today,
    status: "",
    health_warnings: [],
    repos: Array.isArray(meta?.repos) ? meta.repos : [],
    // 可选保留统计字段（脚本内部）
    case_count: totalCases,
    case_types: caseTypes || undefined,
    origin: "json",
  });

  const lines = [];
  lines.push(fm.trimEnd());
  lines.push("");

  for (const mod of modules ?? []) {
    const hasPages = Array.isArray(mod.pages) && mod.pages.length > 0;
    const hasSubGroups = Array.isArray(mod.sub_groups) && mod.sub_groups.length > 0;
    // 4-level format: module → page → sub_group → test_case
    if (hasPages) {
      lines.push(`## ${mod.name}`);
      lines.push("");
      for (const page of mod.pages) {
        lines.push(`### ${page.name}`);
        lines.push("");
        if (page.sub_groups && page.sub_groups.length > 0) {
          for (const sg of page.sub_groups) {
            lines.push(`#### ${sg.name}`);
            lines.push("");
            for (const tc of sg.test_cases ?? []) {
              lines.push(...formatArchiveCaseLines(tc, {
                defaultPrecondition: "无",
              }));
            }
          }
        }
        if (page.test_cases && page.test_cases.length > 0) {
          for (const tc of page.test_cases) {
            lines.push(...formatArchiveCaseLines(tc, {
              defaultPrecondition: "无",
            }));
          }
        }
      }
    }
    // 3-level format: module → sub_group → test_case
    if (hasSubGroups && !hasPages) {
      lines.push(`## ${mod.name}`);
      lines.push("");
      for (const sg of mod.sub_groups) {
        lines.push(`### ${sg.name}`);
        lines.push("");
        for (const tc of sg.test_cases ?? []) {
          lines.push(...formatArchiveCaseLines(tc, {
            defaultPrecondition: "无",
          }));
        }
      }
    }
    // 2-level format: module → test_case
    if (mod.test_cases && !hasPages && !hasSubGroups) {
      lines.push(`## ${mod.name}`);
      lines.push("");
      for (const tc of mod.test_cases) {
        lines.push(...formatArchiveCaseLines(tc, {
          defaultPrecondition: "无",
        }));
      }
    }
  }

  return lines.join("\n");
}

// ─── XMind → MD ─────────────────────────────────────────────

export async function parseXmindToArchiveResults(xmindPath) {
  const { default: JSZip } = await import("jszip");
  const zipData = readFileSync(resolve(xmindPath));
  const zip = await JSZip.loadAsync(zipData);
  const contentStr = await zip.file("content.json").async("string");
  const sheets = JSON.parse(contentStr);

  const results = [];

  for (const sheet of sheets) {
    const root = sheet.rootTopic;
    if (!root) continue;

    const projectName = root.title || "";
    const l1Nodes = root.children?.attached ?? [];

    for (const l1 of l1Nodes) {
      const l1Title = l1.title || "";
      const modNodes = l1.children?.attached ?? [];

      let totalCases = 0;
      const caseBlocks = [];

      for (const modNode of modNodes) {
        const modName = modNode.title || "";
        const nodeChildren = modNode.children?.attached ?? [];
        const directCases = nodeChildren.filter(isTestCase).map(extractCase);
        if (directCases.length > 0) {
          totalCases += directCases.length;
          caseBlocks.push({
            section: modName,
            cases: directCases,
          });
        }
        const pageNodes = nodeChildren.filter((child) => !isTestCase(child));

        for (const pageNode of pageNodes) {
          const pageName = pageNode.title || "";
          const subNodes = pageNode.children?.attached ?? [];

          for (const node of subNodes) {
            if (isTestCase(node)) {
              totalCases++;
              const section = `${modName} > ${pageName}`;
              let block = caseBlocks.find((b) => b.section === section);
              if (!block) {
                block = { section, cases: [] };
                caseBlocks.push(block);
              }
              block.cases.push(extractCase(node));
            } else {
              const sgName = node.title || "";
              const nodeChildren = node.children?.attached ?? [];
              const sgCases = nodeChildren.filter(isTestCase).map(extractCase);
              totalCases += sgCases.length;
              if (sgCases.length > 0) {
                caseBlocks.push({
                  section: `${modName} > ${pageName} > ${sgName}`,
                  cases: sgCases,
                });
              }
            }
          }
        }
      }

      // 收集 L2 模块名作为 headings
      const xmindHeadings = modNodes.map((n) => n.title || "");
      const xmindOutputDirForTags = determineOutputDir(
        projectName,
        l1Title,
        l1Title,
      );
      const xmindTags = inferTags({
        title: l1Title,
        headings: xmindHeadings,
        modulePath: xmindOutputDirForTags,
        meta: {},
      });
      const xmindModuleKey = extractModuleKey(xmindOutputDirForTags) || extractModuleKey(xmindPath);
      const xmindVersion = extractVersionFromPath(l1Title) || extractVersionFromPath(xmindPath);

      const xmindToday = new Date().toISOString().slice(0, 10);
      const xmindFm = buildFrontMatter({
        suite_name: l1Title,
        description: l1Title,
        prd_version: xmindVersion || undefined,
        prd_path: xmindPath,
        prd_url: "",
        product: xmindModuleKey || undefined,
        dev_version: "",
        tags: xmindTags,
        create_at: xmindToday,
        update_at: xmindToday,
        status: "",
        health_warnings: [],
        repos: [],
        case_count: totalCases,
        origin: "xmind",
      });

      const bodyLines = [];
      const lines = [];
      lines.push(xmindFm.trimEnd());
      lines.push("");

      // Track current context to output proper headings
      let lastMod = "",
        lastPage = "";
      for (const block of caseBlocks) {
        const parts = block.section.split(" > ");
        const modName = parts[0] || "";
        const pageName = parts[1] || "";
        const sgName = parts[2] || "";

        if (modName !== lastMod) {
          bodyLines.push(`## ${modName}`);
          bodyLines.push("");
          lastMod = modName;
          lastPage = "";
        }
        if (pageName && pageName !== lastPage) {
          bodyLines.push(`### ${pageName}`);
          bodyLines.push("");
          lastPage = pageName;
        }
        if (sgName) {
          bodyLines.push(`#### ${sgName}`);
          bodyLines.push("");
        }

        for (const tc of block.cases) {
          bodyLines.push(...formatArchiveCaseLines(tc, {
            defaultPrecondition: "无",
            ensureStepRow: true,
            defaultStepText: "待补充",
            defaultExpectedText: "待补充",
          }));
        }
      }

      lines.push(bodyLines.join("\n"));

      results.push({
        title: l1Title,
        projectName,
        body: bodyLines.join("\n"),
        content: lines.join("\n"),
        totalCases,
      });
    }
  }

  return results;
}

async function xmindToMd(xmindPath) {
  return parseXmindToArchiveResults(xmindPath);
}

function isTestCase(node) {
  if (node.markers && node.markers.length > 0) return true;
  const children = node.children?.attached ?? [];
  if (children.length === 0) return false;
  return children.every((child) => {
    const grandchildren = child.children?.attached ?? [];
    return grandchildren.every((gc) => !gc.children?.attached?.length);
  });
}

function extractCase(node) {
  const title = node.title || "";
  const precondition = node.notes?.plain?.content?.trim() || "";
  const markers = node.markers ?? [];
  let priority = "P2";
  for (const m of markers) {
    if (m.markerId === "priority-1") priority = "P0";
    else if (m.markerId === "priority-2") priority = "P1";
    else if (m.markerId === "priority-3") priority = "P2";
  }

  const steps = [];
  for (const stepNode of node.children?.attached ?? []) {
    const step = stepNode.title || "";
    const expectedNodes = stepNode.children?.attached ?? [];
    const expected = expectedNodes
      .map((expectedNode) => expectedNode?.title || "")
      .filter(Boolean)
      .join("\n");
    steps.push({ step, expected });
  }

  return { title, precondition, priority, steps };
}

// ─── 路径与工具函数 ─────────────────────────────────────────

const _allModuleKeys = getModuleKeys();
const _moduleConfig = loadConfig().modules || {};
// Build zh→key map from config for output dir resolution
const DTSTACK_MODULE_MAP = {};
for (const [key, mod] of Object.entries(_moduleConfig)) {
  if (mod.zh) DTSTACK_MODULE_MAP[mod.zh] = key;
}
const DTSTACK_MODULES = Object.keys(DTSTACK_MODULE_MAP);
const DTSTACK_MODULE_KEYS = new Set(_allModuleKeys);

export function determineOutputDir(projectName, versionOrTitle, requirementName) {
  return determineOutputDirWithMeta(projectName, versionOrTitle, requirementName, {});
}

function isSemanticVersion(version) {
  return /^v?\d+\.\d+\.\d+$/i.test((version || "").trim());
}

function determineDtstackModuleKey(projectName, requirementName, meta = {}) {
  const explicitModuleKey = String(meta.module_key || "").trim();
  if (explicitModuleKey) {
    if (DTSTACK_MODULE_MAP[explicitModuleKey]) {
      return DTSTACK_MODULE_MAP[explicitModuleKey];
    }
    if (DTSTACK_MODULE_KEYS.has(explicitModuleKey)) {
      return explicitModuleKey;
    }
  }

  const matchedModule = DTSTACK_MODULES.find(
    (m) => projectName?.includes(m) || requirementName?.includes(m),
  );
  return matchedModule ? DTSTACK_MODULE_MAP[matchedModule] : null;
}

export function determineOutputDirWithMeta(projectName, versionOrTitle, requirementName, meta = {}) {
  const base = CASES_ROOT;
  // prd_version 优先（语义版本 vX.Y.Z，DTStack 模块由 Writer 从 PRD frontmatter 写入）
  let version = meta.prd_version
    ? String(meta.prd_version).trim()
    : (versionOrTitle || "").replace(/版本$/, "").trim();
  if (version && !version.startsWith("v")) version = "v" + version;

  if (projectName === "信永中和") {
    return resolve(base, `archive/custom/xyzh/${version}`);
  }

  // DTStack 平台模块：按模块名路由到 archive/<module>/
  const dtModule = determineDtstackModuleKey(projectName, requirementName, meta);
  if (dtModule) {
    if (isSemanticVersion(version)) {
      return resolve(base, `archive/${dtModule}/${version}`);
    }
    return resolve(base, `archive/${dtModule}`);
  }

  // 其他项目兜底
  return resolve(base, `archive/${version}`);
}

// ─── CLI 入口 ───────────────────────────────────────────────

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

async function main(argv = process.argv.slice(2)) {
  const fromXmind = argv.includes("--from-xmind");
  const filteredArgs = argv.filter((arg) => arg !== "--from-xmind");

  if (filteredArgs.length < 1) {
    console.error("Usage:");
    console.error("  node json-to-archive-md.mjs <input.json> [output-dir]");
    console.error(
      "  node json-to-archive-md.mjs --from-xmind <file.xmind> [output-dir]",
    );
    process.exit(1);
  }

  const inputPath = filteredArgs[0];
  const outputDir = filteredArgs[1] || null;

  if (fromXmind) {
    const results = await xmindToMd(inputPath);
    for (const result of results) {
      const dir =
        outputDir || determineOutputDir(result.projectName, result.title, result.title);
      mkdirSync(dir, { recursive: true });
      const fileName =
        deriveArchiveBaseNameFromXmind(inputPath, result.title, results.length) + ".md";
      const outputPath = resolve(dir, fileName);
      writeFileSync(outputPath, result.content, "utf-8");
      console.log(
        `✅ 归档 MD 已生成：${outputPath}（${result.totalCases} 条用例）`,
      );
    }
    return;
  }

  const content = readFileSync(resolve(inputPath), "utf-8");
  const data = JSON.parse(content);
  const md = jsonToMd(data, inputPath);

  const dir =
    outputDir ||
    determineOutputDirWithMeta(
      data.meta?.project_name,
      data.meta?.version,
      data.meta?.requirement_name,
      data.meta ?? {},
    );
  mkdirSync(dir, { recursive: true });
  const fileName = deriveArchiveBaseName(inputPath, data.meta ?? {}) + ".md";
  const outputPath = resolve(dir, fileName);
  writeFileSync(outputPath, md, "utf-8");

  let totalCases = 0;
  const count = (cases) => {
    totalCases += (cases ?? []).length;
  };
  for (const mod of data.modules ?? []) {
    for (const page of mod.pages ?? []) {
      for (const sg of page.sub_groups ?? []) count(sg.test_cases);
      count(page.test_cases);
    }
    for (const sg of mod.sub_groups ?? []) count(sg.test_cases);
    count(mod.test_cases);
  }

  console.log(`✅ 归档 MD 已生成：${outputPath}（${totalCases} 条用例）`);
}

if (isDirectExecution()) {
  main().catch((err) => {
    console.error("转换失败:", err.message);
    process.exit(1);
  });
}
