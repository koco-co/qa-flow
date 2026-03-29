/**
 * backfill-archive-frontmatter.mjs
 * 为现有 cases/archive/ 下的 MD 文件添加 YAML front-matter
 *
 * 用法:
 *   node backfill-archive-frontmatter.mjs              # 增量（跳过已有 front-matter）
 *   node backfill-archive-frontmatter.mjs --force       # 强制覆盖已有 front-matter
 *   node backfill-archive-frontmatter.mjs --dry-run     # 只输出预览，不写入
 *   node backfill-archive-frontmatter.mjs --path <file> # 仅处理单个文件
 *   node backfill-archive-frontmatter.mjs --legacy      # 使用旧字段名（name/module/source/created_at）
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import {
  buildFrontMatter,
  inferTags,
  parseFrontMatter,
  extractModuleKey,
  extractVersionFromPath,
} from "../../../shared/scripts/front-matter-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const ARCHIVE_DIR = join(ROOT, "cases/archive");

// ─── CLI 参数 ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DRY_RUN = args.includes("--dry-run");
const LEGACY = args.includes("--legacy");   // 使用旧字段名（name/module/source/created_at）
const PATH_ARG = args.includes("--path")
  ? args[args.indexOf("--path") + 1]
  : null;

// ─── 收集 MD 文件 ─────────────────────────────────────────────────────────────

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
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

// ─── 解析现有 4 种 header 格式 ───────────────────────────────────────────────

/**
 * 从 blockquote header（旧格式）中提取元数据
 * @param {string} body  front-matter 之后（或文件全文，当无 front-matter 时）
 * @returns {{ name: string, source: string, case_count: number | null }}
 */
function parseOldHeader(body) {
  const lines = body.split("\n");

  // 提取 H1 标题
  const h1Line = lines.find((l) => l.startsWith("# "));
  const name = h1Line ? h1Line.replace(/^# /, "").trim() : "";

  // 提取 > 来源：
  const sourceLine = lines.find((l) => /^> 来源：/.test(l));
  const source = sourceLine
    ? sourceLine.replace(/^> 来源：/, "").trim()
    : "";

  // 提取 > 用例数：
  const countLine = lines.find((l) => /^> 用例数：/.test(l));
  const case_count = countLine
    ? parseInt(countLine.replace(/^> 用例数：/, "").trim(), 10) || null
    : null;

  // Pattern C: <!-- split-from: ... -->
  const splitLine = lines.find((l) => /^<!-- split-from:/.test(l));
  const splitSource = splitLine
    ? (splitLine.match(/split-from:\s*([^|]+)/) || [])[1]?.trim()
    : null;

  return {
    name,
    source: source || splitSource || "",
    case_count: isNaN(case_count) ? null : case_count,
  };
}

/**
 * 从文件内容中提取 H2/H3 标题（用于 tag 推断）
 * @param {string} content
 * @returns {string[]}
 */
function extractHeadings(content) {
  return [...content.matchAll(/^#{2,3} (.+)$/gm)].map((m) => m[1].trim());
}

// ─── 处理单个文件 ─────────────────────────────────────────────────────────────

function processFile(filePath) {
  const relPath = filePath.replace(ROOT + "/", "");
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch (e) {
    return { status: "error", reason: `读取失败: ${e.message}` };
  }

  const { frontMatter, body } = parseFrontMatter(content);

  if (frontMatter !== null && !FORCE) {
    return { status: "skip", reason: "已有 front-matter" };
  }

  // 使用 body（去掉旧 front-matter 后的内容），或整个 content（无旧 front-matter）
  const rawBody = frontMatter !== null ? body : content;

  const { name, source, case_count } = parseOldHeader(rawBody);
  const headings = extractHeadings(rawBody);

  // 从路径推断 module/version
  const moduleKey = extractModuleKey(filePath);
  const version =
    extractVersionFromPath(filePath) ||
    extractVersionFromPath(source) ||
    extractVersionFromPath(name);

  // 生成 tags
  const tags = inferTags({
    title: name,
    headings,
    modulePath: filePath,
    meta: {},
  });

  // 推断 origin
  let origin = "unknown";
  if (source.endsWith(".json")) origin = "json";
  else if (source.endsWith(".xmind") || name.endsWith("（XMind）"))
    origin = "xmind";
  else if (source.endsWith(".csv")) origin = "csv";
  else if (content.includes("<!-- split-from:")) origin = "split";

  const today = new Date().toISOString().slice(0, 10);
  const displayName = name || basename(filePath, ".md");
  const fm = LEGACY
    ? buildFrontMatter({
        name: displayName,
        description: displayName,
        tags,
        module: moduleKey || undefined,
        version: version || undefined,
        source: source || relPath,
        case_count: case_count !== null ? case_count : undefined,
        created_at: today,
        origin,
      }, "archive")
    : buildFrontMatter({
        suite_name: displayName,
        description: displayName,
        prd_version: version || undefined,
        prd_path: source || relPath,
        prd_url: "",
        product: moduleKey || undefined,
        dev_version: "",
        tags,
        create_at: today,
        update_at: today,
        status: "",
        health_warnings: [],
        repos: [],
        case_count: case_count !== null ? case_count : undefined,
        origin,
      });

  // 构建新文件内容：front-matter + 原 body（保持 H1 以下不变）
  // 如果原 body 以 blockquote header 开头，保留（front-matter 与它共存是冗余但无害）
  // 实际上 rawBody 包含 # 标题 + blockquote + 用例内容
  const newContent = fm + rawBody;

  if (DRY_RUN) {
    return { status: "dry-run", fm: fm.split("\n").slice(0, 6).join("\n") + "\n..." };
  }

  try {
    writeFileSync(filePath, newContent, "utf-8");
    return { status: "ok" };
  } catch (e) {
    return { status: "error", reason: `写入失败: ${e.message}` };
  }
}

// ─── 主流程 ──────────────────────────────────────────────────────────────────

function main() {
  const files = PATH_ARG
    ? [resolve(PATH_ARG)]
    : collectMdFiles(ARCHIVE_DIR);

  const stats = { ok: 0, skip: 0, error: 0, dryRun: 0 };

  for (const filePath of files) {
    const rel = filePath.replace(ROOT + "/", "");
    const result = processFile(filePath);

    switch (result.status) {
      case "ok":
        stats.ok++;
        console.log(`✅ ${rel}`);
        break;
      case "skip":
        stats.skip++;
        if (args.includes("--verbose")) {
          console.log(`⏭  ${rel}  (${result.reason})`);
        }
        break;
      case "dry-run":
        stats.dryRun++;
        console.log(`[dry-run] ${rel}`);
        console.log(result.fm);
        break;
      case "error":
        stats.error++;
        console.error(`❌ ${rel}: ${result.reason}`);
        break;
    }
  }

  console.log(
    `\n完成：处理 ${files.length} 个文件`,
  );
  if (DRY_RUN) {
    console.log(`  预览：${stats.dryRun} 个`);
  } else {
    console.log(`  写入：${stats.ok} 个`);
    console.log(`  跳过：${stats.skip} 个`);
  }
  if (stats.error > 0) {
    console.log(`  失败：${stats.error} 个`);
    process.exit(1);
  }
}

main();
