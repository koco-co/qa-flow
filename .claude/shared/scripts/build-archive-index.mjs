#!/usr/bin/env node
/**
 * build-archive-index.mjs
 *
 * 扫描 cases/archive/ 下所有 .md 文件，提取 YAML front-matter 元数据，
 * 生成轻量索引文件 cases/archive/INDEX.json。
 *
 * Agent 读取 INDEX.json 即可知道全部归档用例的元数据，
 * 无需 Grep 扫描 300+ 文件。按 tags 匹配后再精确读取相关文件。
 *
 * 用法:
 *   node .claude/shared/scripts/build-archive-index.mjs                    # 构建完整索引
 *   node .claude/shared/scripts/build-archive-index.mjs --stats            # 仅输出统计
 *   node .claude/shared/scripts/build-archive-index.mjs --query data-assets  # 输出单模块索引(stdout)
 *   node .claude/shared/scripts/build-archive-index.mjs --query data-assets --tags 数据质量,规则集  # 按 tags 过滤
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { getWorkspaceRoot } from "./load-config.mjs";
import { parseFrontMatter, extractModuleKey, extractVersionFromPath } from "./front-matter-utils.mjs";

const ROOT = getWorkspaceRoot();
const ARCHIVE_DIR = join(ROOT, "cases/archive");
const INDEX_PATH = join(ARCHIVE_DIR, "INDEX.json");

// ─── 递归收集 .md 文件 ──────────────────────────────────────────────────────

function collectMdFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
      results.push(full);
    }
  }
  return results;
}

// ─── 从文件提取索引条目 ─────────────────────────────────────────────────────

function extractEntry(absPath) {
  const relPath = relative(ROOT, absPath);
  let content;
  try {
    content = readFileSync(absPath, "utf8");
  } catch {
    return null;
  }

  const { frontMatter } = parseFrontMatter(content);

  // 从 front-matter 提取，缺失字段回退到路径推断
  const suiteName = frontMatter?.suite_name ?? frontMatter?.name ?? extractTitleFromBody(content) ?? "";
  const product = frontMatter?.product ?? frontMatter?.module ?? extractModuleKey(relPath) ?? "";
  const prdVersion = frontMatter?.prd_version ?? extractVersionFromPath(relPath) ?? "";
  const tags = Array.isArray(frontMatter?.tags) ? frontMatter.tags : [];
  const caseCount = frontMatter?.case_count ?? countCases(content);
  const createAt = frontMatter?.create_at ?? frontMatter?.created_at ?? "";
  const status = frontMatter?.status ?? "";
  const prdId = frontMatter?.prd_id ?? null;
  const origin = frontMatter?.origin ?? "";

  return {
    path: relPath,
    suite_name: suiteName,
    product: String(product),
    prd_version: String(prdVersion),
    prd_id: prdId,
    tags,
    case_count: caseCount,
    create_at: String(createAt),
    status: String(status),
    origin: String(origin),
  };
}

/** 从正文提取 H1 标题作为 fallback suite_name */
function extractTitleFromBody(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/** 统计 ##### 标题数量作为 case_count */
function countCases(content) {
  const matches = content.match(/^#{5}\s+/gm);
  return matches ? matches.length : 0;
}

// ─── 主逻辑 ─────────────────────────────────────────────────────────────────

function buildIndex() {
  const files = collectMdFiles(ARCHIVE_DIR);
  const entries = [];

  for (const f of files) {
    const entry = extractEntry(f);
    if (entry) {
      entries.push(entry);
    }
  }

  // 按 product → prd_version → suite_name 排序
  entries.sort((a, b) => {
    const cmp1 = a.product.localeCompare(b.product);
    if (cmp1 !== 0) return cmp1;
    const cmp2 = a.prd_version.localeCompare(b.prd_version);
    if (cmp2 !== 0) return cmp2;
    return a.suite_name.localeCompare(b.suite_name);
  });

  const totalCases = entries.reduce((sum, e) => sum + e.case_count, 0);

  const index = {
    generated_at: new Date().toISOString(),
    total_files: entries.length,
    total_cases: totalCases,
    entries,
  };

  return index;
}

function printStats(index) {
  console.log(`Archive Index Stats:`);
  console.log(`  Files: ${index.total_files}`);
  console.log(`  Cases: ${index.total_cases}`);

  // 按 product 分组统计
  const byProduct = {};
  for (const e of index.entries) {
    const key = e.product || "(unknown)";
    if (!byProduct[key]) byProduct[key] = { files: 0, cases: 0 };
    byProduct[key].files++;
    byProduct[key].cases += e.case_count;
  }
  console.log(`\n  By module:`);
  for (const [mod, stats] of Object.entries(byProduct)) {
    console.log(`    ${mod}: ${stats.files} files, ${stats.cases} cases`);
  }
}

// ─── 查询模式：按模块 + tags 过滤，输出紧凑结果 ────────────────────────────

function queryIndex(index, moduleFilter, tagFilters) {
  let filtered = index.entries;

  if (moduleFilter) {
    filtered = filtered.filter(e =>
      e.product === moduleFilter ||
      e.path.includes(`/${moduleFilter}/`) ||
      e.path.includes(`/custom/${moduleFilter}/`)
    );
  }

  if (tagFilters.length > 0) {
    filtered = filtered.filter(e =>
      tagFilters.some(t => e.tags.some(et => et.includes(t)))
    );
  }

  // 紧凑输出：每条一行，只保留 Agent 需要的字段
  const compact = filtered.map(e => ({
    p: e.path,
    n: e.suite_name,
    v: e.prd_version,
    t: e.tags,
    c: e.case_count,
  }));

  return { matched: compact.length, total: index.total_files, results: compact };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const statsOnly = args.includes("--stats");
const queryIdx = args.indexOf("--query");
const tagsIdx = args.indexOf("--tags");

const moduleFilter = queryIdx !== -1 ? args[queryIdx + 1] : null;
const tagFilters = tagsIdx !== -1 ? (args[tagsIdx + 1] || "").split(",").filter(Boolean) : [];

const index = buildIndex();

if (statsOnly) {
  printStats(index);
} else if (moduleFilter || tagFilters.length > 0) {
  // 查询模式：输出紧凑 JSON 到 stdout（供 Agent 读取）
  const result = queryIndex(index, moduleFilter, tagFilters);
  console.log(JSON.stringify(result, null, 2));
} else {
  // 构建模式：写入紧凑索引文件（每条目一行，减少体积）
  const compact = {
    generated_at: index.generated_at,
    total_files: index.total_files,
    total_cases: index.total_cases,
    // 紧凑条目：p=path, n=suite_name, m=product, v=version, t=tags, c=case_count
    entries: index.entries.map(e => ({
      p: e.path,
      n: e.suite_name,
      m: e.product,
      v: e.prd_version,
      t: e.tags,
      c: e.case_count,
    })),
  };
  writeFileSync(INDEX_PATH, JSON.stringify(compact) + "\n", "utf8");
  console.log(`[v] INDEX.json written: ${relative(ROOT, INDEX_PATH)}`);
  printStats(index);
}
