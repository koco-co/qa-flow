#!/usr/bin/env bun
/**
 * xmind-patch.ts — Search, view, patch, add, and delete test cases in existing .xmind files.
 *
 * Usage:
 *   kata-cli xmind-patch search <query> [--project <name>] [--dir <dir>] [--limit 20]
 *   kata-cli xmind-patch show --file <xmind> --title <query>
 *   kata-cli xmind-patch patch --file <xmind> --title <query> --case-json '<json>' [--dry-run]
 *   kata-cli xmind-patch add --file <xmind> --parent <query> --case-json '<json>' [--dry-run]
 *   kata-cli xmind-patch delete --file <xmind> --title <query> [--dry-run]
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createCli } from "./lib/cli-runner.ts";
import JSZip from "jszip";
import { repoRoot, validateFilePath } from "./lib/paths.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface XMindTopicNode {
  title?: string;
  children?: { attached?: XMindTopicNode[] };
  markers?: { markerId: string }[];
  notes?: { plain: { content: string } };
  [key: string]: unknown;
}

interface XMindSheet {
  rootTopic?: XMindTopicNode;
  [key: string]: unknown;
}

interface TestStep {
  step: string;
  expected: string;
}

interface CaseData {
  title: string;
  priority?: string;
  preconditions?: string;
  steps?: TestStep[];
  tree_path?: string[];
}

interface SearchMatch {
  file: string;
  tree_path: string[];
  title: string;
  priority: string;
}

interface TopicMatch {
  topic: XMindTopicNode;
  path: string[];
  parent: XMindTopicNode | null;
  parentChildren: XMindTopicNode[];
  file: string;
}

// ─── Priority map ─────────────────────────────────────────────────────────────

const MARKER_TO_PRIORITY: Record<string, string> = {
  "priority-1": "P0",
  "priority-2": "P1",
  "priority-3": "P2",
};

const PRIORITY_TO_MARKER: Record<string, string> = {
  P0: "priority-1",
  P1: "priority-2",
  P2: "priority-3",
};

// ─── XMind I/O ────────────────────────────────────────────────────────────────

async function readXmind(
  filePath: string,
): Promise<{ zip: JSZip; sheets: XMindSheet[] }> {
  const buffer = readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  if (!contentFile) {
    throw new Error(`Invalid .xmind file: missing content.json in ${filePath}`);
  }
  const contentStr = await contentFile.async("string");
  const sheets = JSON.parse(contentStr) as XMindSheet[];
  return { zip, sheets };
}

async function writeXmind(
  filePath: string,
  zip: JSZip,
  sheets: XMindSheet[],
): Promise<void> {
  zip.file("content.json", JSON.stringify(sheets));
  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  writeFileSync(filePath, out);
}

// ─── Topic traversal ──────────────────────────────────────────────────────────

function findTopics(
  sheets: XMindSheet[],
  query: string,
  filePath: string,
  opts: { limit?: number } = {},
): TopicMatch[] {
  const results: TopicMatch[] = [];
  const lowerQuery = query.toLowerCase();

  function traverse(
    node: XMindTopicNode,
    path: string[],
    parent: XMindTopicNode | null,
    parentChildren: XMindTopicNode[],
  ): void {
    if (opts.limit && results.length >= opts.limit) return;

    const title = node.title ?? "";
    if (title.toLowerCase().includes(lowerQuery)) {
      results.push({
        topic: node,
        path: [...path, title],
        parent,
        parentChildren,
        file: filePath,
      });
    }

    const children = node.children?.attached ?? [];
    for (const child of children) {
      traverse(child, [...path, title], node, children);
    }
  }

  for (const sheet of sheets) {
    if (sheet.rootTopic) {
      traverse(sheet.rootTopic, [], null, []);
    }
  }

  return results;
}

function collectXmindFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(current: string): void {
    try {
      const entries = readdirSync(current);
      for (const entry of entries) {
        const fullPath = join(current, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (entry.endsWith(".xmind")) {
            files.push(fullPath);
          }
        } catch {
          // skip unreadable entries
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  walk(dir);
  return files;
}

// ─── Case data extraction ─────────────────────────────────────────────────────

function topicToCase(topic: XMindTopicNode, treePath: string[]): CaseData {
  const title = topic.title ?? "";

  // Extract priority from markers
  let priority = "";
  for (const marker of topic.markers ?? []) {
    const p = MARKER_TO_PRIORITY[marker.markerId];
    if (p) {
      priority = p;
      break;
    }
  }

  const preconditions = topic.notes?.plain?.content;

  // Steps: direct children are steps, each step's first child is expected result
  const stepNodes = topic.children?.attached ?? [];
  const steps: TestStep[] = stepNodes.map((stepNode) => {
    const expectedNodes = stepNode.children?.attached ?? [];
    return {
      step: stepNode.title ?? "",
      expected: expectedNodes[0]?.title ?? "",
    };
  });

  return {
    title,
    priority,
    ...(preconditions ? { preconditions } : {}),
    steps,
    tree_path: treePath,
  };
}

// ─── Case JSON to topic node ──────────────────────────────────────────────────

function caseToTopic(caseData: CaseData): XMindTopicNode {
  const stepNodes: XMindTopicNode[] = (caseData.steps ?? []).map((s) => ({
    title: s.step,
    children: { attached: [{ title: s.expected }] },
  }));

  const node: XMindTopicNode = {
    title: caseData.title ?? "",
    ...(stepNodes.length > 0 ? { children: { attached: stepNodes } } : {}),
  };

  if (caseData.priority && PRIORITY_TO_MARKER[caseData.priority]) {
    node.markers = [{ markerId: PRIORITY_TO_MARKER[caseData.priority] }];
  }

  if (caseData.preconditions) {
    node.notes = { plain: { content: caseData.preconditions } };
  }

  return node;
}

function mergeCaseIntoTopic(
  existing: XMindTopicNode,
  patch: CaseData,
): XMindTopicNode {
  const updated: XMindTopicNode = { ...existing };

  if (patch.title !== undefined) {
    updated.title = patch.title;
  }

  if (patch.priority !== undefined) {
    if (patch.priority === "") {
      delete updated.markers;
    } else if (PRIORITY_TO_MARKER[patch.priority]) {
      updated.markers = [{ markerId: PRIORITY_TO_MARKER[patch.priority] }];
    }
  }

  if (patch.preconditions !== undefined) {
    if (patch.preconditions === "") {
      delete updated.notes;
    } else {
      updated.notes = { plain: { content: patch.preconditions } };
    }
  }

  if (patch.steps !== undefined) {
    const stepNodes: XMindTopicNode[] = patch.steps.map((s) => ({
      title: s.step,
      children: { attached: [{ title: s.expected }] },
    }));
    updated.children = { attached: stepNodes };
  }

  return updated;
}

// ─── Subcommands ──────────────────────────────────────────────────────────────

async function cmdSearch(
  query: string,
  opts: { dir?: string; project?: string; limit?: number },
): Promise<void> {
  const dir = resolve(
    opts.dir ?? (opts.project ? `workspace/${opts.project}/xmind` : "workspace/xmind"),
  );
  const limit = opts.limit ?? 20;

  const xmindFiles = collectXmindFiles(dir);
  const results: SearchMatch[] = [];

  for (const filePath of xmindFiles) {
    if (results.length >= limit) break;
    try {
      const { sheets } = await readXmind(filePath);
      const matches = findTopics(sheets, query, filePath, {
        limit: limit - results.length,
      });
      for (const m of matches) {
        if (results.length >= limit) break;
        const caseData = topicToCase(m.topic, m.path);
        results.push({
          file: filePath,
          tree_path: m.path,
          title: caseData.title,
          priority: caseData.priority ?? "",
        });
      }
    } catch {
      // skip unreadable xmind files
    }
  }

  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

async function cmdShow(opts: { file: string; title: string }): Promise<void> {
  const filePath = validateFilePath(opts.file, [repoRoot()]);
  const { sheets } = await readXmind(filePath);
  const matches = findTopics(sheets, opts.title, filePath);

  if (matches.length === 0) {
    process.stderr.write(
      `[xmind-patch] No topic found matching: ${opts.title}\n`,
    );
    process.exit(1);
  }

  const match = matches[0];
  const caseData = topicToCase(match.topic, match.path);
  process.stdout.write(`${JSON.stringify(caseData, null, 2)}\n`);
}

async function cmdPatch(opts: {
  file: string;
  title: string;
  caseJson: string;
  dryRun?: boolean;
}): Promise<void> {
  const filePath = validateFilePath(opts.file, [repoRoot()]);
  const { zip, sheets } = await readXmind(filePath);

  let patch: CaseData;
  try {
    patch = JSON.parse(opts.caseJson) as CaseData;
  } catch {
    process.stderr.write(`[xmind-patch] Invalid --case-json: not valid JSON\n`);
    process.exit(1);
  }

  const matches = findTopics(sheets, opts.title, filePath);
  if (matches.length === 0) {
    process.stderr.write(
      `[xmind-patch] No topic found matching: ${opts.title}\n`,
    );
    process.exit(1);
  }

  const match = matches[0];
  const before = topicToCase(match.topic, match.path);
  const merged = mergeCaseIntoTopic(match.topic, patch);
  const after = topicToCase(merged, match.path);

  if (opts.dryRun) {
    process.stdout.write(
      `${JSON.stringify(
        { dry_run: true, before, after, file: filePath },
        null,
        2,
      )}\n`,
    );
    return;
  }

  // Find and replace topic in-place in sheets
  function replaceTopic(
    node: XMindTopicNode,
    target: XMindTopicNode,
    replacement: XMindTopicNode,
  ): boolean {
    const children = node.children?.attached ?? [];
    for (let i = 0; i < children.length; i++) {
      if (children[i] === target) {
        children[i] = replacement;
        return true;
      }
      if (replaceTopic(children[i], target, replacement)) return true;
    }
    return false;
  }

  for (const sheet of sheets) {
    if (sheet.rootTopic && replaceTopic(sheet.rootTopic, match.topic, merged))
      break;
  }

  await writeXmind(filePath, zip, sheets);

  process.stdout.write(
    `${JSON.stringify({ before, after, file: filePath }, null, 2)}\n`,
  );
}

async function cmdAdd(opts: {
  file: string;
  parent: string;
  caseJson: string;
  dryRun?: boolean;
}): Promise<void> {
  const filePath = validateFilePath(opts.file, [repoRoot()]);
  const { zip, sheets } = await readXmind(filePath);

  let caseData: CaseData;
  try {
    caseData = JSON.parse(opts.caseJson) as CaseData;
  } catch {
    process.stderr.write(`[xmind-patch] Invalid --case-json: not valid JSON\n`);
    process.exit(1);
  }

  const matches = findTopics(sheets, opts.parent, filePath);
  if (matches.length === 0) {
    process.stderr.write(
      `[xmind-patch] No parent topic found matching: ${opts.parent}\n`,
    );
    process.exit(1);
  }

  const parentMatch = matches[0];
  const parentNode = parentMatch.topic;
  const newTopic = caseToTopic(caseData);
  const added = topicToCase(newTopic, [...parentMatch.path, newTopic.title ?? ""]);

  if (opts.dryRun) {
    process.stdout.write(
      `${JSON.stringify(
        { dry_run: true, would_add: added, parent: parentMatch.path, file: filePath },
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (!parentNode.children) {
    parentNode.children = { attached: [] };
  }
  if (!parentNode.children.attached) {
    parentNode.children.attached = [];
  }

  parentNode.children.attached.push(newTopic);

  await writeXmind(filePath, zip, sheets);

  process.stdout.write(
    `${JSON.stringify(
      {
        added,
        parent: parentMatch.path,
        file: filePath,
      },
      null,
      2,
    )}\n`,
  );
}

async function cmdDelete(opts: {
  file: string;
  title: string;
  dryRun?: boolean;
}): Promise<void> {
  const filePath = validateFilePath(opts.file, [repoRoot()]);
  const { zip, sheets } = await readXmind(filePath);

  const matches = findTopics(sheets, opts.title, filePath);
  if (matches.length === 0) {
    process.stderr.write(
      `[xmind-patch] No topic found matching: ${opts.title}\n`,
    );
    process.exit(1);
  }

  const match = matches[0];
  const caseData = topicToCase(match.topic, match.path);

  if (opts.dryRun) {
    process.stdout.write(
      `${JSON.stringify({ dry_run: true, would_delete: caseData, file: filePath }, null, 2)}\n`,
    );
    return;
  }

  // Remove from parent's children
  const idx = match.parentChildren.indexOf(match.topic);
  if (idx >= 0) {
    match.parentChildren.splice(idx, 1);
  }

  await writeXmind(filePath, zip, sheets);

  process.stdout.write(
    `${JSON.stringify({ deleted: caseData, file: filePath }, null, 2)}\n`,
  );
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

export const program = createCli({
  name: "xmind-patch",
    description:
      "Search, view, patch, add, and delete test cases in .xmind files",
    commands: [
      {
        name: "search",
        description:
          "Search for test cases by keyword across all .xmind files in a directory",
        arguments: [
          { name: "query", description: "Keyword to search for", required: true },
        ],
        options: [
          { flag: "--project <name>", description: "Project name (e.g. dataAssets)" },
          { flag: "--dir <dir>", description: "Directory to search in (overrides project default)" },
          { flag: "--limit <n>", description: "Maximum number of results", defaultValue: "20" },
        ],
        action: async (opts: { query: string; project?: string; dir?: string; limit?: string }) => {
          await cmdSearch(opts.query, {
            dir: opts.dir,
            project: opts.project,
            limit: Number(opts.limit ?? 20),
          });
        },
      },
      {
        name: "show",
        description: "Show full details of a test case in a specific .xmind file",
        options: [
          { flag: "--project <name>", description: "Project name (unused, for consistency)" },
          { flag: "--file <path>", description: "Path to the .xmind file", required: true },
          { flag: "--title <query>", description: "Title query to find the test case", required: true },
        ],
        action: async (opts: { file: string; title: string }) => {
          await cmdShow(opts);
        },
      },
      {
        name: "patch",
        description: "Patch a test case (merge provided fields, keep others)",
        options: [
          { flag: "--project <name>", description: "Project name (unused, for consistency)" },
          { flag: "--file <path>", description: "Path to the .xmind file", required: true },
          { flag: "--title <query>", description: "Title query to find the test case", required: true },
          { flag: "--case-json <json>", description: "JSON with fields to update", required: true },
          { flag: "--dry-run", description: "Preview the patch without modifying the file" },
        ],
        action: async (opts: {
          file: string;
          title: string;
          caseJson: string;
          dryRun?: boolean;
        }) => {
          await cmdPatch(opts);
        },
      },
      {
        name: "add",
        description: "Add a new test case under a parent topic",
        options: [
          { flag: "--project <name>", description: "Project name (unused, for consistency)" },
          { flag: "--file <path>", description: "Path to the .xmind file", required: true },
          { flag: "--parent <query>", description: "Title query to find the parent topic", required: true },
          { flag: "--case-json <json>", description: "JSON of the new test case", required: true },
          { flag: "--dry-run", description: "Preview the new case without modifying the file" },
        ],
        action: async (opts: {
          file: string;
          parent: string;
          caseJson: string;
          dryRun?: boolean;
        }) => {
          await cmdAdd(opts);
        },
      },
      {
        name: "delete",
        description: "Delete a test case from a .xmind file",
        options: [
          { flag: "--project <name>", description: "Project name (unused, for consistency)" },
          { flag: "--file <path>", description: "Path to the .xmind file", required: true },
          { flag: "--title <query>", description: "Title query to find the test case", required: true },
          { flag: "--dry-run", description: "Show what would be deleted without modifying the file" },
        ],
        action: async (opts: { file: string; title: string; dryRun?: boolean }) => {
          await cmdDelete(opts);
        },
      },
    ],
});
