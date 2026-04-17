#!/usr/bin/env bun
/**
 * merge-specs.ts — 合并 Playwright 代码块为 spec 文件
 *
 * 用法：
 *   bun run .claude/skills/ui-autotest/scripts/merge-specs.ts \
 *     --input workspace/.temp/ui-blocks/ \
 *     --output tests/e2e/202604/xxx/
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
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

export interface MergeOptions {
  readonly compileCheck?: boolean;
}

// ────────────────────────────────────────────────────────────
// 工具函数
// ────────────────────────────────────────────────────────────

/**
 * 从给定目录向上查找 node_modules 目录。
 * 在 git worktree 场景下，node_modules 可能在主仓库根目录，而非 worktree 目录。
 */
function findNodeModules(startDir: string): string | null {
  let current = startDir;
  while (true) {
    const candidate = join(current, "node_modules");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return null; // 到达文件系统根目录
    current = parent;
  }
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
 * opts.compileCheck — 若为 true，在生成前对代码块文件运行 tsc --noEmit 类型检查。
 */
export function mergeSpecs(inputDir: string, outputDir: string, opts: MergeOptions = {}): MergeResult {
  const blocks = readCodeBlocks(inputDir);

  if (opts.compileCheck && blocks.length > 0) {
    const blockFiles = blocks.map((b) => join(inputDir, `${b.fileName}.ts`));

    // 使用临时 tsconfig 以便 tsc 能解析 @playwright/test 等外部模块。
    // git worktree 下 node_modules 可能在主仓库目录，通过向上查找定位。
    const nodeModulesDir = findNodeModules(process.cwd());
    const baseUrl = nodeModulesDir ?? process.cwd();

    const tmpTsconfig = join(tmpdir(), `merge-specs-tsc-${Date.now()}.json`);
    const tsconfigContent = JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        lib: ["ES2022"],
        strict: true,
        skipLibCheck: true,
        allowImportingTsExtensions: true,
        noImplicitAny: true,
        noEmit: true,
        baseUrl,
      },
      files: blockFiles,
    });
    writeFileSync(tmpTsconfig, tsconfigContent, "utf-8");

    try {
      const result = spawnSync("bunx", ["tsc", "--project", tmpTsconfig], { encoding: "utf8" });
      if (result.status !== 0) {
        throw new Error(
          `[merge-specs] tsc gate failed:\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
        );
      }
    } finally {
      rmSync(tmpTsconfig, { force: true });
    }
  }

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
    .option("--no-compile-check", "跳过 tsc 类型检查门控（默认开启）")
    .parse(process.argv);

  const opts = program.opts<{ input: string; output: string; compileCheck: boolean }>();

  try {
    const result = mergeSpecs(opts.input, opts.output, { compileCheck: opts.compileCheck });
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
