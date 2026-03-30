/**
 * json-to-archive-md.mjs
 * 将测试用例 final-reviewed JSON 或 XMind 文件转换为供 cases/archive/ 使用的 Markdown 文件
 *
 * 用法:
 *   node json-to-archive-md.mjs <input.json> [output-dir]
 *   node json-to-archive-md.mjs --from-xmind <file.xmind> [output-dir]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname, basename, extname } from "path";
import { getDtstackModules } from "../../../shared/scripts/load-config.mjs";
import {
  deriveArchiveBaseName,
  deriveArchiveBaseNameFromXmind,
  sanitizeFileName,
} from "../../../shared/scripts/output-naming-contracts.mjs";
import {
  buildFrontMatter,
  inferTags,
  extractModuleKey,
  extractVersionFromPath,
} from "../../../shared/scripts/front-matter-utils.mjs";

// ─── JSON → MD ──────────────────────────────────────────────

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

function jsonToMd(data, sourcePath) {
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
  const version =
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
    // 4-level format: module → page → sub_group → test_case
    if (mod.pages) {
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
              lines.push(...formatCase(tc));
            }
          }
        }
        if (page.test_cases && page.test_cases.length > 0) {
          for (const tc of page.test_cases) {
            lines.push(...formatCase(tc));
          }
        }
      }
    }
    // 3-level format: module → sub_group → test_case
    if (mod.sub_groups && !mod.pages) {
      lines.push(`## ${mod.name}`);
      lines.push("");
      for (const sg of mod.sub_groups) {
        lines.push(`### ${sg.name}`);
        lines.push("");
        for (const tc of sg.test_cases ?? []) {
          lines.push(...formatCase(tc));
        }
      }
    }
    // 2-level format: module → test_case
    if (mod.test_cases && !mod.pages) {
      lines.push(`## ${mod.name}`);
      lines.push("");
      for (const tc of mod.test_cases) {
        lines.push(...formatCase(tc));
      }
    }
  }

  return lines.join("\n");
}

function escPipe(s) {
  return (s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function formatCase(tc) {
  const lines = [];
  const priority = tc.priority || "P2";
  lines.push(`##### 【${priority}】${tc.title || "(标题缺失)"}`);
  lines.push("");
  lines.push("> 前置条件");
  lines.push("```");
  lines.push(tc.precondition || tc.preconditions || "无");
  lines.push("```");
  lines.push("");
  lines.push("> 用例步骤");
  lines.push("");

  const steps = tc.steps ?? [];
  if (steps.length > 0) {
    lines.push("| 编号 | 步骤 | 预期 |");
    lines.push("| --- | --- | --- |");
    steps.forEach((s, i) => {
      const step = escPipe(s.step || s.action || s.操作步骤 || "(步骤缺失)");
      const expected = escPipe(
        s.expected || s.result || s.预期结果 || "(预期缺失)",
      );
      lines.push(`| ${i + 1} | ${step} | ${expected} |`);
    });
  }

  lines.push("");
  return lines;
}

// ─── XMind → MD ─────────────────────────────────────────────

async function xmindToMd(xmindPath) {
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
        const pageNodes = modNode.children?.attached ?? [];

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
          lines.push(`## ${modName}`);
          lines.push("");
          lastMod = modName;
          lastPage = "";
        }
        if (pageName && pageName !== lastPage) {
          lines.push(`### ${pageName}`);
          lines.push("");
          lastPage = pageName;
        }
        if (sgName) {
          lines.push(`#### ${sgName}`);
          lines.push("");
        }

        for (const tc of block.cases) {
          lines.push(...formatCaseFromXmind(tc));
        }
      }

      results.push({
        title: l1Title,
        projectName,
        content: lines.join("\n"),
        totalCases,
      });
    }
  }

  return results;
}

function isTestCase(node) {
  if (node.markers && node.markers.length > 0) return true;
  const children = node.children?.attached ?? [];
  if (children.length === 0) return false;
  return children.every((child) => {
    const grandchildren = child.children?.attached ?? [];
    return (
      grandchildren.length <= 1 &&
      grandchildren.every((gc) => !gc.children?.attached?.length)
    );
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
    const expected = expectedNodes[0]?.title || "";
    steps.push({ step, expected });
  }

  return { title, precondition, priority, steps };
}

function formatCaseFromXmind(tc) {
  const lines = [];
  const priority = tc.priority || "P2";
  lines.push(`##### 【${priority}】${tc.title || "(标题缺失)"}`);
  lines.push("");
  lines.push("> 前置条件");
  lines.push("```");
  lines.push(tc.precondition || tc.preconditions || "无");
  lines.push("```");
  lines.push("");
  lines.push("> 用例步骤");
  lines.push("");

  lines.push("| 编号 | 步骤 | 预期 |");
  lines.push("| --- | --- | --- |");
  if (tc.steps.length > 0) {
    tc.steps.forEach((s, i) => {
      const step = escPipe(s.step || "(步骤缺失)");
      const expected = escPipe(s.expected || "(预期缺失)");
      lines.push(`| ${i + 1} | ${step} | ${expected} |`);
    });
  } else {
    lines.push("| 1 | 待补充 | 待补充 |");
  }

  lines.push("");
  return lines;
}

// ─── 路径与工具函数 ─────────────────────────────────────────

const { zh: _dtstackZh, en: _dtstackEn } = getDtstackModules();
const DTSTACK_MODULE_MAP = {};
_dtstackZh.forEach((zh, i) => { DTSTACK_MODULE_MAP[zh] = _dtstackEn[i]; });
const DTSTACK_MODULES = Object.keys(DTSTACK_MODULE_MAP);

function determineOutputDir(projectName, versionOrTitle, requirementName) {
  const base = resolve(
    dirname(new URL(import.meta.url).pathname),
    "../../cases",
  );
  return determineOutputDirWithMeta(projectName, versionOrTitle, requirementName, {});
}

function isSemanticVersion(version) {
  return /^v?\d+\.\d+\.\d+$/i.test((version || "").trim());
}

function determineDtstackModuleKey(projectName, requirementName, meta = {}) {
  if (meta.module_key && DTSTACK_MODULE_MAP[meta.module_key]) {
    return meta.module_key;
  }

  return DTSTACK_MODULES.find(
    (m) => projectName?.includes(m) || requirementName?.includes(m),
  ) || null;
}

function determineOutputDirWithMeta(projectName, versionOrTitle, requirementName, meta = {}) {
  const base = resolve(
    dirname(new URL(import.meta.url).pathname),
    "../../cases",
  );
  let version = (versionOrTitle || "").replace(/版本$/, "").trim();
  if (version && !version.startsWith("v")) version = "v" + version;

  if (projectName === "信永中和") {
    return resolve(base, `archive/custom/xyzh/${version}`);
  }

  // DTStack 平台模块：按模块名路由到 archive/<module>/
  const dtModule = determineDtstackModuleKey(projectName, requirementName, meta);
  if (dtModule) {
    if (isSemanticVersion(version)) {
      return resolve(base, `archive/${DTSTACK_MODULE_MAP[dtModule]}/${version}`);
    }
    return resolve(base, `archive/${DTSTACK_MODULE_MAP[dtModule]}`);
  }

  // 其他项目兜底
  return resolve(base, `archive/${version}`);
}

// ─── CLI 入口 ───────────────────────────────────────────────

const args = process.argv.slice(2);
const fromXmind = args.includes("--from-xmind");
const filteredArgs = args.filter((a) => a !== "--from-xmind");

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
  xmindToMd(inputPath)
    .then((results) => {
      for (const result of results) {
        const dir =
          outputDir || determineOutputDir(result.projectName, result.title);
        mkdirSync(dir, { recursive: true });
        const fileName =
          deriveArchiveBaseNameFromXmind(inputPath, result.title, results.length) + ".md";
        const outputPath = resolve(dir, fileName);
        writeFileSync(outputPath, result.content, "utf-8");
        console.log(
          `✅ 归档 MD 已生成：${outputPath}（${result.totalCases} 条用例）`,
        );
      }
    })
    .catch((err) => {
      console.error("转换失败:", err.message);
      process.exit(1);
    });
} else {
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
