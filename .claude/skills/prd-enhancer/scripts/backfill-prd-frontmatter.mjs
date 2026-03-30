/**
 * backfill-prd-frontmatter.mjs
 * 为 cases/requirements/ 下的 PRD Markdown 文件添加 YAML front-matter
 *
 * 用法:
 *   node backfill-prd-frontmatter.mjs              # 增量（跳过已有 front-matter）
 *   node backfill-prd-frontmatter.mjs --force       # 强制覆盖
 *   node backfill-prd-frontmatter.mjs --dry-run     # 只输出预览，不写入
 *   node backfill-prd-frontmatter.mjs --path <file> # 仅处理单个文件
 *   node backfill-prd-frontmatter.mjs --legacy      # 使用旧字段名（name/module/source/created_at）
 *
 * 跳过文件（始终）：
 *   - HANDOFF.md
 *   - .qa-state.json
 *   - 文件名不以 .md 结尾
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, join, basename, dirname } from "path";
import { fileURLToPath } from "url";
import {
  buildFrontMatter,
  parseFrontMatter,
  extractModuleKey,
  extractVersionFromPath,
} from "../../../shared/scripts/front-matter-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const REQ_DIR = join(ROOT, "cases/requirements");

// ─── CLI 参数 ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DRY_RUN = args.includes("--dry-run");
const LEGACY = args.includes("--legacy");   // 使用旧字段名（name/module/source/created_at）
const PATH_ARG = args.includes("--path")
  ? args[args.indexOf("--path") + 1]
  : null;

// ─── 收集 MD 文件 ─────────────────────────────────────────────────────────────

// 跳过这些文件名（无论路径）
const SKIP_NAMES = new Set(["HANDOFF.md", "README.md"]);

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
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      !SKIP_NAMES.has(entry.name)
    ) {
      results.push(full);
    }
  }
  return results;
}

// ─── 从路径推断 story ─────────────────────────────────────────────────────────

function extractStoryFromPath(filePath) {
  const m = filePath.replace(/\\/g, "/").match(/\/(Story-\d{8})\//);
  return m ? m[1] : null;
}

// ─── 从文件名推断 prd_id 和 status ───────────────────────────────────────────

function extractPrdId(fileName) {
  // PRD-15530-xxx.md → 15530
  const m = basename(fileName, ".md").match(/^(?:PRD-|prd-)(\d+)/i);
  return m ? m[1] : null;
}

function inferStatus(fileName) {
  const base = basename(fileName, ".md").toLowerCase();
  if (base.endsWith("-enhanced")) return "enhanced";
  if (base.endsWith("-formalized")) return "formalized";
  return "raw";
}

// ─── 解析现有 PRD 头部 ────────────────────────────────────────────────────────

/**
 * 从 PRD 正文中解析常见 blockquote/comment 元数据字段
 */
function parsePrdHeader(body) {
  const lines = body.split("\n");

  // H1 标题（第一个 # 开头的行）
  const h1 = (lines.find((l) => /^# /.test(l)) || "")
    .replace(/^# /, "")
    .trim();

  // > 来源：
  const sourceLine = lines.find((l) => /^> 来源：/.test(l));
  const source = sourceLine
    ? sourceLine.replace(/^> 来源：/, "").trim()
    : null;

  // > 文档ID：
  const docIdLine = lines.find((l) => /^> 文档ID：/.test(l));
  const docId = docIdLine
    ? docIdLine.replace(/^> 文档ID：/, "").trim()
    : null;

  // > 导入日期：
  const importedLine = lines.find((l) => /^> 导入日期：/.test(l));
  const importedAt = importedLine
    ? importedLine.replace(/^> 导入日期：/, "").trim()
    : null;

  // > 开发版本：  or  开发版本：（文件正文中）
  const devLine =
    lines.find((l) => /^> 开发版本：/.test(l)) ||
    lines.find((l) => /^开发版本：/.test(l));
  const devVersion = devLine
    ? devLine.replace(/^>?\s*开发版本：/, "").trim()
    : null;

  // <!-- enhanced-at: ISO8601 | ... -->
  const enhancedLine = lines.find((l) => /<!-- enhanced-at:/.test(l));
  let enhancedAt = null;
  let imagesProcessed = null;
  let healthWarnings = null;
  if (enhancedLine) {
    const m = enhancedLine.match(/enhanced-at:\s*([^\s|]+)/);
    if (m) enhancedAt = m[1];
    const imgM = enhancedLine.match(/images:\s*([\d/]+)/);
    if (imgM) imagesProcessed = imgM[1];
    const hwM = enhancedLine.match(/health:\s*(\d+)/);
    if (hwM) healthWarnings = parseInt(hwM[1], 10);
  }

  return {
    h1,
    source,
    docId,
    importedAt,
    devVersion,
    enhancedAt,
    imagesProcessed,
    healthWarnings,
  };
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

  // 使用原始 body（去掉旧 front-matter 后的内容）进行解析
  const rawBody = frontMatter !== null ? body : content;
  const {
    h1,
    source,
    docId,
    importedAt,
    devVersion,
    enhancedAt,
    imagesProcessed,
    healthWarnings,
  } = parsePrdHeader(rawBody);

  const fileName = basename(filePath);
  const status = inferStatus(fileName);

  // 从路径推断模块 key 和版本
  const moduleKey = extractModuleKey(filePath);
  const version =
    extractVersionFromPath(filePath) ||
    extractVersionFromPath(source || "") ||
    extractVersionFromPath(h1 || "");

  // Story
  const story = extractStoryFromPath(filePath);

  // PRD ID
  const prdId = extractPrdId(fileName);

  // name：优先 H1（去掉 Markdown 加粗），其次文件名（去掉 -enhanced/-formalized 后缀）
  const cleanName = (h1 || "")
    .replace(/\*\*/g, "")   // 去掉 **bold**
    .replace(/`/g, "")      // 去掉 backticks
    .trim();
  const fileNameFallback = basename(fileName, ".md")
    .replace(/-enhanced$/i, "")
    .replace(/-formalized$/i, "");
  const name = cleanName || fileNameFallback;

  // description：取正文中第一行有意义的非结构化内容（≤60 字）
  const descCandidate = rawBody
    .split("\n")
    .filter(
      (l) =>
        l.trim() &&
        !l.startsWith("#") &&
        !l.startsWith(">") &&
        !l.startsWith("<!--") &&
        !l.startsWith("|") &&
        !l.startsWith("-") &&
        !/^\*\*[^*]+\*\*$/.test(l.trim()) &&  // 纯加粗行（标题行）跳过
        l.trim().length > 8,
    )
    .find(Boolean);
  const description =
    descCandidate && descCandidate.trim().length <= 120
      ? descCandidate
          .trim()
          .replace(/\*\*/g, "")  // 去掉加粗
          .slice(0, 60)
      : name;

  // created_at
  const createdAt =
    importedAt || new Date().toISOString().slice(0, 10);

  const today = new Date().toISOString().slice(0, 10);

  let fm;
  if (LEGACY) {
    // 旧字段名格式（向后兼容）
    const fields = {
      name,
      description,
      source: source || "内部需求文档",
      module: moduleKey || undefined,
      version: version || undefined,
      prd_id: prdId || undefined,
      doc_id: docId || undefined,
      dev_version: devVersion || undefined,
      story: story || undefined,
      created_at: createdAt,
      status,
    };
    if (status === "enhanced" && enhancedAt) {
      fields.enhanced_at = enhancedAt;
      if (imagesProcessed) fields.images_processed = imagesProcessed;
      if (healthWarnings !== null) fields.health_warnings = healthWarnings;
    }
    fm = buildFrontMatter(fields, "prd");
  } else {
    // 新字段名格式
    fm = buildFrontMatter({
      prd_name: name,
      description,
      prd_id: prdId ? Number(prdId) || undefined : undefined,
      prd_version: version || undefined,
      prd_source: source || "内部需求文档",
      prd_url: "",
      product: moduleKey || undefined,
      dev_version: devVersion || undefined,
      tags: [],
      create_at: createdAt,
      update_at: status === "enhanced" && enhancedAt ? enhancedAt.slice(0, 10) : today,
      status,
      health_warnings: [],
      repos: [],
      case_path: "",
    });
  }
  const newContent = fm + rawBody;

  if (DRY_RUN) {
    return {
      status: "dry-run",
      fm: fm.split("\n").slice(0, 8).join("\n") + "\n...",
    };
  }

  try {
    writeFileSync(filePath, newContent, "utf-8");
    return { status: "ok" };
  } catch (e) {
    return { status: "error", reason: `写入失败: ${e.message}` };
  }
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────

function main() {
  const files = PATH_ARG ? [resolve(PATH_ARG)] : collectMdFiles(REQ_DIR);

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

  console.log(`\n完成：处理 ${files.length} 个文件`);
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
