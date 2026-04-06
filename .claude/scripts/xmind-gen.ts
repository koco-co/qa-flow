#!/usr/bin/env npx tsx
/**
 * xmind-gen.ts — Converts intermediate JSON or Archive Markdown to .xmind files.
 *
 * Usage:
 *   npx tsx .claude/scripts/xmind-gen.ts --input <json|md|dir> --output <xmind> [--mode create|append|replace]
 *   npx tsx .claude/scripts/xmind-gen.ts --input <dir>           (batch convert all .md in dir)
 *   npx tsx .claude/scripts/xmind-gen.ts --input <md> --json-only (output intermediate JSON only)
 *   npx tsx .claude/scripts/xmind-gen.ts --help
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { Command } from "commander";
import JSZip from "jszip";
import type { MarkerId, TopicBuilder } from "xmind-generator";
import {
  Marker,
  RootTopic,
  Topic,
  Workbook,
  writeLocalFile,
} from "xmind-generator";

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

// ─── Constants ───────────────────────────────────────────────────────────────

const UNCLASSIFIED = "未分类";

// ─── Priority map ─────────────────────────────────────────────────────────────

const PRIORITY_MAP: Record<string, MarkerId> = {
  P0: Marker.Priority.p1,
  P1: Marker.Priority.p2,
  P2: Marker.Priority.p3,
};

// ─── Preferences loader ──────────────────────────────────────────────────────

interface XmindPreferences {
  root_title_template: string;
  iteration_id: string;
}

function loadPreferences(): XmindPreferences {
  const defaults: XmindPreferences = {
    root_title_template: "数据资产v{{prd_version}}迭代用例(#{{iteration_id}})",
    iteration_id: "23",
  };

  try {
    const prefPath = resolve(
      dirname(new URL(import.meta.url).pathname),
      "../../preferences/xmind-structure.md",
    );
    if (!existsSync(prefPath)) return defaults;

    const content = readFileSync(prefPath, "utf-8");

    const tmplMatch = content.match(/root_title_template:\s*`([^`]+)`/);
    if (tmplMatch) defaults.root_title_template = tmplMatch[1];

    const idMatch = content.match(/iteration_id:\s*(\S+)/);
    if (idMatch) defaults.iteration_id = idMatch[1];
  } catch {
    // ignore
  }
  return defaults;
}

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

function normalizeVersion(version: string): string {
  return version.replace(/^v/i, "");
}

function buildRootTitle(meta: Meta): string {
  if (meta.version) {
    const prefs = loadPreferences();
    const ver = normalizeVersion(meta.version);
    return prefs.root_title_template
      .replace("{{prd_version}}", ver)
      .replace("{{iteration_id}}", prefs.iteration_id);
  }
  return meta.project_name;
}

function buildL1Title(meta: Meta): string {
  // Strip trailing (#xxxxx) from requirement_name if present (frontmatter suite_name may include it)
  return meta.requirement_name.replace(/\(#\d+\)\s*$/, "").trim();
}

function buildL1Labels(meta: Meta): string[] {
  if (meta.requirement_id) {
    return [`(#${meta.requirement_id})`];
  }
  return [];
}

// ─── Strip priority prefix from case title ──────────────────────────────────

function stripPriorityPrefix(title: string): string {
  return title.replace(/^【P\d】/, "");
}

// ─── Case count ──────────────────────────────────────────────────────────────

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

// ─── "未分类" flattening ─────────────────────────────────────────────────────

function isUnclassified(name: string): boolean {
  return name === UNCLASSIFIED;
}

/**
 * Collect all cases from a page (direct + sub_groups).
 */
function collectPageCases(page: Page): TestCase[] {
  const cases: TestCase[] = [];
  for (const sg of page.sub_groups ?? []) {
    cases.push(...sg.test_cases);
  }
  cases.push(...(page.test_cases ?? []));
  return cases;
}

// ─── Topic tree builder (with 未分类 flattening + P0 stripping) ─────────────

function buildCaseTopic(tc: TestCase): TopicBuilder {
  const caseChildren: TopicBuilder[] = tc.steps.map((s) =>
    Topic(s.step).children([Topic(s.expected)]),
  );

  const displayTitle = stripPriorityPrefix(tc.title);
  let caseTopic = Topic(displayTitle).children(caseChildren);

  const marker = PRIORITY_MAP[tc.priority];
  if (marker) {
    caseTopic = caseTopic.markers([marker]);
  }

  if (tc.preconditions) {
    caseTopic = caseTopic.note(tc.preconditions);
  }

  return caseTopic;
}

function buildPageChildren(page: Page): TopicBuilder[] {
  const children: TopicBuilder[] = [];

  for (const sg of page.sub_groups ?? []) {
    if (sg.test_cases.length > 0) {
      const sgCases = sg.test_cases.map(buildCaseTopic);
      children.push(Topic(sg.name).children(sgCases));
    }
  }

  for (const tc of page.test_cases ?? []) {
    children.push(buildCaseTopic(tc));
  }

  return children;
}

/**
 * Build topic tree with 未分类 flattening:
 * - L2=未分类 && L3=未分类 → cases promoted to parent (L1)
 * - L2=real && L3=未分类 → cases promoted to L2
 * - Otherwise → keep full hierarchy
 *
 * Returns [topics, promoted] where promoted = cases that should go directly under L1.
 */
function buildTopicTree(modules: Module[]): {
  topics: TopicBuilder[];
  promoted: TopicBuilder[];
} {
  const topics: TopicBuilder[] = [];
  const promoted: TopicBuilder[] = [];

  for (const mod of modules) {
    if (isUnclassified(mod.name)) {
      // L2 is 未分类 — check each page
      for (const page of mod.pages) {
        if (isUnclassified(page.name)) {
          // L2=未分类, L3=未分类 → promote all cases to L1
          for (const c of buildPageChildren(page)) {
            promoted.push(c);
          }
        } else {
          // L2=未分类, L3=real → promote page to L2 level
          const children = buildPageChildren(page);
          topics.push(Topic(page.name).children(children));
        }
      }
    } else {
      // L2 is real
      const pageTopics: TopicBuilder[] = [];

      for (const page of mod.pages) {
        if (isUnclassified(page.name)) {
          // L3=未分类 → promote cases to L2
          for (const c of buildPageChildren(page)) {
            pageTopics.push(c);
          }
        } else {
          // L3=real → keep hierarchy
          const children = buildPageChildren(page);
          pageTopics.push(Topic(page.name).children(children));
        }
      }

      topics.push(Topic(mod.name).children(pageTopics));
    }
  }

  return { topics, promoted };
}

// ─── Mode: create ─────────────────────────────────────────────────────────────

async function createXmind(
  data: IntermediateJson,
  outputPath: string,
): Promise<void> {
  if (existsSync(outputPath)) {
    throw new Error(
      `Output file already exists (use --mode append or replace): ${outputPath}`,
    );
  }

  const rootTitle = buildRootTitle(data.meta);
  const l1Title = buildL1Title(data.meta);
  const { topics: l2Topics, promoted } = buildTopicTree(data.modules);

  const l1Children = [...promoted, ...l2Topics];
  let l1 = Topic(l1Title).children(l1Children);
  const l1Labels = buildL1Labels(data.meta);
  if (l1Labels.length > 0) {
    l1 = l1.labels(l1Labels);
  }
  const root = RootTopic(rootTitle).children([l1]);
  const wb = Workbook(root);
  await writeLocalFile(wb, outputPath);
}

// ─── Mode: append / replace (raw nodes) ─────────────────────────────────────

interface XMindTopicNode {
  title?: string;
  children?: { attached?: XMindTopicNode[] };
  markers?: { markerId: string }[];
  notes?: { plain?: { content?: string } };
  [key: string]: unknown;
}

interface XMindSheet {
  rootTopic?: XMindTopicNode;
  [key: string]: unknown;
}

async function readXmindSheets(
  filePath: string,
): Promise<[XMindSheet[], JSZip]> {
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
  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  writeFileSync(outputPath, out);
}

function buildRawCaseNode(tc: TestCase): XMindTopicNode {
  const stepNodes: XMindTopicNode[] = tc.steps.map((s) => ({
    title: s.step,
    children: { attached: [{ title: s.expected }] },
  }));

  const displayTitle = stripPriorityPrefix(tc.title);
  const node: XMindTopicNode = {
    title: displayTitle,
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

function buildRawPageChildren(page: Page): XMindTopicNode[] {
  const children: XMindTopicNode[] = [];

  for (const sg of page.sub_groups ?? []) {
    if (sg.test_cases.length > 0) {
      const sgCases = sg.test_cases.map(buildRawCaseNode);
      children.push({
        title: sg.name,
        children: { attached: sgCases },
      });
    }
  }

  for (const tc of page.test_cases ?? []) {
    children.push(buildRawCaseNode(tc));
  }

  return children;
}

function buildRawL1Node(data: IntermediateJson): XMindTopicNode {
  const l1Title = buildL1Title(data.meta);
  const l1Labels = buildL1Labels(data.meta);
  const l1Children: XMindTopicNode[] = [];

  for (const mod of data.modules) {
    if (isUnclassified(mod.name)) {
      for (const page of mod.pages) {
        if (isUnclassified(page.name)) {
          l1Children.push(...buildRawPageChildren(page));
        } else {
          const children = buildRawPageChildren(page);
          l1Children.push({
            title: page.name,
            ...(children.length > 0
              ? { children: { attached: children } }
              : {}),
          });
        }
      }
    } else {
      const pageNodes: XMindTopicNode[] = [];

      for (const page of mod.pages) {
        if (isUnclassified(page.name)) {
          pageNodes.push(...buildRawPageChildren(page));
        } else {
          const children = buildRawPageChildren(page);
          pageNodes.push({
            title: page.name,
            ...(children.length > 0
              ? { children: { attached: children } }
              : {}),
          });
        }
      }

      l1Children.push({
        title: mod.name,
        ...(pageNodes.length > 0 ? { children: { attached: pageNodes } } : {}),
      });
    }
  }

  return {
    title: l1Title,
    ...(l1Labels.length > 0 ? { labels: l1Labels } : {}),
    ...(l1Children.length > 0 ? { children: { attached: l1Children } } : {}),
  };
}

async function appendXmind(
  data: IntermediateJson,
  outputPath: string,
): Promise<void> {
  if (!existsSync(outputPath)) {
    await createXmind(data, outputPath);
    return;
  }

  const [sheets, zip] = await readXmindSheets(outputPath);
  const rootTitle = buildRootTitle(data.meta);

  const sheet =
    sheets.find((s) => s.rootTopic?.title === rootTitle) ?? sheets[0];
  if (!sheet?.rootTopic) {
    throw new Error(
      `Cannot find sheet with root title "${rootTitle}" in ${outputPath}`,
    );
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

async function replaceXmind(
  data: IntermediateJson,
  outputPath: string,
): Promise<void> {
  if (!existsSync(outputPath)) {
    await createXmind(data, outputPath);
    return;
  }

  const [sheets, zip] = await readXmindSheets(outputPath);
  const rootTitle = buildRootTitle(data.meta);
  const l1Title = buildL1Title(data.meta);

  const sheet =
    sheets.find((s) => s.rootTopic?.title === rootTitle) ?? sheets[0];
  if (!sheet?.rootTopic) {
    throw new Error(
      `Cannot find sheet with root title "${rootTitle}" in ${outputPath}`,
    );
  }

  if (!sheet.rootTopic.children?.attached) {
    sheet.rootTopic.children = { attached: [buildRawL1Node(data)] };
  } else {
    const attached = sheet.rootTopic.children.attached;
    const reqName = data.meta.requirement_name;
    const idx = attached.findIndex(
      (n) =>
        n.title === l1Title ||
        (typeof n.title === "string" && n.title.endsWith(reqName)),
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

// ─── Archive Markdown parser ─────────────────────────────────────────────────

interface ArchiveFrontMatter {
  suite_name?: string;
  case_id?: number;
  [key: string]: unknown;
}

function parseFrontMatter(content: string): {
  fm: ArchiveFrontMatter;
  body: string;
} {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: content };

  const fm: ArchiveFrontMatter = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w[\w_]*)\s*:\s*(.+)$/);
    if (kv) {
      const key = kv[1];
      let val: string | number = kv[2].trim().replace(/^"(.*)"$/, "$1");
      if (/^\d+$/.test(val)) val = Number(val);
      fm[key] = val;
    }
  }
  return { fm, body: m[2] };
}

function parseArchiveBody(body: string): Module[] {
  const lines = body.split("\n");
  const modules: Module[] = [];

  let currentModule: Module | null = null;
  let currentPage: Page | null = null;
  let currentSubGroup: SubGroup | null = null;
  let currentCase: TestCase | null = null;
  let section: "none" | "precondition" | "steps" = "none";
  let preconditionLines: string[] = [];
  let inCodeBlock = false;
  let stepsRows: TestStep[] = [];
  let headerParsed = false;

  function flushCase() {
    if (!currentCase) return;
    currentCase.steps = stepsRows;
    if (preconditionLines.length > 0) {
      currentCase.preconditions =
        "前置条件\n" + preconditionLines.join("\n").trim();
    }

    if (currentSubGroup) {
      currentSubGroup.test_cases.push(currentCase);
    } else if (currentPage) {
      if (!currentPage.test_cases) currentPage.test_cases = [];
      currentPage.test_cases.push(currentCase);
    }
    currentCase = null;
    stepsRows = [];
    preconditionLines = [];
    section = "none";
    headerParsed = false;
  }

  for (const line of lines) {
    // H2 → Module (L2)
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      flushCase();
      currentSubGroup = null;
      currentPage = null;
      currentModule = { name: h2[1].trim(), pages: [] };
      modules.push(currentModule);
      continue;
    }

    // H3 → Page (L3)
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      flushCase();
      currentSubGroup = null;
      currentPage = { name: h3[1].trim() };
      if (currentModule) {
        currentModule.pages.push(currentPage);
      } else {
        currentModule = { name: UNCLASSIFIED, pages: [] };
        modules.push(currentModule);
        currentModule.pages.push(currentPage);
      }
      continue;
    }

    // H4 → SubGroup (L4)
    const h4 = line.match(/^#### (.+)$/);
    if (h4) {
      flushCase();
      currentSubGroup = { name: h4[1].trim(), test_cases: [] };
      if (currentPage) {
        if (!currentPage.sub_groups) currentPage.sub_groups = [];
        currentPage.sub_groups.push(currentSubGroup);
      }
      continue;
    }

    // H5 → Case node
    const h5 = line.match(/^##### (.+)$/);
    if (h5) {
      flushCase();
      const caseTitle = h5[1].trim();
      const pm = caseTitle.match(/^【(P\d)】/);
      const priority = pm ? pm[1] : "P1";

      if (!currentModule) {
        currentModule = { name: UNCLASSIFIED, pages: [] };
        modules.push(currentModule);
      }
      if (!currentPage) {
        currentPage = { name: UNCLASSIFIED };
        currentModule.pages.push(currentPage);
      }

      currentCase = { title: caseTitle, priority, steps: [] };
      section = "none";
      continue;
    }

    // Inside a case
    if (currentCase) {
      if (line.match(/^>\s*前置条件/)) {
        section = "precondition";
        inCodeBlock = false;
        continue;
      }

      if (line.match(/^>\s*用例步骤/)) {
        section = "steps";
        headerParsed = false;
        continue;
      }

      if (section === "precondition") {
        if (line.startsWith("```")) {
          inCodeBlock = !inCodeBlock;
          continue;
        }
        if (inCodeBlock) {
          preconditionLines.push(line);
        }
        continue;
      }

      if (section === "steps") {
        if (line.trim() === "") continue;
        if (line.match(/^\|\s*编号\s*\|/) || line.match(/^\|\s*-+\s*\|/)) {
          headerParsed = true;
          continue;
        }
        if (headerParsed && line.startsWith("|")) {
          const cells = line
            .split("|")
            .map((c) => c.trim())
            .filter((c) => c.length > 0);
          if (cells.length >= 3) {
            stepsRows.push({ step: cells[1], expected: cells[2] });
          }
          continue;
        }
      }
    }
  }

  flushCase();
  return modules;
}

function archiveToJson(
  mdPath: string,
  projectName: string,
  version?: string,
): IntermediateJson {
  const raw = readFileSync(mdPath, "utf-8");
  const { fm, body } = parseFrontMatter(raw);

  const suiteName =
    typeof fm.suite_name === "string" ? fm.suite_name : basename(mdPath, ".md");
  const prdId =
    typeof fm.prd_id === "number"
      ? fm.prd_id
      : typeof fm.case_id === "number"
        ? fm.case_id
        : undefined;

  // Resolve version: CLI --version > frontmatter prd_version
  const resolvedVersion =
    version ??
    (typeof fm.prd_version === "string" ? fm.prd_version : undefined);

  // Resolve project name: frontmatter root_name > CLI --project
  const resolvedProject =
    typeof fm.root_name === "string" ? fm.root_name : projectName;

  const modules = parseArchiveBody(body);

  const meta: Meta = {
    project_name: resolvedProject,
    requirement_name: suiteName,
  };

  if (resolvedVersion) {
    meta.version = resolvedVersion;
  }

  if (prdId) {
    meta.requirement_id = prdId;
  }

  return { meta, modules };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("xmind-gen")
    .description(
      "Convert intermediate JSON or Archive Markdown to .xmind files",
    )
    .requiredOption(
      "--input <path>",
      "Path to input JSON, MD file, or directory of MD files",
    )
    .option(
      "--output <path>",
      "Path to output .xmind file (auto-derived for MD input)",
    )
    .option("--mode <mode>", "Write mode: create | append | replace", "create")
    .option("--project <name>", "Project name for XMind root node", "数栈测试")
    .option(
      "--version <ver>",
      "PRD version (e.g. 6.4.9) for root title template",
    )
    .option("--json-only", "Only output intermediate JSON (MD input only)")
    .parse(process.argv);

  const opts = program.opts<{
    input: string;
    output?: string;
    mode: string;
    project: string;
    version?: string;
    jsonOnly?: boolean;
  }>();

  const mode = opts.mode as WriteMode;
  if (!["create", "append", "replace"].includes(mode)) {
    process.stderr.write(
      `[xmind-gen] Invalid mode: ${mode}. Must be create, append, or replace.\n`,
    );
    process.exit(1);
  }

  const inputPath = resolve(opts.input);
  const stat = statSync(inputPath);

  // Directory input → batch MD conversion
  if (stat.isDirectory()) {
    const mdFiles = readdirSync(inputPath)
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(inputPath, f));

    if (mdFiles.length === 0) {
      process.stderr.write(`[xmind-gen] No .md files found in ${inputPath}\n`);
      process.exit(1);
    }

    for (const f of mdFiles) {
      await processMdFile(f, opts.project, opts.version, opts.jsonOnly, mode);
    }
    return;
  }

  const ext = extname(inputPath).toLowerCase();

  // MD input
  if (ext === ".md") {
    await processMdFile(
      inputPath,
      opts.project,
      opts.version,
      opts.jsonOnly,
      mode,
      opts.output,
    );
    return;
  }

  // JSON input (original behavior)
  if (!opts.output) {
    process.stderr.write("[xmind-gen] --output is required for JSON input\n");
    process.exit(1);
  }

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

async function processMdFile(
  mdPath: string,
  project: string,
  version?: string,
  jsonOnly?: boolean,
  mode: WriteMode = "create",
  outputOverride?: string,
): Promise<void> {
  const fname = basename(mdPath, ".md");
  const outDir = dirname(mdPath).replace(/archive/, "xmind");
  const tmpDir = join(outDir, "tmp");

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const data = archiveToJson(mdPath, project, version);
  const caseCount = countCases(data.modules);

  if (jsonOnly) {
    const jsonPath = join(tmpDir, `${fname}.json`);
    writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
    process.stdout.write(`JSON: ${jsonPath} (${caseCount} cases)\n`);
    return;
  }

  const xmindPath = outputOverride
    ? resolve(outputOverride)
    : join(outDir, `${fname}.xmind`);

  if (existsSync(xmindPath)) unlinkSync(xmindPath);

  try {
    if (mode === "create") {
      await createXmind(data, xmindPath);
    } else if (mode === "append") {
      await appendXmind(data, xmindPath);
    } else {
      await replaceXmind(data, xmindPath);
    }
  } catch (err) {
    process.stderr.write(`[xmind-gen] Error processing ${mdPath}: ${err}\n`);
    return;
  }

  process.stdout.write(`XMind: ${resolve(xmindPath)} (${caseCount} cases)\n`);
}

main().catch((err) => {
  process.stderr.write(`[xmind-gen] Unexpected error: ${err}\n`);
  process.exit(1);
});
