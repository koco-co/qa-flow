#!/usr/bin/env npx tsx
/**
 * prd-frontmatter.ts — Normalize PRD front-matter fields.
 *
 * Usage:
 *   npx tsx .claude/scripts/prd-frontmatter.ts normalize --file <md-path> [--dry-run]
 *   npx tsx .claude/scripts/prd-frontmatter.ts --help
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { Command } from "commander";
import { buildMarkdown, parseFrontMatter, todayString } from "./lib/frontmatter.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NormalizeOutput {
  path: string;
  changes: string[];
  dry_run: boolean;
}

// ─── Status normalization ─────────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  enhanced: "已增强",
  draft: "草稿",
  reviewed: "已评审",
  archived: "已归档",
};

function normalizeStatus(status: string): string {
  return STATUS_MAP[status.toLowerCase()] ?? status;
}

function deriveNameFromFilename(filePath: string): string {
  const base = basename(filePath, extname(filePath));
  // Strip leading PRD-XX- prefix if present
  return base.replace(/^PRD-\d+-/, "").replace(/^Story-\d+-/, "");
}

// ─── Command ──────────────────────────────────────────────────────────────────

const program = new Command("prd-frontmatter");
program.description("Normalize PRD front-matter fields");

const normalizeCmd = program
  .command("normalize")
  .description("Ensure required front-matter fields are present and normalized")
  .requiredOption("--file <md-path>", "Path to the Markdown file")
  .option("--dry-run", "Output changes without writing")
  .action((opts: { file: string; dryRun?: boolean }) => {
    const filePath = opts.file;
    const dryRun = opts.dryRun === true;

    let content: string;
    try {
      content = readFileSync(filePath, "utf8");
    } catch {
      process.stderr.write(`Error: cannot read file "${filePath}"\n`);
      process.exit(1);
    }

    const { frontMatter, body } = parseFrontMatter(content);
    const changes: string[] = [];
    const fm = { ...frontMatter };

    // Ensure suite_name
    if (!fm.suite_name || fm.suite_name === "") {
      const derived = deriveNameFromFilename(filePath);
      fm.suite_name = derived;
      changes.push(`added suite_name: "${derived}"`);
    }

    // Ensure create_at
    if (!fm.create_at || fm.create_at === "") {
      const today = todayString();
      fm.create_at = today;
      changes.push(`added create_at: "${today}"`);
    }

    // Ensure status with default "草稿"
    if (!fm.status || fm.status === "") {
      fm.status = "草稿";
      changes.push('added status: "草稿"');
    } else {
      const normalized = normalizeStatus(String(fm.status));
      if (normalized !== fm.status) {
        changes.push(`normalized status: "${fm.status}" → "${normalized}"`);
        fm.status = normalized;
      }
    }

    const out: NormalizeOutput = {
      path: filePath,
      changes,
      dry_run: dryRun,
    };

    if (!dryRun && changes.length > 0) {
      const newContent = buildMarkdown(fm, body);
      writeFileSync(filePath, newContent, "utf8");
    }

    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  });

// Silence unused variable warning
void normalizeCmd;

program.parse(process.argv);
