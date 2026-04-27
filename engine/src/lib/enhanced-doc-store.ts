import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import matter from "gray-matter";
import { prdDir, enhancedMd, resolvedMd, sourceFactsJson } from "./paths.ts";
import { generateSectionAnchor, generateQAnchor, isValidSectionAnchor } from "./enhanced-doc-anchors.ts";
import type {
  EnhancedDoc,
  EnhancedFrontmatter,
  EnhancedStatus,
  SectionContent,
  PendingItem,
  PendingSeverity,
  PendingStatus,
  SourceFacts,
} from "./enhanced-doc-types.ts";
import { SOURCE_FACTS_BLOB_THRESHOLD } from "./enhanced-doc-types.ts";

// ---- Block markers ----
const OVERVIEW_BEGIN = "<!-- overview-begin -->";
const OVERVIEW_END = "<!-- overview-end -->";
const FUNCTIONAL_BEGIN = "<!-- functional-begin -->";
const FUNCTIONAL_END = "<!-- functional-end -->";
const IMAGES_BEGIN = "<!-- images-summary-begin -->";
const IMAGES_END = "<!-- images-summary-end -->";
const PENDING_BEGIN = "<!-- pending-begin -->";
const PENDING_END = "<!-- pending-end -->";
const SOURCE_FACTS_BEGIN = "<!-- source-facts-begin -->";
const SOURCE_FACTS_END = "<!-- source-facts-end -->";

function extractBlock(body: string, begin: string, end: string): string {
  const i = body.indexOf(begin);
  const j = body.indexOf(end);
  if (i < 0 || j < 0) return "";
  return body.slice(i + begin.length, j);
}

function hasSourceFacts(body: string): boolean {
  const block = extractBlock(body, SOURCE_FACTS_BEGIN, SOURCE_FACTS_END).trim();
  return block.length > 0 && !block.includes("_TODO_");
}

function extractSourceFactsRef(body: string): string | null {
  const block = extractBlock(body, SOURCE_FACTS_BEGIN, SOURCE_FACTS_END);
  const m = block.match(/"\$ref":\s*"([^"]+)"/);
  return m ? m[1] : null;
}

function parseSections(block: string): SectionContent[] {
  const sections: SectionContent[] = [];
  // Anchor form: s-{level}-{index}-{4hex}
  const re = /^### (.+?) <a id="(s-\d+-\d+-[0-9a-f]{4})"><\/a>\s*$([\s\S]*?)(?=^### |$(?![\r\n]))/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    sections.push({ anchor: m[2], title: m[1].trim(), body: m[3].trim() });
  }
  return sections;
}

const SKELETON_BODY = (slug: string) => `
# ${slug}

## 1. 概述 <a id="s-1"></a>

<!-- overview-begin -->
### 1.1 背景 <a id="${generateSectionAnchor(1, 1)}"></a>

_TODO_

### 1.2 痛点 <a id="${generateSectionAnchor(1, 2)}"></a>

_TODO_

### 1.3 目标 <a id="${generateSectionAnchor(1, 3)}"></a>

_TODO_

### 1.4 成功标准 <a id="${generateSectionAnchor(1, 4)}"></a>

_TODO_
<!-- overview-end -->

## 2. 功能细节 <a id="s-2"></a>

<!-- functional-begin -->
<!-- functional-end -->

## 3. 图像与页面要点 <a id="s-3"></a>

<!-- images-summary-begin -->
_TODO_
<!-- images-summary-end -->

## 4. 待确认项 <a id="s-4"></a>

<!-- pending-begin -->
<!-- pending-end -->

## Appendix A: 源码事实表 <a id="source-facts"></a>

<!-- source-facts-begin -->
_TODO_
<!-- source-facts-end -->
`;

export interface InitDocOptions {
  strategyId?: string;
}

export function initDoc(
  project: string,
  yyyymm: string,
  slug: string,
  opts: InitDocOptions = {},
): void {
  const docPath = enhancedMd(project, yyyymm, slug);
  if (existsSync(docPath)) {
    throw new Error(`enhanced.md already exists: ${docPath}`);
  }
  mkdirSync(dirname(docPath), { recursive: true });
  const now = new Date().toISOString();
  const fm: EnhancedFrontmatter = {
    schema_version: 1,
    status: "discussing",
    project,
    prd_slug: slug,
    prd_dir: prdDir(project, yyyymm, slug),
    pending_count: 0,
    resolved_count: 0,
    defaulted_count: 0,
    handoff_mode: null,
    reentry_from: null,
    source_consent: null,
    source_reference: "full",
    migrated_from_plan: false,
    q_counter: 0,
    created_at: now,
    updated_at: now,
    strategy_id: opts.strategyId ?? "S1",
    knowledge_dropped: [],
  };
  const content = matter.stringify(SKELETON_BODY(slug), fm);
  writeFileSync(docPath, content, "utf8");
}

export function readDoc(project: string, yyyymm: string, slug: string): EnhancedDoc {
  const docPath = enhancedMd(project, yyyymm, slug);
  if (!existsSync(docPath)) {
    throw new Error(`enhanced.md not found: ${docPath}`);
  }
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  return {
    frontmatter: parsed.data as EnhancedFrontmatter,
    overview: parseOverview(parsed.content),
    functional: parseFunctional(parsed.content),
    images_summary: parseImagesSummary(parsed.content),
    pending: parsePending(parsed.content),
    source_facts: hasSourceFacts(parsed.content) ? readSourceFacts(project, yyyymm, slug) : null,
    source_facts_ref: extractSourceFactsRef(parsed.content),
  };
}

export function writeFrontmatter(
  project: string,
  yyyymm: string,
  slug: string,
  updates: Partial<EnhancedFrontmatter>,
): void {
  const docPath = enhancedMd(project, yyyymm, slug);
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  const fm = {
    ...(parsed.data as EnhancedFrontmatter),
    ...updates,
    updated_at: new Date().toISOString(),
  };
  writeFileSync(docPath, matter.stringify(parsed.content, fm), "utf8");
}

export function setStatus(
  project: string,
  yyyymm: string,
  slug: string,
  status: EnhancedStatus,
): void {
  writeFrontmatter(project, yyyymm, slug, { status });
}

// ---- Section parsers ----
function parseOverview(body: string): SectionContent[] {
  return parseSections(extractBlock(body, OVERVIEW_BEGIN, OVERVIEW_END));
}

function parseFunctional(body: string): SectionContent[] {
  return parseSections(extractBlock(body, FUNCTIONAL_BEGIN, FUNCTIONAL_END));
}

function parseImagesSummary(body: string): string {
  return extractBlock(body, IMAGES_BEGIN, IMAGES_END).trim();
}

function renderQBlock(item: PendingItem): string {
  return `
### ${item.id.toUpperCase()} <a id="${item.id}"></a>

<!-- severity: ${item.severity} -->

| 字段 | 值 |
|---|---|
| **位置** | [${item.location_label}](#${item.location_anchor}) |
| **问题** | ${item.question} |
| **状态** | ${item.status} |
| **推荐** | ${item.recommended} |
| **预期** | ${item.expected} |
`.trimEnd();
}

function matchCell(table: string, label: string, innerExtract?: RegExp): string | null {
  const line = table.match(new RegExp(`\\*\\*${label}\\*\\*\\s*\\|\\s*(.+)$`, "m"));
  if (!line) return null;
  const raw = line[1].trim().replace(/\s*\|$/, "").trim();
  if (innerExtract) {
    const inner = raw.match(innerExtract);
    return inner ? inner[1] : null;
  }
  return raw;
}

function parsePending(body: string): PendingItem[] {
  const block = extractBlock(body, PENDING_BEGIN, PENDING_END);
  const items: PendingItem[] = [];
  // Match: ### Q1 <a id="q1"></a>...(until next ### or end)
  //   OR: ### <del>Q1</del> <a id="q1"></a>...
  const re = /^### (Q\d+|<del>Q\d+<\/del>) <a id="(q\d+)"><\/a>([\s\S]*?)(?=^### |$(?![\r\n]))/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const resolved = m[1].startsWith("<del>");
    const tableText = m[3];
    const sevMatch = tableText.match(/<!-- severity: (\w+) -->/);
    items.push({
      id: m[2],
      location_anchor: matchCell(tableText, "位置", /#([^)]+)\)/) ?? "",
      location_label: matchCell(tableText, "位置", /\[([^\]]+)\]/) ?? "",
      question: matchCell(tableText, "问题") ?? "",
      status: (matchCell(tableText, "状态") ?? "待确认") as PendingStatus,
      recommended: matchCell(tableText, "推荐") ?? "",
      expected: matchCell(tableText, "预期") ?? "",
      answer: resolved ? matchCell(tableText, "回答") : null,
      severity: (sevMatch?.[1] ?? "blocking_unknown") as PendingSeverity,
      resolved_at: resolved ? (matchCell(tableText, "已解决") ?? null) : null,
    });
  }
  return items;
}

// ---- Section mutation exports ----

export function setSection(
  project: string,
  yyyymm: string,
  slug: string,
  anchor: string,
  content: string,
): void {
  const docPath = enhancedMd(project, yyyymm, slug);
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  const body = parsed.content;
  const headingRegex = new RegExp(`^### .+? <a id="${anchor}"><\\/a>\\s*$`, "m");
  const match = headingRegex.exec(body);
  if (!match) throw new Error(`anchor not found: ${anchor}`);

  const headingEndIdx = match.index + match[0].length;
  const rest = body.slice(headingEndIdx);

  // End of this section: next `\n### ` OR next `\n<!-- {block}-end -->`
  const nextHeadingOffset = rest.search(/\n### /);
  const nextBlockEndOffset = rest.search(/\n<!--\s*\w[\w-]*-end\s*-->/);
  let endOffset = rest.length;
  for (const c of [nextHeadingOffset, nextBlockEndOffset]) {
    if (c >= 0 && c < endOffset) endOffset = c;
  }

  const before = body.slice(0, headingEndIdx);
  const after = body.slice(headingEndIdx + endOffset);
  const newBody = `${before}\n\n${content.trim()}\n${after}`;
  const fm = { ...(parsed.data as EnhancedFrontmatter), updated_at: new Date().toISOString() };
  writeFileSync(docPath, matter.stringify(newBody, fm), "utf8");
}

export interface AddSectionOpts {
  parentLevel: 2 | 3;
  title: string;
  body: string;
}

export function addSection(
  project: string,
  yyyymm: string,
  slug: string,
  opts: AddSectionOpts,
): string {
  const docPath = enhancedMd(project, yyyymm, slug);
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  const existing = opts.parentLevel === 2
    ? parseFunctional(parsed.content)
    : parseOverview(parsed.content);
  const newIndex = existing.length + 1;
  const anchor = generateSectionAnchor(opts.parentLevel, newIndex);
  const snippet = `### ${opts.title} <a id="${anchor}"></a>\n\n${opts.body}\n\n`;
  const block = opts.parentLevel === 2 ? FUNCTIONAL_END : OVERVIEW_END;
  const newBody = parsed.content.replace(block, snippet + block);
  const fm = { ...(parsed.data as EnhancedFrontmatter), updated_at: new Date().toISOString() };
  writeFileSync(docPath, matter.stringify(newBody, fm), "utf8");
  return anchor;
}

export interface ResolveOpts {
  answer: string;
  asDefault?: boolean;
}

export function resolvePending(
  project: string,
  yyyymm: string,
  slug: string,
  qid: string,
  opts: ResolveOpts,
): void {
  const docPath = enhancedMd(project, yyyymm, slug);
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  let body = parsed.content;
  const fm = { ...(parsed.data as EnhancedFrontmatter) };

  // Locate Q heading (handles both resolved and unresolved forms)
  const headingRe = new RegExp(
    `^### (Q\\d+|<del>Q\\d+<\\/del>) <a id="${qid}"><\\/a>\\s*$`,
    "m",
  );
  const hm = headingRe.exec(body);
  if (!hm) throw new Error(`${qid} not found`);
  if (hm[1].startsWith("<del>")) throw new Error(`${qid} already resolved`);

  // Wrap heading in <del>
  const newHeading = `### <del>${qid.toUpperCase()}</del> <a id="${qid}"></a>`;
  body = body.replace(hm[0].trimEnd(), newHeading);

  // Find end of this Q block (next `### ` or <!-- pending-end -->)
  const newHeadingIdx = body.indexOf(newHeading);
  const rest = body.slice(newHeadingIdx + newHeading.length);
  const nextHeadingOffset = rest.search(/\n### /);
  const pendingEndOffset = rest.indexOf(PENDING_END);
  let endOffset = rest.length;
  for (const c of [nextHeadingOffset, pendingEndOffset]) {
    if (c >= 0 && c < endOffset) endOffset = c;
  }
  const blockAbsEnd = newHeadingIdx + newHeading.length + endOffset;
  const before = body.slice(0, blockAbsEnd);
  const after = body.slice(blockAbsEnd);

  const resolvedAt = new Date().toISOString();
  const statusLabel = opts.asDefault ? "默认采用" : "已解决";

  // Update status cell 待确认 → statusLabel (within this block only)
  const beforeUpdated = before.replace(
    /\*\*状态\*\*\s*\|\s*待确认\s*\|/,
    `**状态** | ${statusLabel} |`,
  );

  // Append 回答 + 已解决 rows
  const appended = `| **回答** | ${opts.answer} |\n| **已解决** | ${resolvedAt} |\n`;

  body = `${beforeUpdated}\n${appended}${after}`;

  // Replace inline [^qN] footnote with answer italicized
  const fnRe = new RegExp(`\\[\\^${qid}\\]`, "g");
  body = body.replace(fnRe, `*${opts.answer}*`);

  // Counts
  fm.pending_count = Math.max(0, fm.pending_count - 1);
  fm.resolved_count += 1;
  if (opts.asDefault) fm.defaulted_count += 1;
  fm.updated_at = new Date().toISOString();
  writeFileSync(docPath, matter.stringify(body, fm), "utf8");
}

export interface AddPendingOpts {
  locationAnchor: string;
  locationLabel: string;
  question: string;
  recommended: string;
  expected: string;
  severity: PendingSeverity;
}

export function addPending(
  project: string,
  yyyymm: string,
  slug: string,
  opts: AddPendingOpts,
): string {
  if (!isValidSectionAnchor(opts.locationAnchor)) {
    throw new Error(`invalid location anchor format: ${opts.locationAnchor}`);
  }
  const docPath = enhancedMd(project, yyyymm, slug);
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  const body = parsed.content;
  if (!body.includes(`<a id="${opts.locationAnchor}"></a>`)) {
    throw new Error(`location anchor not found in doc: ${opts.locationAnchor}`);
  }
  const fm = { ...(parsed.data as EnhancedFrontmatter) };
  const newCounter = fm.q_counter + 1;
  const qid = generateQAnchor(newCounter);
  const item: PendingItem = {
    id: qid,
    location_anchor: opts.locationAnchor,
    location_label: opts.locationLabel,
    question: opts.question,
    status: "待确认",
    recommended: opts.recommended,
    expected: opts.expected,
    answer: null,
    severity: opts.severity,
    resolved_at: null,
  };

  let newBody = body;
  // 1) inline footnote [^qN] at sub-section heading (only for s-level-index-uuid format)
  const subAnchor = /^s-\d+-\d+-[0-9a-f]{4}$/.test(opts.locationAnchor);
  if (subAnchor) {
    const headingRegex = new RegExp(`(^### .+? <a id="${opts.locationAnchor}"><\\/a>\\s*$)`, "m");
    newBody = newBody.replace(headingRegex, (_, h) => `${h}\n\n[^${qid}]`);
  }
  // 2) append Q block before <!-- pending-end -->
  newBody = newBody.replace(PENDING_END, `${renderQBlock(item)}\n\n${PENDING_END}`);
  // 3) frontmatter updates
  fm.q_counter = newCounter;
  fm.pending_count += 1;
  fm.updated_at = new Date().toISOString();
  if (fm.status === "analyzing" || fm.status === "writing") {
    fm.reentry_from = fm.status;
    fm.status = "discussing";
  }
  writeFileSync(docPath, matter.stringify(newBody, fm), "utf8");
  return qid;
}

// ---- listPending ----

export interface ListPendingOpts {
  includeResolved?: boolean;
}

export function listPending(
  project: string,
  yyyymm: string,
  slug: string,
  opts: ListPendingOpts = {},
): PendingItem[] {
  const doc = readDoc(project, yyyymm, slug);
  if (opts.includeResolved) return doc.pending;
  return doc.pending.filter(p => p.status === "待确认");
}

// ---- validateDoc ----

export interface ValidateOpts {
  requireZeroPending?: boolean;
  checkSourceRefs?: string[];
}

export interface ValidateResult {
  ok: boolean;
  issues: string[];
}

export function validateDoc(
  project: string,
  yyyymm: string,
  slug: string,
  opts: ValidateOpts = {},
): ValidateResult {
  const docPath = enhancedMd(project, yyyymm, slug);
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  const fm = parsed.data as EnhancedFrontmatter;
  const body = parsed.content;
  const issues: string[] = [];

  // 1) schema_version
  if (fm.schema_version !== 1) issues.push(`unknown schema_version: ${fm.schema_version}`);

  // 2) anchor regex + duplicates
  const anchorMatches = [...body.matchAll(/<a id="([^"]+)"><\/a>/g)].map(m => m[1]);
  const seen = new Set<string>();
  for (const a of anchorMatches) {
    if (!isValidSectionAnchor(a) && !/^q\d+$/.test(a)) {
      issues.push(`malformed anchor: ${a}`);
    }
    if (seen.has(a)) issues.push(`duplicate anchor: ${a}`);
    seen.add(a);
  }

  // 3) footnotes have matching Q blocks
  const footnotes = [...body.matchAll(/\[\^(q\d+)\]/g)].map(m => m[1]);
  const qAnchors = anchorMatches.filter(a => /^q\d+$/.test(a));
  for (const fn of new Set(footnotes)) {
    if (!qAnchors.includes(fn)) issues.push(`orphan footnote: [^${fn}]`);
  }

  // 4) Q location anchors resolvable
  const pending = parsePending(body);
  for (const p of pending) {
    if (!body.includes(`<a id="${p.location_anchor}"></a>`)) {
      issues.push(`broken location anchor in ${p.id}: ${p.location_anchor}`);
    }
  }

  // 5) count mismatch
  const waitingCount = pending.filter(p => p.status === "待确认").length;
  const resolvedCount = pending.filter(p => p.status === "已解决" || p.status === "默认采用").length;
  if (fm.pending_count !== waitingCount) {
    issues.push(`pending_count mismatch: frontmatter=${fm.pending_count}, §4=${waitingCount}`);
  }
  if (fm.resolved_count !== resolvedCount) {
    issues.push(`resolved_count mismatch: frontmatter=${fm.resolved_count}, §4=${resolvedCount}`);
  }

  // 6) q_counter monotonic
  const maxQ = Math.max(0, ...pending.map(p => Number(p.id.slice(1))));
  if (fm.q_counter < maxQ) {
    issues.push(`q_counter regression: counter=${fm.q_counter}, max_q=${maxQ}`);
  }

  // Optional gates
  if (opts.requireZeroPending && fm.pending_count > 0) {
    issues.push(`pending_count > 0 (requireZeroPending)`);
  }
  if (opts.checkSourceRefs) {
    for (const ref of opts.checkSourceRefs) {
      const parts = ref.split("#");
      if (parts[0] !== "enhanced") continue;
      const anchor = parts[1];
      if (!body.includes(`<a id="${anchor}"></a>`)) {
        issues.push(`source_ref unresolved: ${ref}`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

// ---- source-facts blob ----

export function setSourceFacts(
  project: string,
  yyyymm: string,
  slug: string,
  facts: SourceFacts,
): void {
  const docPath = enhancedMd(project, yyyymm, slug);
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  const serialized = JSON.stringify(facts, null, 2);
  let blockContent: string;
  if (Buffer.byteLength(serialized, "utf8") > SOURCE_FACTS_BLOB_THRESHOLD) {
    const jsonPath = sourceFactsJson(project, yyyymm, slug);
    writeFileSync(jsonPath, serialized, "utf8");
    blockContent = `\n\`\`\`json\n{ "$ref": "./source-facts.json" }\n\`\`\`\n`;
  } else {
    blockContent = `\n\`\`\`json\n${serialized}\n\`\`\`\n`;
  }
  const newBody = parsed.content.replace(
    new RegExp(`${SOURCE_FACTS_BEGIN}[\\s\\S]*?${SOURCE_FACTS_END}`),
    `${SOURCE_FACTS_BEGIN}${blockContent}${SOURCE_FACTS_END}`,
  );
  const fm = { ...(parsed.data as EnhancedFrontmatter), updated_at: new Date().toISOString() };
  writeFileSync(docPath, matter.stringify(newBody, fm), "utf8");
}

export function readSourceFacts(
  project: string,
  yyyymm: string,
  slug: string,
): SourceFacts {
  const raw = readFileSync(enhancedMd(project, yyyymm, slug), "utf8");
  const block = extractBlock(matter(raw).content, SOURCE_FACTS_BEGIN, SOURCE_FACTS_END);
  const jsonMatch = block.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) throw new Error(`source-facts block malformed`);
  const obj = JSON.parse(jsonMatch[1]);
  if (obj["$ref"]) {
    const refPath = sourceFactsJson(project, yyyymm, slug);
    return JSON.parse(readFileSync(refPath, "utf8")) as SourceFacts;
  }
  return obj as SourceFacts;
}

// ---- compactDoc ----

export interface CompactOpts {
  threshold?: number;
}

export function compactDoc(
  project: string,
  yyyymm: string,
  slug: string,
  opts: CompactOpts = {},
): number {
  const threshold = opts.threshold ?? 50;
  const docPath = enhancedMd(project, yyyymm, slug);
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  const body = parsed.content;

  // Count <del>Qn</del> headings in the pending block
  const pendingBlock = extractBlock(body, PENDING_BEGIN, PENDING_END);
  const delHeadingRe = /^### <del>Q\d+<\/del> /gm;
  const delCount = (pendingBlock.match(delHeadingRe) ?? []).length;
  if (delCount < threshold) return 0;

  // Extract entire <del> Q blocks: from heading to next ### or end of block content
  // pendingBlock does not include the surrounding markers, so use \s*$ to match final block
  const blockRe = /^### <del>Q\d+<\/del>[\s\S]*?(?=^### |\s*$)/gm;
  const archived = pendingBlock.match(blockRe) ?? [];

  if (archived.length === 0) return 0;

  // Append to resolved.md
  const resolvedPath = resolvedMd(project, yyyymm, slug);
  const existing = existsSync(resolvedPath)
    ? readFileSync(resolvedPath, "utf8")
    : "# Resolved Q Archive\n\n";
  writeFileSync(resolvedPath, existing + archived.join("\n") + "\n", "utf8");

  // Remove archived blocks from body by rebuilding pending block content
  const newPendingBlock = pendingBlock.replace(blockRe, "");
  const newBody = body.replace(
    PENDING_BEGIN + pendingBlock + PENDING_END,
    PENDING_BEGIN + newPendingBlock + PENDING_END,
  );
  writeFileSync(docPath, matter.stringify(newBody, parsed.data), "utf8");
  return archived.length;
}
