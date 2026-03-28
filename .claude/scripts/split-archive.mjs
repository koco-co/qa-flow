/**
 * split-archive.mjs
 * 将大型 Archive MD 文件按 ## heading 拆分为多个独立文件
 *
 * 用法:
 *   node split-archive.mjs <monolithic-md-path> [--output-dir <dir>] [--dry-run]
 *
 * 目录命名规则:
 *   - 从原文件名提取语义版本（如 v6.4.8）→ <原目录>/v6.4.8/
 *   - 无版本号时 → <原目录>/split/
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

const HELP_TEXT = `
split-archive.mjs - 将大型 Archive MD 文件按 ## heading 拆分为多个独立文件

用法:
  node split-archive.mjs <monolithic-md-path> [--output-dir <dir>] [--dry-run]

参数:
  <monolithic-md-path>   输入的 Archive MD 文件路径（必填）
  --output-dir <dir>     指定输出目录（可选，默认从原文件名推导版本目录）
  --dry-run              只输出会生成的文件列表，不实际写入

说明:
  - 读取大型 Archive MD 文件，按 ## heading 拆分为多个独立文件
  - 每个输出文件首行添加元数据注释
  - 原文件保留不删除
  - 版本推导规则：从文件名提取 vX.Y.Z → <原目录>/vX.Y.Z/；无版本号 → <原目录>/split/

示例:
  node split-archive.mjs cases/archive/data-assets/202602-数据资产v6.4.8.md
  node split-archive.mjs cases/archive/data-assets/202602-数据资产v6.4.8.md --output-dir cases/archive/data-assets/v6.4.8
  node split-archive.mjs cases/archive/data-assets/202602-数据资产v6.4.8.md --dry-run
`.trim();

function parseArgs(argv) {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const dryRun = args.includes("--dry-run");
  const outputDirIndex = args.indexOf("--output-dir");
  const outputDir = outputDirIndex !== -1 ? args[outputDirIndex + 1] : null;

  const positional = args.filter((a, i) => {
    if (a.startsWith("--")) return false;
    if (i > 0 && args[i - 1] === "--output-dir") return false;
    return true;
  });

  if (positional.length < 1) {
    console.error("错误：缺少输入文件路径");
    console.error("用法: node split-archive.mjs <monolithic-md-path> [--output-dir <dir>] [--dry-run]");
    process.exit(1);
  }

  return { inputPath: positional[0], outputDir, dryRun };
}

function extractVersionFromFileName(fileName) {
  const match = fileName.match(/v(\d+\.\d+\.\d+)/i);
  return match ? `v${match[1]}` : null;
}

function deriveOutputDir(inputPath, overrideOutputDir) {
  if (overrideOutputDir) {
    return resolve(overrideOutputDir);
  }
  const dir = dirname(resolve(inputPath));
  const fileName = basename(inputPath, extname(inputPath));
  const version = extractVersionFromFileName(fileName);
  return version ? resolve(dir, version) : resolve(dir, "split");
}

function headingToFileName(heading) {
  return heading
    .replace(/^##\s*/, "")
    .replace(/[\/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "")
    .trim();
}

function splitByH2(content) {
  const lines = content.split("\n");
  const sections = [];
  let currentHeading = null;
  let currentLines = [];

  for (const line of lines) {
    if (/^## /.test(line)) {
      if (currentHeading !== null) {
        sections.push({ heading: currentHeading, lines: currentLines });
      }
      currentHeading = line;
      currentLines = [];
    } else {
      if (currentHeading !== null) {
        currentLines.push(line);
      }
    }
  }

  if (currentHeading !== null) {
    sections.push({ heading: currentHeading, lines: currentLines });
  }

  return sections;
}

function buildOutputContent(section, sourceFileName, splitDate) {
  const metaComment = `<!-- split-from: ${sourceFileName} | split-at: ${splitDate} -->`;
  const body = [section.heading, ...section.lines].join("\n").trimEnd();
  return `${metaComment}\n${body}\n`;
}

function run() {
  const { inputPath, outputDir: outputDirOverride, dryRun } = parseArgs(process.argv);

  const resolvedInput = resolve(inputPath);
  let content;
  try {
    content = readFileSync(resolvedInput, "utf-8");
  } catch (err) {
    console.error(`错误：无法读取文件 ${resolvedInput}`);
    console.error(err.message);
    process.exit(1);
  }

  const sections = splitByH2(content);
  if (sections.length === 0) {
    console.error("错误：文件中未找到任何 ## heading，无法拆分");
    process.exit(1);
  }

  const outputDir = deriveOutputDir(resolvedInput, outputDirOverride);
  const sourceFileName = basename(resolvedInput);
  const splitDate = new Date().toISOString().slice(0, 10);

  const outputs = sections.map((section) => {
    const fileName = headingToFileName(section.heading) + ".md";
    const outputPath = resolve(outputDir, fileName);
    const fileContent = buildOutputContent(section, sourceFileName, splitDate);
    return { outputPath, fileContent };
  });

  if (dryRun) {
    console.log(`[dry-run] 输入文件：${resolvedInput}`);
    console.log(`[dry-run] 输出目录：${outputDir}`);
    console.log(`[dry-run] 将生成 ${outputs.length} 个文件：`);
    for (const { outputPath } of outputs) {
      console.log(`  ${outputPath}`);
    }
    return;
  }

  mkdirSync(outputDir, { recursive: true });
  for (const { outputPath, fileContent } of outputs) {
    writeFileSync(outputPath, fileContent, "utf-8");
    console.log(`已生成：${outputPath}`);
  }
  console.log(`\n共拆分 ${outputs.length} 个文件 → ${outputDir}`);
  console.log(`原文件保留：${resolvedInput}`);
}

run();
