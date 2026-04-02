#!/usr/bin/env node
/**
 * convert-data-assets-v2.mjs
 * Step 1: CSV → MD  (then delete CSV)
 * Step 2: XMind L1 → MD  (with dedup against CSV-produced MDs)
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
  renameSync,
  statSync,
} from "fs";
import { join, basename, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import {
  buildFrontMatter,
  inferTags,
  extractVersionFromPath,
} from "../../../shared/scripts/front-matter-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __scriptdir = dirname(__filename);
const BASE = resolve(__scriptdir, "../..");
const ARCHIVE = join(BASE, "cases/archive/data-assets");
const XMIND_DIR = join(BASE, "cases/xmind/data-assets");

// ─── Helpers ────────────────────────────────────────────────────────────────

const TRASH_DIR = join(BASE, ".trash", new Date().toISOString().slice(0, 10));

/** Move file to .trash/ instead of permanent deletion */
function moveToTrash(filePath) {
  if (!existsSync(TRASH_DIR)) mkdirSync(TRASH_DIR, { recursive: true });
  const dest = join(TRASH_DIR, basename(filePath));
  renameSync(filePath, dest);
}

function stripHTML(str) {
  if (!str) return "";
  // Replace <br>, <br/>, <br /> with newline first
  let s = str.replace(/<br\s*\/?>/gi, "\n");
  // Remove remaining HTML tags
  s = s.replace(/<[^>]+>/g, "");
  // Decode HTML entities
  s = s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
  // Collapse excessive blank lines
  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

function mapPriority(raw) {
  const v = String(raw || "").trim();
  if (v === "0") return "P0";
  if (v === "1") return "P1";
  if (v === "2") return "P2";
  if (v === "3") return "P3";
  return "P2";
}

/** RFC 4180 CSV parser – handles quoted fields with embedded commas/newlines */
function parseCSV(text) {
  const src = text.replace(/^\uFEFF/, ""); // strip BOM
  const rows = [];
  let i = 0;
  const n = src.length;

  while (i < n) {
    const row = [];
    while (true) {
      if (i < n && src[i] === '"') {
        i++; // skip opening quote
        let field = "";
        while (i < n) {
          if (src[i] === '"') {
            if (i + 1 < n && src[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            field += src[i++];
          }
        }
        row.push(field);
      } else {
        let field = "";
        while (i < n && src[i] !== "," && src[i] !== "\n" && src[i] !== "\r") {
          field += src[i++];
        }
        row.push(field);
      }
      if (i < n && src[i] === ",") {
        i++;
        continue;
      }
      break;
    }
    if (i < n && src[i] === "\r") i++;
    if (i < n && src[i] === "\n") i++;
    if (row.length > 0 && !(row.length === 1 && row[0] === "")) rows.push(row);
  }
  return rows;
}

/** Parse numbered list text → array of items */
function splitToList(text) {
  if (!text) return [];
  const clean = stripHTML(text);
  // Try split on "N. " or "N、" at start of line
  const parts = clean.split(/\n(?=\d+[\.\、]\s*)/);
  if (parts.length > 1) {
    return parts
      .map((s) => s.replace(/^\d+[\.\、]\s*/, "").trim())
      .filter(Boolean);
  }
  return clean
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── CSV → MD ────────────────────────────────────────────────────────────────

function csvToMD(csvPath, version) {
  const raw = readFileSync(csvPath, "utf8");
  const rows = parseCSV(raw);
  if (rows.length <= 1) return null;

  const header = rows[0];
  const colIndex = {};
  header.forEach((h, i) => {
    colIndex[h.trim()] = i;
  });

  const titleCol = colIndex["用例标题"] ?? 1;
  const preCol = colIndex["前置条件"] ?? 2;
  const stepCol = colIndex["步骤"] ?? 3;
  const expectCol = colIndex["预期结果"] ?? 4;
  const priCol = colIndex["优先级"] ?? 5;

  const reqName = basename(csvPath, ".csv");
  const relPath = csvPath.replace(BASE + "/", "");
  const caseCount = rows.length - 1;
  const ver = version || extractVersionFromPath(csvPath);
  const title = ver ? `${reqName} ${ver}` : reqName;
  const tags = inferTags({
    title,
    headings: [],
    modulePath: csvPath,
    meta: {},
  });

  const fm = buildFrontMatter({
    name: title,
    description: reqName,
    tags,
    module: "data-assets",
    version: ver || undefined,
    source: relPath,
    case_count: caseCount,
    created_at: new Date().toISOString().slice(0, 10),
    origin: "csv",
  });

  let md = `${fm}\n# ${title}\n\n---\n`;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = stripHTML(row[titleCol] || "").trim();
    const pre = stripHTML(row[preCol] || "").trim();
    const steps = splitToList(row[stepCol] || "");
    const expects = splitToList(row[expectCol] || "");
    const pri = mapPriority(row[priCol]);

    if (!title) continue;

    md += `\n## ${title}\n`;
    md += `**优先级**: ${pri}\n`;
    if (pre) md += `**前置条件**: ${pre}\n`;
    md += `\n**步骤**:\n`;
    if (steps.length > 0)
      steps.forEach((s, i) => {
        md += `${i + 1}. ${s}\n`;
      });
    else md += `1. （无）\n`;
    md += `\n**预期**:\n`;
    if (expects.length > 0)
      expects.forEach((e, i) => {
        md += `${i + 1}. ${e}\n`;
      });
    else md += `1. （无）\n`;
    md += `\n---\n`;
  }

  return { md, reqName, count: caseCount };
}

// ─── XMind helpers ───────────────────────────────────────────────────────────

function sanitizeFileName(name) {
  return name
    .replace(/[\/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForDedup(name) {
  return name
    .replace(/【[^】]*】/g, "")
    .replace(/\(#\d+\)/g, "")
    .replace(/（#\d+）/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

function renderNode(node, depth) {
  const children = node.children?.attached || [];
  let md = "";
  if (depth === 2) {
    md += `\n### ${node.title}\n`;
  } else if (depth === 3) {
    md += `\n#### ${node.title}\n`;
  } else {
    md += `- ${node.title}\n`;
  }
  for (const child of children) {
    md += renderNode(child, depth + 1);
  }
  return md;
}

function xmindL1ToMD(l1Node, xmindFileName) {
  const relXmind = `cases/xmind/data-assets/${xmindFileName}`;
  const l1Title = l1Node.title || "";
  const xmindTitle = `${l1Title}（XMind）`;
  const xmindVer = extractVersionFromPath(l1Title) || extractVersionFromPath(xmindFileName);

  const l2s = l1Node.children?.attached || [];
  const headings = l2s.map((n) => n.title || "");
  const tags = inferTags({
    title: l1Title,
    headings,
    modulePath: relXmind,
    meta: {},
  });

  const fm = buildFrontMatter({
    name: xmindTitle,
    description: l1Title,
    tags,
    module: "data-assets",
    version: xmindVer || undefined,
    source: relXmind,
    created_at: new Date().toISOString().slice(0, 10),
    origin: "xmind",
  });

  let md = `${fm}\n# ${xmindTitle}\n\n---\n`;
  for (const l2 of l2s) {
    md += `\n### ${l2.title}\n`;
    const l3s = l2.children?.attached || [];
    for (const l3 of l3s) {
      const l4s = l3.children?.attached || [];
      if (l4s.length === 0) {
        md += `- ${l3.title}\n`;
      } else {
        md += `\n#### ${l3.title}\n`;
        for (const l4 of l4s) {
          md += renderNode(l4, 4);
        }
      }
    }
  }
  return md;
}

// ─── Recursive dir scan ───────────────────────────────────────────────────────

function scanDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const csvs = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) csvs.push(...scanDir(full));
    else if (e.name.endsWith(".csv")) csvs.push(full);
  }
  return csvs;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let csvConverted = 0;
  let xmindExtracted = 0;
  let xmindSkipped = 0;
  const csvMDNames = {}; // version → Set<normalizedName>

  // ── Step 1: CSV → MD ──────────────────────────────────────────────────────
  console.log("=== Step 1: CSV → MD ===");
  const allCSVs = scanDir(ARCHIVE);
  console.log(`Found ${allCSVs.length} CSV files\n`);

  for (const csvPath of allCSVs) {
    const rel = csvPath.replace(ARCHIVE + "/", "");
    const version = rel.split("/")[0];

    try {
      const result = csvToMD(csvPath, version);
      if (!result) {
        console.log(`  SKIP (empty): ${rel}`);
        continue;
      }
      const mdPath = csvPath.replace(/\.csv$/, ".md");
      writeFileSync(mdPath, result.md, "utf8");
      console.log(`  ✓ ${rel}  (${result.count} cases)`);
      csvConverted++;

      if (!csvMDNames[version]) csvMDNames[version] = new Set();
      csvMDNames[version].add(normalizeForDedup(result.reqName));

      moveToTrash(csvPath);
    } catch (err) {
      console.error(`  ✗ ERROR ${rel}: ${err.message}`);
    }
  }

  // ── Step 2: XMind → MD ────────────────────────────────────────────────────
  console.log("\n=== Step 2: XMind → MD ===");

  const configPath = join(BASE, ".claude/config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  // NOTE: This script is DTStack-specific. It will be moved to dtstack-data branch in GEN-06.
  const xmindVersionMap = config.versionMap || {};

  const xmindFiles = readdirSync(XMIND_DIR).filter((f) => f.endsWith(".xmind"));

  for (const xmindFile of xmindFiles) {
    const version = xmindVersionMap[xmindFile];
    if (!version) {
      console.log(`  SKIP (no version): ${xmindFile}`);
      continue;
    }

    const xmindPath = join(XMIND_DIR, xmindFile);
    const outDir = join(ARCHIVE, version);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    let zip;
    try {
      const data = readFileSync(xmindPath);
      zip = await JSZip.loadAsync(data);
    } catch (err) {
      console.error(`  ✗ Open error ${xmindFile}: ${err.message}`);
      continue;
    }

    if (!zip.file("content.json")) {
      console.log(`  SKIP (no content.json): ${xmindFile}`);
      continue;
    }

    const json = await zip.file("content.json").async("string");
    const parsed = JSON.parse(json);
    const root = parsed[0].rootTopic;
    const l1s = root.children?.attached || [];

    console.log(
      `\n  📦 ${xmindFile} → version=${version}, ${l1s.length} L1 nodes`,
    );

    for (const l1 of l1s) {
      const normName = normalizeForDedup(l1.title);
      const existingNames = csvMDNames[version] || new Set();

      if (existingNames.has(normName)) {
        console.log(`    ⟳ SKIP dedup: "${l1.title}"`);
        xmindSkipped++;
        continue;
      }

      const safeTitle = sanitizeFileName(l1.title);
      const mdPath = join(outDir, `${safeTitle}.md`);

      try {
        const md = xmindL1ToMD(l1, xmindFile);
        writeFileSync(mdPath, md, "utf8");
        console.log(`    ✓ ${version}/${safeTitle}.md`);
        xmindExtracted++;

        if (!csvMDNames[version]) csvMDNames[version] = new Set();
        csvMDNames[version].add(normName);
      } catch (err) {
        console.error(`    ✗ ERROR: ${err.message}`);
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════");
  console.log(`✅ CSV → MD (deleted):      ${csvConverted}`);
  console.log(`✅ XMind L1 → MD:           ${xmindExtracted}`);
  console.log(`⟳  XMind L1 skipped (dup): ${xmindSkipped}`);
  console.log(`📄 Total MD files produced: ${csvConverted + xmindExtracted}`);
  console.log("══════════════════════════════════════");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
