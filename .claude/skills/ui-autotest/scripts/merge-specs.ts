#!/usr/bin/env bun
/**
 * merge-specs.ts — 合并 Playwright 代码块为 spec 文件
 *
 * 用法：
 *   bun run .claude/skills/ui-autotest/scripts/merge-specs.ts \
 *     --input workspace/.temp/ui-blocks/ \
 *     --output tests/e2e/202604/xxx/
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { Command } from "commander";

// ────────────────────────────────────────────────────────────
// 类型定义
// ────────────────────────────────────────────────────────────

interface BlockMeta {
  id: string;
  priority: "P0" | "P1" | "P2" | "P3";
  title: string;
}

interface CodeBlock {
  meta: BlockMeta;
  code: string;
  fileName: string;
}

interface MergeResult {
  smoke_spec: string;
  full_spec: string;
  case_count: {
    smoke: number;
    full: number;
  };
}

// ────────────────────────────────────────────────────────────
// 核心函数
// ────────────────────────────────────────────────────────────

/**
 * 从代码块文件的首行 META 注释中解析元信息。
 * 格式：// META: {"id":"t1","priority":"P0","title":"验证xxx"}
 */
export function parseBlockMeta(content: string): BlockMeta | null {
  const metaLine = content.split("\n")[0];
  const match = metaLine.match(/^\/\/\s*META:\s*(\{.+\})/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]) as BlockMeta;
  } catch {
    return null;
  }
}

/**
 * 从输入目录读取所有 .ts 代码块文件。
 */
export function readCodeBlocks(inputDir: string): CodeBlock[] {
  if (!existsSync(inputDir)) {
    return [];
  }

  const files = readdirSync(inputDir)
    .filter((f) => f.endsWith(".ts"))
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));

  const blocks: CodeBlock[] = [];

  for (const file of files) {
    const filePath = join(inputDir, file);
    const content = readFileSync(filePath, "utf-8");
    const meta = parseBlockMeta(content);

    if (!meta) {
      process.stderr.write(`[merge-specs] 跳过无效代码块（缺少 META）：${file}\n`);
      continue;
    }

    blocks.push({ meta, code: content, fileName: basename(file, ".ts") });
  }

  return blocks;
}

/**
 * 生成合并后的 spec 文件内容。
 * 对于已成型的独立 spec，生成聚合入口文件并按顺序 side-effect import。
 * 这样可保留各文件自己的 helper import、顶层常量和 beforeAll，而不发生合并冲突。
 */
export function buildSpecContent(blocks: CodeBlock[], label: string): string {
  const header = [
    `// ${label}`,
    `// 生成时间：${new Date().toISOString()}`,
    `// 用例数量：${blocks.length}`,
    "",
  ].join("\n");

  if (blocks.length === 0) {
    return `${header}export {};\n`;
  }

  const importLines = blocks.map((block) => `import "./${block.fileName}";`);
  return `${header}${importLines.join("\n")}\n`;
}

/**
 * 主合并函数：从 inputDir 读取代码块，生成 smoke.spec.ts 和 full.spec.ts。
 */
export function mergeSpecs(inputDir: string, outputDir: string): MergeResult {
  const blocks = readCodeBlocks(inputDir);

  mkdirSync(outputDir, { recursive: true });

  // 冒烟测试：仅 P0
  const smokeBlocks = blocks.filter((b) => b.meta.priority === "P0");
  const smokeContent = buildSpecContent(smokeBlocks, "冒烟测试（P0）");
  const smokeSpec = join(outputDir, "smoke.spec.ts");
  writeFileSync(smokeSpec, smokeContent, "utf-8");

  // 全量测试：所有优先级
  const fullContent = buildSpecContent(blocks, "全量测试（P0+P1+P2）");
  const fullSpec = join(outputDir, "full.spec.ts");
  writeFileSync(fullSpec, fullContent, "utf-8");

  return {
    smoke_spec: smokeSpec,
    full_spec: fullSpec,
    case_count: {
      smoke: smokeBlocks.length,
      full: blocks.length,
    },
  };
}

// ────────────────────────────────────────────────────────────
// CLI 入口（仅在直接执行时运行，import 时跳过）
// ────────────────────────────────────────────────────────────

function runCli(): void {
  const program = new Command();

  program
    .name("merge-specs")
    .description("合并 Playwright 代码块为 smoke.spec.ts 和 full.spec.ts")
    .requiredOption("--input <dir>", "代码块输入目录（含 .ts 文件）")
    .requiredOption("--output <dir>", "spec 文件输出目录")
    .parse(process.argv);

  const opts = program.opts<{ input: string; output: string }>();

  try {
    const result = mergeSpecs(opts.input, opts.output);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (err) {
    process.stderr.write(
      `[merge-specs] 错误：${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
}

const argv1 = process.argv[1] ?? "";
if (argv1.endsWith("merge-specs.ts") || argv1.endsWith("merge-specs.js")) {
  runCli();
}
