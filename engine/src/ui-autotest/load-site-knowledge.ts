#!/usr/bin/env bun
/**
 * load-site-knowledge.ts — 读取站点操作知识
 *
 * 从 knowledge/sites/{domain}/ 读取并汇总为知识摘要，
 * 供 script-case-agent 生成脚本时参考。
 *
 * 用法：
 *   bun run engine/src/ui-autotest/load-site-knowledge.ts \
 *     --domain github.com \
 *     --project my-project
 *
 * 输出到 stdout 的知识摘要，无知识时输出空字符串。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";

const KB_DIR = "knowledge";

const SITE_TYPES = ["selectors", "traps", "overview", "api"] as const;

/**
 * 读取指定站点的所有知识文件，汇总为 markdown 摘要。
 *
 * @param domain  站点 hostname（如 github.com）
 * @param rootDir 项目根目录（默认为 process.cwd()）
 * @returns       知识摘要 markdown 字符串，无知识时返回 null
 */
export function loadSiteKnowledge(
  domain: string,
  rootDir: string = process.cwd(),
): string | null {
  const siteDir = join(rootDir, KB_DIR, "sites", domain);
  if (!existsSync(siteDir)) return null;

  let found = false;
  const parts: string[] = [];

  for (const type of SITE_TYPES) {
    const filePath = join(siteDir, `${type}.md`);
    if (!existsSync(filePath)) continue;
    found = true;
    const content = readFileSync(filePath, "utf-8");
    // 跳过 frontmatter（---...---）
    const body = content.replace(/^---[\s\S]*?---\n?/, "").trim();
    if (body) {
      parts.push(`## ${type}\n\n${body}`);
    }
  }

  if (!found) return null;
  if (parts.length === 0) return null;

  parts.unshift(`# ${domain} 站点知识\n`);
  return parts.join("\n\n");
}

// ── CLI ──────────────────────────────────────────────────────

function runCli(): void {
  const program = new Command();
  program
    .name("load-site-knowledge")
    .description("读取站点操作知识")
    .requiredOption("--domain <domain>", "站点域名")
    .option("--project <name>", "项目名")
    .option("--workspace <path>", "workspace 根路径（默认 auto）")
    .parse(process.argv);

  const opts = program.opts<{
    domain: string;
    project?: string;
    workspace?: string;
  }>();

  const rootDir = opts.workspace
    ? join(opts.workspace, opts.project ?? "")
    : process.cwd();

  const result = loadSiteKnowledge(opts.domain, rootDir);
  if (result) {
    process.stdout.write(result + "\n");
  }
}

const argv1 = process.argv[1] ?? "";
if (
  argv1.endsWith("load-site-knowledge") ||
  argv1.endsWith("load-site-knowledge.ts") ||
  argv1.endsWith("load-site-knowledge.js")
) {
  try {
    runCli();
  } catch (err) {
    process.stderr.write(
      `[load-site-knowledge] 错误：${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
}
