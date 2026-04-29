#!/usr/bin/env bun
/**
 * merge-site-knowledge.ts — 合并站点知识建议到 knowledge/sites/
 *
 * 接收 SuggestedSiteKnowledge 列表，按置信度策略写入：
 * - high: 自动写入
 * - medium/low: 仅当 --confirm 参数传入时写入
 *
 * 用法：
 *   bun run engine/src/ui-autotest/merge-site-knowledge.ts \
 *     --input suggestions.json \
 *     --project my-project
 *
 * 也提供库函数供主 agent 直接调用。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";

const KB_DIR = "knowledge";

export interface SiteKnowledgeSuggestion {
  type: "site-selectors" | "site-traps" | "site-api" | "site-overview";
  domain: string;
  content: string;
  confidence: "high" | "medium" | "low";
}

const TYPE_FILE_MAP: Record<SiteKnowledgeSuggestion["type"], string> = {
  "site-selectors": "selectors.md",
  "site-traps": "traps.md",
  "site-api": "api.md",
  "site-overview": "overview.md",
};

/**
 * 合并单条站点知识建议到 knowledge/sites/{domain}/{type}.md。
 *
 * @returns true 表示已写入，false 表示跳过（置信度低且无确认或内容已存在）
 */
export function mergeSiteKnowledge(
  suggestion: SiteKnowledgeSuggestion,
  rootDir: string = process.cwd(),
  confirmed: boolean = false,
): boolean {
  // 低置信度需要确认
  if (suggestion.confidence !== "high" && !confirmed) return false;

  const siteDir = join(rootDir, KB_DIR, "sites", suggestion.domain);
  mkdirSync(siteDir, { recursive: true });

  const filename = TYPE_FILE_MAP[suggestion.type];
  const filePath = join(siteDir, filename);

  // 构建 frontmatter + body
  const frontmatter = {
    type: suggestion.type,
    domain: suggestion.domain,
    confidence: suggestion.confidence,
    updated_at: new Date().toISOString().slice(0, 10),
  };

  let existingBody = "";
  if (existsSync(filePath)) {
    const raw = readFileSync(filePath, "utf-8");
    // Remove frontmatter if exists
    existingBody = raw.replace(/^---[\s\S]*?---\n?/, "").trim();
  }

  // Dedup: skip if content already exists in file
  const trimmedNew = suggestion.content.trim();
  if (existingBody.includes(trimmedNew)) return false;

  const newBody = existingBody
    ? `${existingBody}\n\n${trimmedNew}`
    : trimmedNew;

  const yaml = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  writeFileSync(filePath, `---\n${yaml}\n---\n\n${newBody}\n`, "utf-8");
  return true;
}

/**
 * 批量合并站点知识建议。
 */
export function mergeKnowledgeBatch(
  suggestions: SiteKnowledgeSuggestion[],
  rootDir: string = process.cwd(),
  confirmed: boolean = false,
): { written: number; skipped: number } {
  let written = 0;
  let skipped = 0;
  for (const s of suggestions) {
    if (mergeSiteKnowledge(s, rootDir, confirmed)) {
      written++;
    } else {
      skipped++;
    }
  }
  return { written, skipped };
}

// ── CLI ──────────────────────────────────────────────────────

function runCli(): void {
  const program = new Command();
  program
    .name("merge-site-knowledge")
    .description("合并站点知识建议")
    .requiredOption("--input <path>", "suggestions JSON 文件路径")
    .option("--project <name>", "项目名")
    .option("--confirm", "允许写入 medium/low 置信度的建议")
    .option("--workspace <path>", "workspace 根路径")
    .parse(process.argv);

  const opts = program.opts<{
    input: string;
    project?: string;
    confirm?: boolean;
    workspace?: string;
  }>();

  let inputContent: string;
  if (opts.input === "-") {
    inputContent = readFileSync("/dev/stdin", "utf-8");
  } else {
    inputContent = readFileSync(opts.input, "utf-8");
  }
  const suggestions: SiteKnowledgeSuggestion[] = JSON.parse(inputContent);
  const rootDir = opts.workspace
    ? join(opts.workspace, opts.project ?? "")
    : process.cwd();

  const { written, skipped } = mergeKnowledgeBatch(suggestions, rootDir, !!opts.confirm);
  process.stderr.write(`[merge-site-knowledge] 写入 ${written} 条，跳过 ${skipped} 条\n`);
}

const argv1 = process.argv[1] ?? "";
if (
  argv1.endsWith("merge-site-knowledge.ts") ||
  argv1.endsWith("merge-site-knowledge.js") ||
  argv1.endsWith("merge-site-knowledge")
) {
  try {
    runCli();
  } catch (err) {
    process.stderr.write(
      `[merge-site-knowledge] 错误：${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
}
