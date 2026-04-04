#!/usr/bin/env npx tsx
/**
 * xmind-gen.ts — Converts intermediate JSON test cases to .xmind files.
 *
 * Usage:
 *   npx tsx .claude/scripts/xmind-gen.ts --input <json> --output <xmind> [--mode create|append|replace]
 *   npx tsx .claude/scripts/xmind-gen.ts --help
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import JSZip from "jszip";
import type { MarkerId, TopicBuilder } from "xmind-generator";
import { Marker, RootTopic, Topic, Workbook, writeLocalFile } from "xmind-generator";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TestStep {
  step: string;
  expected: string;
}

interface TestCase {
  title: string;
  priority: string;
  preconditions?: string;
  steps: TestStep[];
}

interface SubGroup {
  name: string;
  test_cases: TestCase[];
}

interface Page {
  name: string;
  sub_groups?: SubGroup[];
  test_cases?: TestCase[];
}

interface Module {
  name: string;
  pages: Page[];
}

interface Meta {
  project_name: string;
  requirement_name: string;
  version?: string;
  module_key?: string;
  requirement_id?: number;
  requirement_ticket?: string;
  description?: string;
}

interface IntermediateJson {
  meta: Meta;
  modules: Module[];
}

type WriteMode = "create" | "append" | "replace";

interface OutputResult {
  output_path: string;
  mode: WriteMode;
  root_title: string;
  l1_title: string;
  case_count: number;
}

// ─── Priority map ─────────────────────────────────────────────────────────────

const PRIORITY_MAP: Record<string, MarkerId> = {
  P0: Marker.Priority.p1,
  P1: Marker.Priority.p2,
  P2: Marker.Priority.p3,
};

// ─── Validation ──────────────────────────────────────────────────────────────

function validateInput(data: unknown): asserts data is IntermediateJson {
  if (!data || typeof data !== "object") {
    throw new Error("Input must be a JSON object");
  }
  const obj = data as Record<string, unknown>;
  if (!obj.meta || typeof obj.meta !== "object") {
    throw new Error("Missing required field: meta");
  }
  const meta = obj.meta as Record<string, unknown>;
  if (!meta.project_name || typeof meta.project_name !== "string") {
    throw new Error("Missing required field: meta.project_name");
  }
  if (!meta.requirement_name || typeof meta.requirement_name !== "string") {
    throw new Error("Missing required field: meta.requirement_name");
  }
  if (!Array.isArray(obj.modules) || obj.modules.length === 0) {
    throw new Error("modules must be a non-empty array");
  }
}

// ─── Title builders ──────────────────────────────────────────────────────────

function buildRootTitle(meta: Meta): string {
  return meta.project_name;
}

function buildL1Title(meta: Meta): string {
  if (meta.version) {
    return `【${meta.version}】${meta.requirement_name}`;
  }
  return meta.requirement_name;
}

// ─── Case count ───────────────────────────────────────────────────────────────

function countCases(modules: Module[]): number {
  let count = 0;
  for (const mod of modules) {
    for (const page of mod.pages) {
      for (const sg of page.sub_groups ?? []) {
        count += sg.test_cases.length;
      }
      count += page.test_cases?.length ?? 0;
    }
  }
  return count;
}

// ─── Topic tree builder ──────────────────────────────────────────────────────

function buildCaseTopic(tc: TestCase): TopicBuilder {
  const caseChildren: TopicBuilder[] = tc.steps.map((s) =>
    Topic(s.step).children([Topic(s.expected)]),
  );

  let caseTopic = Topic(tc.title).children(caseChildren);

  const marker = PRIORITY_MAP[tc.priority];
  if (marker) {
    caseTopic = caseTopic.markers([marker]);
  }

  if (tc.preconditions) {
    caseTopic = caseTopic.note(tc.preconditions);
  }

  return caseTopic;
}

function buildTopicTree(modules: Module[]): TopicBuilder[] {
  return modules.map((mod) => {
    const pageTopics: TopicBuilder[] = mod.pages.map((page) => {
      const pageChildren: TopicBuilder[] = [];

      // Sub-groups become L4 topics
      for (const sg of page.sub_groups ?? []) {
        if (sg.test_cases.length > 0) {
          const sgCases = sg.test_cases.map(buildCaseTopic);
          pageChildren.push(Topic(sg.name).children(sgCases));
        }
      }

      // Direct page test_cases (no sub-group)
      for (const tc of page.test_cases ?? []) {
        pageChildren.push(buildCaseTopic(tc));
      }

      return Topic(page.name).children(pageChildren);
    });

    return Topic(mod.name).children(pageTopics);
  });
}

// ─── Mode: create ─────────────────────────────────────────────────────────────

async function createXmind(data: IntermediateJson, outputPath: string): Promise<void> {
  if (existsSync(outputPath)) {
    throw new Error(`Output file already exists (use --mode append or replace): ${outputPath}`);
  }

  const rootTitle = buildRootTitle(data.meta);
  const l1Title = buildL1Title(data.meta);
  const l2Topics = buildTopicTree(data.modules);

  const l1 = Topic(l1Title).children(l2Topics);
  const root = RootTopic(rootTitle).children([l1]);
  const wb = Workbook(root);
  await writeLocalFile(wb, outputPath);
}

// ─── Mode: append / replace ──────────────────────────────────────────────────

interface XMindTopicNode {
  title?: string;
  children?: { attached?: XMindTopicNode[] };
  [key: string]: unknown;
}

interface XMindSheet {
  rootTopic?: XMindTopicNode;
  [key: string]: unknown;
}

async function readXmindSheets(filePath: string): Promise<[XMindSheet[], JSZip]> {
  const buffer = readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  if (!contentFile) {
    throw new Error("Invalid .xmind file: missing content.json");
  }
  const contentStr = await contentFile.async("string");
  const sheets = JSON.parse(contentStr) as XMindSheet[];
  return [sheets, zip];
}

async function writeXmindSheets(zip: JSZip, outputPath: string): Promise<void> {
  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  writeFileSync(outputPath, out);
}

/**
 * Converts an IntermediateJson's L1/L2 structure into a raw topic node tree
 * that can be injected into an existing content.json.
 */
function buildRawL1Node(data: IntermediateJson): XMindTopicNode {
  const l1Title = buildL1Title(data.meta);

  const l2Nodes: XMindTopicNode[] = data.modules.map((mod) => {
    const pageNodes: XMindTopicNode[] = mod.pages.map((page) => {
      const pageChildren: XMindTopicNode[] = [];

      for (const sg of page.sub_groups ?? []) {
        if (sg.test_cases.length > 0) {
          const sgCases: XMindTopicNode[] = sg.test_cases.map((tc) => buildRawCaseNode(tc));
          pageChildren.push({
            title: sg.name,
            children: { attached: sgCases },
          });
        }
      }

      for (const tc of page.test_cases ?? []) {
        pageChildren.push(buildRawCaseNode(tc));
      }

      return {
        title: page.name,
        ...(pageChildren.length > 0 ? { children: { attached: pageChildren } } : {}),
      };
    });

    return {
      title: mod.name,
      ...(pageNodes.length > 0 ? { children: { attached: pageNodes } } : {}),
    };
  });

  return {
    title: l1Title,
    ...(l2Nodes.length > 0 ? { children: { attached: l2Nodes } } : {}),
  };
}

function buildRawCaseNode(tc: TestCase): XMindTopicNode {
  const stepNodes: XMindTopicNode[] = tc.steps.map((s) => ({
    title: s.step,
    children: { attached: [{ title: s.expected }] },
  }));

  const node: XMindTopicNode = {
    title: tc.title,
    ...(stepNodes.length > 0 ? { children: { attached: stepNodes } } : {}),
  };

  const markerKey = PRIORITY_MAP[tc.priority];
  if (markerKey) {
    node.markers = [{ markerId: markerKey.id }];
  }

  if (tc.preconditions) {
    node.notes = { plain: { content: tc.preconditions } };
  }

  return node;
}

async function appendXmind(data: IntermediateJson, outputPath: string): Promise<void> {
  if (!existsSync(outputPath)) {
    // Fall back to create
    await createXmind(data, outputPath);
    return;
  }

  const [sheets, zip] = await readXmindSheets(outputPath);
  const rootTitle = buildRootTitle(data.meta);

  // Find the sheet whose rootTopic title matches our project
  const sheet = sheets.find((s) => s.rootTopic?.title === rootTitle) ?? sheets[0];
  if (!sheet?.rootTopic) {
    throw new Error(`Cannot find sheet with root title "${rootTitle}" in ${outputPath}`);
  }

  if (!sheet.rootTopic.children) {
    sheet.rootTopic.children = { attached: [] };
  }
  if (!sheet.rootTopic.children.attached) {
    sheet.rootTopic.children.attached = [];
  }

  sheet.rootTopic.children.attached.push(buildRawL1Node(data));

  zip.file("content.json", JSON.stringify(sheets));
  await writeXmindSheets(zip, outputPath);
}

async function replaceXmind(data: IntermediateJson, outputPath: string): Promise<void> {
  if (!existsSync(outputPath)) {
    await createXmind(data, outputPath);
    return;
  }

  const [sheets, zip] = await readXmindSheets(outputPath);
  const rootTitle = buildRootTitle(data.meta);
  const l1Title = buildL1Title(data.meta);

  const sheet = sheets.find((s) => s.rootTopic?.title === rootTitle) ?? sheets[0];
  if (!sheet?.rootTopic) {
    throw new Error(`Cannot find sheet with root title "${rootTitle}" in ${outputPath}`);
  }

  if (!sheet.rootTopic.children?.attached) {
    // No existing L1 to replace — just append
    sheet.rootTopic.children = { attached: [buildRawL1Node(data)] };
  } else {
    const attached = sheet.rootTopic.children.attached;
    // Find existing L1 by requirement_name match (strip version prefix if present)
    const reqName = data.meta.requirement_name;
    const idx = attached.findIndex(
      (n) => n.title === l1Title || (typeof n.title === "string" && n.title.endsWith(reqName)),
    );
    if (idx >= 0) {
      attached[idx] = buildRawL1Node(data);
    } else {
      attached.push(buildRawL1Node(data));
    }
  }

  zip.file("content.json", JSON.stringify(sheets));
  await writeXmindSheets(zip, outputPath);
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("xmind-gen")
    .description("Convert intermediate JSON test cases to .xmind files")
    .requiredOption("--input <path>", "Path to input JSON file")
    .requiredOption("--output <path>", "Path to output .xmind file")
    .option("--mode <mode>", "Write mode: create | append | replace", "create")
    .parse(process.argv);

  const opts = program.opts<{ input: string; output: string; mode: string }>();

  const mode = opts.mode as WriteMode;
  if (!["create", "append", "replace"].includes(mode)) {
    process.stderr.write(
      `[xmind-gen] Invalid mode: ${mode}. Must be create, append, or replace.\n`,
    );
    process.exit(1);
  }

  const inputPath = resolve(opts.input);
  const outputPath = resolve(opts.output);

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(inputPath, "utf8"));
  } catch (err) {
    process.stderr.write(`[xmind-gen] Failed to read input file: ${err}\n`);
    process.exit(1);
  }

  try {
    validateInput(raw);
  } catch (err) {
    process.stderr.write(`[xmind-gen] Validation error: ${err}\n`);
    process.exit(1);
  }

  const data = raw as IntermediateJson;

  try {
    if (mode === "create") {
      await createXmind(data, outputPath);
    } else if (mode === "append") {
      await appendXmind(data, outputPath);
    } else {
      await replaceXmind(data, outputPath);
    }
  } catch (err) {
    process.stderr.write(`[xmind-gen] Error: ${err}\n`);
    process.exit(1);
  }

  const result: OutputResult = {
    output_path: outputPath,
    mode,
    root_title: buildRootTitle(data.meta),
    l1_title: buildL1Title(data.meta),
    case_count: countCases(data.modules),
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`[xmind-gen] Unexpected error: ${err}\n`);
  process.exit(1);
});
