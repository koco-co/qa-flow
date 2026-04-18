#!/usr/bin/env bun
/**
 * state.ts — Breakpoint resume state management CLI.
 *
 * Node lifecycle: init → transform → enhance → analyze → write → review → output
 *
 * Usage:
 *   bun run .claude/scripts/state.ts init --project dataAssets --prd workspace/dataAssets/prds/202604/xxx.md --mode normal
 *   bun run .claude/scripts/state.ts update --project dataAssets --prd-slug xxx --node transform --data '{"confidence":0.85}'
 *   bun run .claude/scripts/state.ts resume --project dataAssets --prd-slug xxx
 *   bun run .claude/scripts/state.ts clean --project dataAssets --prd-slug xxx
 *   bun run .claude/scripts/state.ts --help
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname } from "node:path";
import { createCli } from "./lib/cli-runner.ts";
import { projectPath } from "./lib/paths.ts";

type RunMode = "normal" | "quick";

interface QaState {
  project: string;
  prd: string;
  mode: RunMode;
  current_node: string;
  completed_nodes: string[];
  node_outputs: Record<string, unknown>;
  writers: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  cached_parse_result?: unknown;
  source_mtime?: string;
  strategy_resolution?: unknown;
}

function stateFilePath(project: string, prdSlug: string): string {
  return projectPath(project, ".temp", `.qa-state-${prdSlug}.json`);
}

function slugFromPrd(prdPath: string): string {
  return basename(prdPath, ".md");
}

function readState(project: string, prdSlug: string): QaState | null {
  const filePath = stateFilePath(project, prdSlug);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as QaState;
  } catch (err) {
    throw new Error(`Failed to parse state file: ${err}`);
  }
}

function writeState(project: string, prdSlug: string, state: QaState): void {
  const filePath = stateFilePath(project, prdSlug);
  const lockPath = `${filePath}.lock`;

  if (!acquireLock(lockPath)) {
    throw new Error(`Failed to acquire lock for ${filePath}`);
  }

  try {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  } finally {
    releaseLock(lockPath);
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function acquireLock(lockPath: string, timeoutMs = 5000): boolean {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      writeFileSync(lockPath, `${process.pid}`, { flag: "wx" });
      return true;
    } catch {
      const waitMs = 50 + Math.random() * 50;
      Bun.sleepSync(waitMs);
    }
  }
  return false;
}

function releaseLock(lockPath: string): void {
  try {
    if (existsSync(lockPath)) rmSync(lockPath);
  } catch {
    // ignore
  }
}

function runInit(opts: { prd: string; project: string; mode: string }): void {
  const prdSlug = slugFromPrd(opts.prd);
  const mode = (opts.mode === "quick" ? "quick" : "normal") satisfies RunMode;
  const now = nowIso();

  const state: QaState = {
    project: opts.project,
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
    writeState(opts.project, prdSlug, state);
    process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
  } catch (err) {
    process.stderr.write(`[state:init] error: ${err}\n`);
    process.exit(1);
  }
}

function runUpdate(opts: {
  project: string;
  prdSlug: string;
  node: string;
  data: string;
}): void {
  const state = readState(opts.project, opts.prdSlug);
  if (!state) {
    process.stderr.write(
      `[state:update] state file not found for slug "${opts.prdSlug}"\n`,
    );
    process.exit(1);
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(opts.data) as Record<string, unknown>;
  } catch {
    process.stderr.write(
      `[state:update] invalid --data JSON: ${opts.data}\n`,
    );
    process.exit(1);
  }

  const { strategy_resolution, ...nodeData } = data;

  const existingOutput = (state.node_outputs[opts.node] ?? {}) as Record<
    string,
    unknown
  >;
  const updated: QaState = {
    ...state,
    current_node: opts.node,
    completed_nodes: state.completed_nodes.includes(opts.node)
      ? state.completed_nodes
      : [...state.completed_nodes, opts.node],
    node_outputs: {
      ...state.node_outputs,
      [opts.node]: { ...existingOutput, ...nodeData },
    },
    updated_at: nowIso(),
    ...(strategy_resolution !== undefined ? { strategy_resolution } : {}),
  };

  try {
    writeState(opts.project, opts.prdSlug, updated);
    process.stdout.write(`${JSON.stringify(updated, null, 2)}\n`);
  } catch (err) {
    process.stderr.write(`[state:update] error: ${err}\n`);
    process.exit(1);
  }
}

function runResume(opts: { project: string; prdSlug: string }): void {
  const state = readState(opts.project, opts.prdSlug);
  if (!state) {
    process.stdout.write(
      `${JSON.stringify({ error: "State file not found" }, null, 2)}\n`,
    );
    process.exit(1);
  }

  let resolved: QaState = state;
  if (state.source_mtime && state.prd) {
    try {
      const actualMtime = statSync(state.prd).mtime.toISOString();
      if (actualMtime !== state.source_mtime) {
        resolved = { ...state, cached_parse_result: undefined };
        writeState(opts.project, opts.prdSlug, resolved);
      }
    } catch {
      // PRD file not accessible — leave cache as-is
    }
  }

  process.stdout.write(`${JSON.stringify(resolved, null, 2)}\n`);
}

function runClean(opts: { project: string; prdSlug: string }): void {
  const filePath = stateFilePath(opts.project, opts.prdSlug);

  try {
    if (existsSync(filePath)) {
      rmSync(filePath);
    }
    process.stdout.write(
      `${JSON.stringify({ cleaned: true, path: filePath }, null, 2)}\n`,
    );
  } catch (err) {
    process.stderr.write(`[state:clean] error: ${err}\n`);
    process.exit(1);
  }
}

createCli({
  name: "state",
  description:
    "Breakpoint resume state management for qa-flow test case generation",
  commands: [
    {
      name: "init",
      description: "Create a new state file for a PRD",
      options: [
        {
          flag: "--prd <path>",
          description:
            "PRD file path (e.g. workspace/dataAssets/prds/202604/xxx.md)",
          required: true,
        },
        {
          flag: "--project <name>",
          description: "Project name (e.g. dataAssets)",
          required: true,
        },
        {
          flag: "--mode <mode>",
          description: "Run mode: normal | quick",
          defaultValue: "normal",
        },
      ],
      action: runInit,
    },
    {
      name: "update",
      description: "Advance state to a new node and optionally merge output data",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        {
          flag: "--prd-slug <slug>",
          description: "PRD slug (filename without .md)",
          required: true,
        },
        {
          flag: "--node <node>",
          description: "Node name to set as current_node",
          required: true,
        },
        {
          flag: "--data <json>",
          description: "JSON object to merge into node_outputs[node]",
          defaultValue: "{}",
        },
      ],
      action: runUpdate,
    },
    {
      name: "resume",
      description: "Read and output current state for a PRD slug",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        {
          flag: "--prd-slug <slug>",
          description: "PRD slug (filename without .md)",
          required: true,
        },
      ],
      action: runResume,
    },
    {
      name: "clean",
      description: "Delete state file for a PRD slug",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        {
          flag: "--prd-slug <slug>",
          description: "PRD slug (filename without .md)",
          required: true,
        },
      ],
      action: runClean,
    },
  ],
}).parse(process.argv);
