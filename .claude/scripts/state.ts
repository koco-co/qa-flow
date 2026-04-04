#!/usr/bin/env npx tsx
/**
 * state.ts — Breakpoint resume state management CLI.
 *
 * Usage:
 *   npx tsx .claude/scripts/state.ts init --prd workspace/prds/202604/xxx.md --mode normal
 *   npx tsx .claude/scripts/state.ts update --prd-slug xxx --node enhance --data '{"health_score":85}'
 *   npx tsx .claude/scripts/state.ts resume --prd-slug xxx
 *   npx tsx .claude/scripts/state.ts clean --prd-slug xxx
 *   npx tsx .claude/scripts/state.ts --help
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { Command } from "commander";
import { initEnv } from "./lib/env.ts";
import { workspacePath } from "./lib/paths.ts";

type RunMode = "normal" | "quick";

interface QaState {
  prd: string;
  mode: RunMode;
  current_node: string;
  completed_nodes: string[];
  node_outputs: Record<string, unknown>;
  writers: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function stateFilePath(prdSlug: string): string {
  return workspacePath(".temp", `.qa-state-${prdSlug}.json`);
}

function slugFromPrd(prdPath: string): string {
  return basename(prdPath, ".md");
}

function readState(prdSlug: string): QaState | null {
  const filePath = stateFilePath(prdSlug);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as QaState;
  } catch (err) {
    throw new Error(`Failed to parse state file: ${err}`);
  }
}

function writeState(prdSlug: string, state: QaState): void {
  const filePath = stateFilePath(prdSlug);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function nowIso(): string {
  return new Date().toISOString();
}

const program = new Command();

program
  .name("state")
  .description("Breakpoint resume state management for qa-flow test case generation")
  .helpOption("-h, --help", "Display help information");

// ── init ──────────────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Create a new state file for a PRD")
  .requiredOption("--prd <path>", "PRD file path (e.g. workspace/prds/202604/xxx.md)")
  .option("--mode <mode>", "Run mode: normal | quick", "normal")
  .action((opts: { prd: string; mode: string }) => {
    initEnv();

    const prdSlug = slugFromPrd(opts.prd);
    const mode = (opts.mode === "quick" ? "quick" : "normal") satisfies RunMode;
    const now = nowIso();

    const state: QaState = {
      prd: opts.prd,
      mode,
      current_node: "init",
      completed_nodes: [],
      node_outputs: {},
      writers: {},
      created_at: now,
      updated_at: now,
    };

    try {
      writeState(prdSlug, state);
      process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
    } catch (err) {
      process.stderr.write(`[state:init] error: ${err}\n`);
      process.exit(1);
    }
  });

// ── update ────────────────────────────────────────────────────────────────────

program
  .command("update")
  .description("Advance state to a new node and optionally merge output data")
  .requiredOption("--prd-slug <slug>", "PRD slug (filename without .md)")
  .requiredOption("--node <node>", "Node name to set as current_node")
  .option("--data <json>", "JSON object to merge into node_outputs[node]", "{}")
  .action((opts: { prdSlug: string; node: string; data: string }) => {
    initEnv();

    const state = readState(opts.prdSlug);
    if (!state) {
      process.stderr.write(`[state:update] state file not found for slug "${opts.prdSlug}"\n`);
      process.exit(1);
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(opts.data) as Record<string, unknown>;
    } catch {
      process.stderr.write(`[state:update] invalid --data JSON: ${opts.data}\n`);
      process.exit(1);
    }

    const existingOutput = (state.node_outputs[opts.node] ?? {}) as Record<string, unknown>;
    const updated: QaState = {
      ...state,
      current_node: opts.node,
      completed_nodes: state.completed_nodes.includes(opts.node)
        ? state.completed_nodes
        : [...state.completed_nodes, opts.node],
      node_outputs: {
        ...state.node_outputs,
        [opts.node]: { ...existingOutput, ...data },
      },
      updated_at: nowIso(),
    };

    try {
      writeState(opts.prdSlug, updated);
      process.stdout.write(`${JSON.stringify(updated, null, 2)}\n`);
    } catch (err) {
      process.stderr.write(`[state:update] error: ${err}\n`);
      process.exit(1);
    }
  });

// ── resume ────────────────────────────────────────────────────────────────────

program
  .command("resume")
  .description("Read and output current state for a PRD slug")
  .requiredOption("--prd-slug <slug>", "PRD slug (filename without .md)")
  .action((opts: { prdSlug: string }) => {
    initEnv();

    const state = readState(opts.prdSlug);
    if (!state) {
      process.stdout.write(`${JSON.stringify({ error: "State file not found" }, null, 2)}\n`);
      process.exit(1);
    }

    process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
  });

// ── clean ─────────────────────────────────────────────────────────────────────

program
  .command("clean")
  .description("Delete state file for a PRD slug")
  .requiredOption("--prd-slug <slug>", "PRD slug (filename without .md)")
  .action((opts: { prdSlug: string }) => {
    initEnv();

    const filePath = stateFilePath(opts.prdSlug);

    try {
      if (existsSync(filePath)) {
        rmSync(filePath);
      }
      process.stdout.write(`${JSON.stringify({ cleaned: true, path: filePath }, null, 2)}\n`);
    } catch (err) {
      process.stderr.write(`[state:clean] error: ${err}\n`);
      process.exit(1);
    }
  });

program.parse(process.argv);
