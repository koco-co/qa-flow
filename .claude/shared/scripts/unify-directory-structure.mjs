#!/usr/bin/env node
/**
 * unify-directory-structure.mjs
 *
 * 统一 cases/ 目录结构，让 requirements/ 和 xmind/ 对齐 archive/ 的模式：
 *   requirements/{module}/v{version}/  或  requirements/custom/{key}/（扁平）
 *   xmind/{module}/v{version}/         或  xmind/custom/{key}/
 *
 * 用法：
 *   node unify-directory-structure.mjs --dry-run   # 预览操作
 *   node unify-directory-structure.mjs             # 执行迁移
 *   node unify-directory-structure.mjs --req-only  # 仅迁移 requirements
 *   node unify-directory-structure.mjs --xmind-only # 仅拆分 xmind
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
  renameSync,
  statSync,
  unlinkSync,
  rmdirSync,
  symlinkSync,
  lstatSync,
} from "fs";
import { join, basename, dirname, resolve, extname, relative } from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import { parseFrontMatter } from "./front-matter-utils.mjs";
import { loadConfig, getWorkspaceRoot } from "./load-config.mjs";

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const REQ_ONLY = args.includes("--req-only");
const XMIND_ONLY = args.includes("--xmind-only");

const BASE = getWorkspaceRoot();
const TRASH_TS = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const TRASH_DIR = join(BASE, ".trash", TRASH_TS);

let movedCount = 0;
let skippedCount = 0;
let xmindSplitCount = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(msg);
}

function ensureDir(dir) {
  if (!DRY_RUN && !existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * 移动文件（DRY_RUN 模式只打印）
 * @param {string} src 源路径
 * @param {string} dest 目标路径
 * @param {string} [note] 附加说明
 */
function moveFile(src, dest, note = "") {
  const relSrc = relative(BASE, src);
  const relDest = relative(BASE, dest);
  log(`  MOVE  ${relSrc} → ${relDest}${note ? `  [${note}]` : ""}`);
  if (!DRY_RUN) {
    if (!existsSync(src)) {
      log(`        SKIP (src already gone): ${relSrc}`);
      return false;
    }
    ensureDir(dirname(dest));
    if (existsSync(dest)) {
      log(`        SKIP (target exists): ${relDest}`);
      skippedCount++;
      return false;
    }
    renameSync(src, dest);
    movedCount++;
  }
  return true;
}

/**
 * 移动整个目录（含子内容）到目标路径
 */
function moveDir(src, dest, note = "") {
  const relSrc = relative(BASE, src);
  const relDest = relative(BASE, dest);
  log(`  MOVEDIR ${relSrc}/ → ${relDest}/  [${note}]`);
  if (!DRY_RUN) {
    ensureDir(dirname(dest));
    renameSync(src, dest);
  }
}

/**
 * 移动文件到 .trash/
 */
function trashFile(src, subDir = "") {
  const trashDest = join(TRASH_DIR, subDir, basename(src));
  const relSrc = relative(BASE, src);
  log(`  TRASH ${relSrc}`);
  if (!DRY_RUN) {
    if (!existsSync(src)) {
      log(`        SKIP (already gone): ${relSrc}`);
      return;
    }
    ensureDir(join(TRASH_DIR, subDir));
    let dest = trashDest;
    let i = 1;
    while (existsSync(dest)) {
      const ext = extname(trashDest);
      // 当 ext 为空时（如 .DS_Store、.qa-state.json）直接追加 -N 后缀
      dest = ext ? trashDest.slice(0, -ext.length) + `-${i}${ext}` : `${trashDest}-${i}`;
      i++;
    }
    renameSync(src, dest);
  }
}

/**
 * 递归移动目录到 .trash/
 */
function trashDir(src, subDir = "") {
  const dirName = basename(src);
  const dest = join(TRASH_DIR, subDir, dirName);
  log(`  TRASH_DIR ${relative(BASE, src)}/`);
  if (!DRY_RUN) {
    ensureDir(join(TRASH_DIR, subDir));
    let finalDest = dest;
    let i = 1;
    while (existsSync(finalDest)) {
      finalDest = `${dest}-${i}`;
      i++;
    }
    renameSync(src, finalDest);
  }
}

/**
 * 清理空目录（递归向上）
 */
function removeEmptyDir(dir) {
  if (DRY_RUN) return;
  try {
    const entries = readdirSync(dir);
    if (entries.length === 0) {
      rmdirSync(dir);
      log(`  RMDIR ${relative(BASE, dir)}/`);
      removeEmptyDir(dirname(dir));
    }
  } catch {
    // ignore
  }
}

/**
 * 从 name 字段提取清洁文件名（去除 PRD-XX 前缀和数字前缀）
 * 示例：
 *   "PRD-15530 【内置规则丰富】合理性校验-多表字段值对比（计算逻辑）" → "【内置规则丰富】合理性校验-多表字段值对比（计算逻辑）"
 *   "PRD-26-数据质量-质量问题台账" → "数据质量-质量问题台账"
 *   "PRD-21-管理域目录管理-L3新增业务责任人字段" → "管理域目录管理-L3新增业务责任人字段"
 *   "15530【内置规则丰富】合理性，多表" → "【内置规则丰富】合理性，多表"
 */
function cleanPrdName(name) {
  if (!name) return "";
  return name
    // 去 PRD-NNNNN 或 PRD-NN 前缀（空格或连字符分隔）
    .replace(/^PRD-\d+[\s-]+/, "")
    // 去纯数字前缀（如 "15530【..."）
    .replace(/^\d+\s*/, "")
    .trim();
}

/**
 * 将名称转为合法文件名（不含 .md 后缀）
 */
function sanitizeFileName(name) {
  return name
    .replace(/[\/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/&/g, "&") // keep & (valid in macOS/Linux)
    .trim();
}

/**
 * 生成唯一文件名（若目标已存在则追加 -2、-3…）
 */
function uniqueFileName(dir, baseName, ext) {
  let candidate = join(dir, `${baseName}${ext}`);
  let i = 2;
  while (existsSync(candidate) || usedNames.has(candidate)) {
    candidate = join(dir, `${baseName}-${i}${ext}`);
    i++;
  }
  usedNames.add(candidate);
  return candidate;
}

// 追踪本次运行中已占用的目标路径（dry-run 时也需要防碰撞）
const usedNames = new Set();

// ─── Requirements Migration ───────────────────────────────────────────────────

/**
 * 迁移 cases/requirements/data-assets/
 * 规则：Story-YYYYMMDD/ 和 Story/ → data-assets/v{version}/
 */
async function migrateDataAssets() {
  const reqDir = join(BASE, "cases/requirements/data-assets");
  if (!existsSync(reqDir)) {
    log("  SKIP: cases/requirements/data-assets/ not found");
    return;
  }

  log("\n── data-assets requirements ──");

  // 找所有 Story* 子目录
  const entries = readdirSync(reqDir, { withFileTypes: true });
  const storyDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith("Story"))
    .map((e) => join(reqDir, e.name));

  for (const storyDir of storyDirs) {
    log(`\n  Processing ${relative(BASE, storyDir)}/`);

    const files = readdirSync(storyDir, { withFileTypes: true });

    // 找出所有 .md PRD 文件
    const mdFiles = files
      .filter((f) => f.isFile() && f.name.endsWith(".md") && f.name !== "HANDOFF.md")
      .map((f) => {
        const fullPath = join(storyDir, f.name);
        const content = readFileSync(fullPath, "utf8");
        const { frontMatter } = parseFrontMatter(content);
        return { file: f.name, path: fullPath, fm: frontMatter || {} };
      });

    // 按 base name（去掉 -enhanced/-formalized 后缀）分组
    // 这样 PRD-15530-xxx.md 和 PRD-15530-xxx-enhanced.md 会归到同一组
    const byBaseName = new Map();
    for (const f of mdFiles) {
      const baseName = f.file
        .replace(/-enhanced\.md$/, ".md")
        .replace(/-formalized\.md$/, ".md");
      if (!byBaseName.has(baseName)) byBaseName.set(baseName, []);
      byBaseName.get(baseName).push(f);
    }

    for (const [, group] of byBaseName) {
      const enhanced = group.find((f) => f.fm.status === "enhanced");
      const raw = group.find((f) => f.fm.status === "raw");

      // 从 group 中所有文件里寻找 version（任意文件有即可）
      const version =
        group.reduce((v, f) => v || f.fm.version || f.fm.prd_version, null);

      // 确定保留的文件和名称
      let keepFile = enhanced || raw;
      if (!keepFile) continue;

      let keepName;
      if (enhanced) {
        // enhanced 版名称最权威
        keepName = cleanPrdName(enhanced.fm.name || raw?.fm?.name || "");
      } else {
        // 只有 raw
        const rawName = raw.fm.name || "";
        const rawDesc = raw.fm.description || "";
        const rawDevVer = raw.fm.dev_version || "";
        if (/^Story-\d/.test(rawName)) {
          // 旧格式文件：description 可能是 dev_version，需从 body 提取需求内容
          if (rawDesc && rawDesc !== rawDevVer && !rawDesc.startsWith("开发版本")) {
            keepName = rawDesc;
          } else {
            // 尝试从 body 提取「需求内容：」行
            const content = readFileSync(raw.path, "utf8");
            const { body } = parseFrontMatter(content);
            const reqLine = (body || "").split("\n").find((l) =>
              l.startsWith("需求内容：") || l.startsWith("需求内容:")
            );
            if (reqLine) {
              keepName = reqLine.replace(/^需求内容[：:]\s*/, "").trim();
            } else {
              keepName = cleanPrdName(rawName);
            }
          }
        } else {
          keepName = cleanPrdName(rawName);
        }
      }

      if (!keepName) {
        log(`  WARN: empty name for ${keepFile.file}, skipping`);
        continue;
      }

      if (!version) {
        // 尝试从 Story 目录名推断版本（如 Story/ 下的旧格式文件自带 v6.4.9 在文件名中）
        const verFromFile = extractVersionFromPath(keepFile.file);
        const verFromDir = extractVersionFromPath(basename(storyDir));
        const resolvedVer = verFromFile || verFromDir;
        if (!resolvedVer) {
          log(`  WARN: no version found for ${keepFile.file}, skipping`);
          continue;
        }
        const targetDir = join(reqDir, resolvedVer);
        const cleanName = sanitizeFileName(keepName);
        const targetPath = uniqueFileName(targetDir, cleanName, ".md");
        moveFile(keepFile.path, targetPath, "keep");
        for (const f of group) {
          if (f !== keepFile) trashFile(f.path, "requirements");
        }
        continue;
      }

      const targetDir = join(reqDir, version);
      const cleanName = sanitizeFileName(keepName);
      const targetPath = uniqueFileName(targetDir, cleanName, ".md");
      moveFile(keepFile.path, targetPath, "keep");

      for (const f of group) {
        if (f !== keepFile) trashFile(f.path, "requirements");
      }
    }

    // 处理非 PRD 文件：HANDOFF.md、.qa-state.json、temp/
    for (const entry of files) {
      const fullPath = join(storyDir, entry.name);
      if (entry.name === "HANDOFF.md") {
        trashFile(fullPath, "requirements");
      } else if (entry.name === ".qa-state.json") {
        trashFile(fullPath, "requirements");
      } else if (entry.isDirectory() && entry.name === "temp") {
        trashDir(fullPath, "requirements");
      }
    }

    removeEmptyDir(storyDir);
  }
}

/**
 * 从文件路径提取版本号（用于旧格式 Story 目录）
 */
function extractVersionFromPath(filePath) {
  const m = filePath.replace(/\\/g, "/").match(/\bv(\d+\.\d+\.\d+)\b/i);
  return m ? `v${m[1]}` : null;
}

/**
 * 迁移 cases/requirements/xyzh/ → cases/requirements/custom/xyzh/（扁平）
 */
async function migrateXyzh() {
  const srcDir = join(BASE, "cases/requirements/xyzh");
  const destDir = join(BASE, "cases/requirements/custom/xyzh");

  if (!existsSync(srcDir)) {
    log("  SKIP: cases/requirements/xyzh/ not found");
    return;
  }

  log("\n── xyzh requirements (flatten to custom/xyzh/) ──");

  ensureDir(destDir);

  // 递归找所有 .md 文件
  const allFiles = getAllMdFiles(srcDir);

  // 按 base name（去掉 -enhanced/-formalized 后缀）分组
  // 这样 PRD-26-xxx.md 和 PRD-26-xxx-enhanced.md 归一组
  // 而 prd-20260127-数据目录.md 和 prd-20260127-流程中心.md 保持独立组
  const byBaseName = new Map();
  for (const filePath of allFiles) {
    const content = readFileSync(filePath, "utf8");
    const { frontMatter } = parseFrontMatter(content);
    const fm = frontMatter || {};
    const fileBase = basename(filePath)
      .replace(/-enhanced\.md$/, ".md")
      .replace(/-formalized\.md$/, ".md");
    if (!byBaseName.has(fileBase)) byBaseName.set(fileBase, []);
    byBaseName.get(fileBase).push({ path: filePath, fm });
  }

  for (const [groupKey, group] of byBaseName) {
    const enhanced = group.find((f) => f.fm.status === "enhanced");
    const raw = group.find((f) => f.fm.status === "raw");

    let keepFile = enhanced || raw;
    if (!keepFile) continue;

    // 推导名称
    const nameField = keepFile.fm.name || "";
    let cleanName;

    if (!nameField || nameField === "信永中和数据门户") {
      // 无意义的 name，从文件名推导
      const baseName = basename(keepFile.path, ".md").replace(/-enhanced$/, "");
      // 去掉前缀 prd-YYYYMMDD-
      cleanName = baseName.replace(/^prd-\d{8}-/i, "");
      // 若仍以 PRD-NN 开头则处理
      cleanName = cleanPrdName(cleanName);
    } else {
      cleanName = cleanPrdName(nameField);
    }

    cleanName = sanitizeFileName(cleanName);
    if (!cleanName) {
      log(`  WARN: empty name for ${groupKey}, skip`);
      continue;
    }

    const targetPath = uniqueFileName(destDir, cleanName, ".md");
    moveFile(keepFile.path, targetPath, "keep");

    // 其余进 trash
    for (const f of group) {
      if (f !== keepFile) {
        trashFile(f.path, "requirements/xyzh");
      }
    }
  }

  // 处理非 .md 文件：.qa-state.json、temp/、.docx、.xlsx 等
  processNonMdInDir(srcDir);

  removeEmptyDir(srcDir);
}

/**
 * 递归获取目录下所有 .md 文件路径
 */
function getAllMdFiles(dir) {
  const result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...getAllMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      result.push(fullPath);
    }
  }
  return result;
}

/**
 * 处理目录中非 .md 文件（移到 trash），递归
 */
function processNonMdInDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "temp") {
        trashDir(fullPath, "requirements/xyzh");
      } else {
        processNonMdInDir(fullPath);
      }
    } else if (entry.isFile() && !entry.name.endsWith(".md")) {
      trashFile(fullPath, "requirements/xyzh");
    }
  }
}

// ─── XMind Splitting ──────────────────────────────────────────────────────────

const SPECIAL_XMIND_DIRS = {
  "数据资产-主流程用例.xmind": "主流程",
  "数据资产_岚图标品用例整理.xmind": "岚图标品",
  "离线开发-集成测试用例.xmind": "集成测试",
  "离线开发-主流程用例_6.3.x.xmind": "6.3.x",
};

/**
 * 从 xmind 文件名提取版本号
 * 兼容新旧命名；核心依据是文件名尾部的 `v{version}.xmind`
 * 也检查 dataAssetsVersionMap
 */
function extractVersionFromXmindName(fileName, dataAssetsVersionMap) {
  // dataAssetsVersionMap 优先（data-assets 专用）
  if (dataAssetsVersionMap && dataAssetsVersionMap[fileName]) {
    const v = dataAssetsVersionMap[fileName];
    // 过滤非版本特殊值
    if (v && /^v\d/.test(v)) return v;
    return null; // 主流程、岚图标品等特殊值
  }
  // 通用正则提取
  const m = fileName.match(/v(\d+\.\d+\.\d+)\.xmind$/i);
  return m ? `v${m[1]}` : null;
}

/**
 * 从 L1 节点标题生成文件名（最多 80 字符）
 */
function xmindTitleToFileName(title) {
  const sanitized = title
    .replace(/[\/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized.length > 80 ? sanitized.slice(0, 80).trim() : sanitized;
}

/**
 * 创建单个 L1 节点的独立 xmind 文件
 */
async function writeSingleL1Xmind(originalZip, sheet, l1Node, outputPath) {
  const newSheet = {
    ...sheet,
    rootTopic: {
      ...sheet.rootTopic,
      children: { attached: [l1Node] },
    },
  };
  const newContent = [newSheet];

  const newZip = new JSZip();
  newZip.file("content.json", JSON.stringify(newContent, null, 0));

  // 复制 metadata.json 和 manifest.json（如存在）
  for (const name of ["metadata.json", "manifest.json"]) {
    const f = originalZip.file(name);
    if (f) {
      const buf = await f.async("nodebuffer");
      newZip.file(name, buf);
    }
  }

  // 复制 attachments/ 等资源（可选，保守策略：只复制内容相关）
  const attachmentsFolder = originalZip.folder("attachments");
  if (attachmentsFolder) {
    attachmentsFolder.forEach((relPath, file) => {
      newZip.folder("attachments").file(relPath, file.async("nodebuffer"));
    });
  }

  const buffer = await newZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  if (!DRY_RUN) {
    ensureDir(dirname(outputPath));
    writeFileSync(outputPath, buffer);
  }
}

/**
 * 处理单个 xmind 文件（拆分 L1 节点）
 */
async function splitXmindFile(xmindPath, moduleDir, version) {
  const outputDir = join(BASE, `cases/xmind/${moduleDir}/${version}`);
  const fileName = basename(xmindPath);
  log(`\n  Splitting ${relative(BASE, xmindPath)} → ${relative(BASE, outputDir)}/`);

  let zip;
  try {
    const data = readFileSync(xmindPath);
    zip = await JSZip.loadAsync(data);
  } catch (err) {
    log(`  ERROR: Failed to open ${fileName}: ${err.message}`);
    return;
  }

  const contentFile = zip.file("content.json");
  if (!contentFile) {
    log(`  SKIP (no content.json): ${fileName}`);
    return;
  }

  const json = await contentFile.async("string");
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    log(`  ERROR: Invalid JSON in ${fileName}: ${err.message}`);
    return;
  }

  const sheet = parsed[0];
  if (!sheet) {
    log(`  SKIP (empty content): ${fileName}`);
    return;
  }

  const l1Nodes = sheet.rootTopic?.children?.attached || [];
  log(`    Found ${l1Nodes.length} L1 nodes`);

  if (l1Nodes.length === 0) {
    log(`  SKIP (no L1 nodes): ${fileName}`);
    return;
  }

  ensureDir(outputDir);

  // 追踪当前 version 目录下已存在的文件名（用于去重）
  const existingInDir = new Set();
  if (existsSync(outputDir)) {
    for (const f of readdirSync(outputDir)) {
      existingInDir.add(f);
    }
  }

  for (const l1 of l1Nodes) {
    const rawTitle = l1.title || "unnamed";
    let baseName = xmindTitleToFileName(rawTitle);

    // 处理重复
    let finalName = `${baseName}.xmind`;
    let i = 2;
    while (existingInDir.has(finalName)) {
      finalName = `${baseName}-${i}.xmind`;
      i++;
    }
    existingInDir.add(finalName);

    const outputPath = join(outputDir, finalName);
    log(`    → ${finalName}`);

    if (!DRY_RUN) {
      await writeSingleL1Xmind(zip, sheet, l1, outputPath);
      xmindSplitCount++;
    } else {
      xmindSplitCount++;
    }
  }

  // 原始聚合文件移到 trash
  trashFile(xmindPath, "xmind");
}

/**
 * 处理 xmind 模块目录
 */
async function processXmindModule(moduleKey, moduleDir, dataAssetsVersionMap) {
  const xmindModDir = join(BASE, `cases/xmind/${moduleDir}`);
  if (!existsSync(xmindModDir)) {
    log(`  SKIP: cases/xmind/${moduleDir}/ not found`);
    return;
  }

  const files = readdirSync(xmindModDir, { withFileTypes: true });
  const xmindFiles = files.filter(
    (f) => f.isFile() && f.name.endsWith(".xmind"),
  );

  for (const f of xmindFiles) {
    const fileName = f.name;
    const filePath = join(xmindModDir, fileName);

    // 检查是否是特殊文件（不拆分，只移动）
    if (SPECIAL_XMIND_DIRS[fileName]) {
      const specialDir = join(xmindModDir, SPECIAL_XMIND_DIRS[fileName]);
      const dest = join(specialDir, fileName);
      log(`\n  Special file: ${fileName} → ${relative(BASE, dest)}`);
      moveFile(filePath, dest, "special dir");
      continue;
    }

    // 提取版本
    const version = extractVersionFromXmindName(fileName, dataAssetsVersionMap);
    if (!version) {
      log(`\n  SKIP (no version): ${fileName}`);
      continue;
    }

    await splitXmindFile(filePath, moduleDir, version);
  }
}

/**
 * 迁移所有 xmind 模块
 */
async function migrateXmind() {
  const config = loadConfig();
  const { dataAssetsVersionMap } = config;

  log("\n── xmind splitting ──");

  for (const [moduleKey, mod] of Object.entries(config.modules)) {
    // 跳过 custom 类型
    if (mod.type === "custom") continue;

    // 从 xmind 路径推导模块目录
    const xmindPath = mod.xmind || "";
    const modDirMatch = xmindPath.match(/cases\/xmind\/(.+?)\/?$/);
    if (!modDirMatch) continue;
    const moduleDir = modDirMatch[1];

    const versionMap = moduleKey === "data-assets" ? dataAssetsVersionMap : null;

    log(`\n  Module: ${moduleKey} (${moduleDir})`);
    await processXmindModule(moduleKey, moduleDir, versionMap);
  }
}

// ─── Symlink Updates ──────────────────────────────────────────────────────────

function updateSymlinks() {
  log("\n── symlink check ──");

  const latestPrd = join(BASE, "latest-prd-enhanced.md");
  const latestXmind = join(BASE, "latest-output.xmind");

  for (const linkPath of [latestPrd, latestXmind]) {
    try {
      const stat = lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        const target = readFileSync(linkPath, "utf8");
        log(`  SYMLINK: ${basename(linkPath)} → (check if target exists)`);
      }
    } catch {
      // symlink doesn't exist
    }
  }
  log("  NOTE: Symlinks not auto-updated. Run refresh-latest-link.mjs if needed.");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log(`unify-directory-structure.mjs  ${DRY_RUN ? "[DRY RUN]" : "[EXECUTE]"}`);
  console.log("=".repeat(60));

  if (!DRY_RUN) {
    ensureDir(TRASH_DIR);
  }

  if (!XMIND_ONLY) {
    await migrateDataAssets();
    await migrateXyzh();
  }

  if (!REQ_ONLY) {
    await migrateXmind();
  }

  updateSymlinks();

  console.log("\n" + "=".repeat(60));
  if (DRY_RUN) {
    console.log("DRY RUN complete. No files were changed.");
    console.log(`XMind nodes that would be split: ${xmindSplitCount}`);
  } else {
    console.log(`✅ Files moved:       ${movedCount}`);
    console.log(`✅ XMind nodes split: ${xmindSplitCount}`);
    console.log(`⟳  Skipped (exists): ${skippedCount}`);
    console.log(`📂 Trash dir:        .trash/${TRASH_TS}/`);
  }
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
