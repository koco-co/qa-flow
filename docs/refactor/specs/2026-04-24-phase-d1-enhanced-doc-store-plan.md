# Phase D1 — enhanced-doc-store + discuss CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 `enhanced.md` 的读写存储层 + `kata-cli discuss` 扩展子命令，让 CLI 可以独立产出 / 读取 / 校验 enhanced.md，并通过 `migrate-plan --dry-run` 验证迁移映射正确。本 phase 不改 workflow 节点文件、不动下游 analyze/write。

**Architecture:**
- 新增 `.claude/scripts/lib/enhanced-doc-store.ts`（~600 行）承担所有 enhanced.md 结构化读写：frontmatter / 正文段落 / §4 Q 区块 / Appendix A / blob 外溢 / 锚点完整性 validate
- 复用 `.claude/scripts/lib/paths.ts` 路径体系，新增 `prdDir() / enhancedMd() / sourceFactsJson() / resolvedMd() / prdImagesDir()`
- `.claude/scripts/discuss.ts` 新增 10+ 子命令（init / read / set-section / add-section / set-source-facts / add-pending / resolve / list-pending / compact / validate / set-status / migrate-plan），老 plan.md 相关 lib（`.claude/scripts/lib/discuss.ts`）暂不删，两者并存以便 Phase D3 前对比回归
- 稳定锚点格式 `s-{n}-{m}-{uuid4hex}` 由 store 层生成；Q 编号由 `frontmatter.q_counter` 单调递增

**Tech Stack:** Bun / TypeScript / bun test / commander.js（kata-cli 现有）/ gray-matter（现有 frontmatter 解析）/ js-yaml / crypto（UUID）

**Spec reference:** `docs/refactor/specs/2026-04-24-unified-discuss-document-design.md`（Part 1 文档模型、Part 3 CLI 合约、Part 5.1 新增 scripts 清单）

**Non-goals for D1:**
- 不改任何 `.claude/skills/test-case-gen/workflow/` 文件
- 不改 `.claude/agents/` 任何文件
- 不删 `.claude/scripts/lib/discuss.ts`（并存，D2 前有回归兜底）
- 不改 `.claude/scripts/progress.ts`（D3 处理在途 session 迁移）
- 不跑真实 `migrate-plan`（只 dry-run 验证）

---

## Task 1: 扩展 paths.ts — 新增 enhanced doc 相关路径

**Files:**
- Modify: `.claude/scripts/lib/paths.ts`（末尾追加）
- Test: `.claude/scripts/__tests__/paths.test.ts`（若不存在则创建）

**Spec anchor:** Part 1.0 目录结构

- [ ] **Step 1: 写失败测试**

Append to `.claude/scripts/__tests__/paths.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import {
  prdDir,
  enhancedMd,
  sourceFactsJson,
  resolvedMd,
  prdImagesDir,
  originalPrdMd,
} from "../lib/paths.ts";

describe("enhanced doc paths", () => {
  test("prdDir returns {project}/prds/{yyyymm}/{slug}/", () => {
    const p = prdDir("dataAssets", "202604", "my-prd");
    expect(p).toMatch(/workspace\/dataAssets\/prds\/202604\/my-prd$/);
  });

  test("enhancedMd is {prdDir}/enhanced.md", () => {
    const p = enhancedMd("dataAssets", "202604", "my-prd");
    expect(p).toMatch(/my-prd\/enhanced\.md$/);
  });

  test("sourceFactsJson is {prdDir}/source-facts.json", () => {
    expect(sourceFactsJson("dataAssets", "202604", "my-prd"))
      .toMatch(/my-prd\/source-facts\.json$/);
  });

  test("resolvedMd is {prdDir}/resolved.md", () => {
    expect(resolvedMd("dataAssets", "202604", "my-prd"))
      .toMatch(/my-prd\/resolved\.md$/);
  });

  test("prdImagesDir is {prdDir}/images/", () => {
    expect(prdImagesDir("dataAssets", "202604", "my-prd"))
      .toMatch(/my-prd\/images$/);
  });

  test("originalPrdMd is {prdDir}/original.md", () => {
    expect(originalPrdMd("dataAssets", "202604", "my-prd"))
      .toMatch(/my-prd\/original\.md$/);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test .claude/scripts/__tests__/paths.test.ts`
Expected: FAIL — `prdDir is not exported` 等

- [ ] **Step 3: 实现最小代码**

Append to `.claude/scripts/lib/paths.ts`（紧跟 `plansDir` 之后）:

```typescript
export function prdDir(project: string, yyyymm: string, slug: string): string {
  return join(prdsDir(project), yyyymm, slug);
}

export function enhancedMd(project: string, yyyymm: string, slug: string): string {
  return join(prdDir(project, yyyymm, slug), "enhanced.md");
}

export function sourceFactsJson(project: string, yyyymm: string, slug: string): string {
  return join(prdDir(project, yyyymm, slug), "source-facts.json");
}

export function resolvedMd(project: string, yyyymm: string, slug: string): string {
  return join(prdDir(project, yyyymm, slug), "resolved.md");
}

export function prdImagesDir(project: string, yyyymm: string, slug: string): string {
  return join(prdDir(project, yyyymm, slug), "images");
}

export function originalPrdMd(project: string, yyyymm: string, slug: string): string {
  return join(prdDir(project, yyyymm, slug), "original.md");
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun test .claude/scripts/__tests__/paths.test.ts`
Expected: PASS（6 test cases）

- [ ] **Step 5: 全量回归**

Run: `bun test .claude/scripts/__tests__`
Expected: 所有测试通过（含原有 paths / progress-store 等）

- [ ] **Step 6: 提交**

```bash
git add .claude/scripts/lib/paths.ts .claude/scripts/__tests__/paths.test.ts
git commit -m "feat(paths): add enhanced-doc paths (prdDir/enhancedMd/sourceFactsJson/resolvedMd/prdImagesDir/originalPrdMd)"
```

---

## Task 2: 定义类型 — enhanced-doc-types.ts

**Files:**
- Create: `.claude/scripts/lib/enhanced-doc-types.ts`

**Spec anchor:** Part 1.1 frontmatter / Part 1.2 字段约定

- [ ] **Step 1: 创建类型定义文件**

Create `.claude/scripts/lib/enhanced-doc-types.ts`:

```typescript
export type EnhancedStatus =
  | "discussing"
  | "pending-review"
  | "ready"
  | "analyzing"
  | "writing"
  | "completed";

export type ReentryFrom = "analyzing" | "writing" | null;

export type SourceReference = "full" | "none";

export interface RepoConsent {
  repos: Array<{ path: string; branch: string; sha?: string }>;
  granted_at: string;
}

export interface EnhancedFrontmatter {
  schema_version: 1;
  status: EnhancedStatus;
  project: string;
  prd_slug: string;
  prd_dir: string;
  pending_count: number;
  resolved_count: number;
  defaulted_count: number;
  handoff_mode: "current" | "new" | null;
  reentry_from: ReentryFrom;
  source_consent: RepoConsent | null;
  source_reference: SourceReference;
  migrated_from_plan: boolean;
  q_counter: number;
  created_at: string;
  updated_at: string;
  strategy_id: string;
  knowledge_dropped: string[];
}

export type PendingSeverity = "blocking_unknown" | "defaultable_unknown" | "pending_for_pm";
export type PendingStatus = "待确认" | "已解决" | "默认采用";

export interface PendingItem {
  id: string;                       // "Q1", "Q2", ...
  location_anchor: string;          // "s-2-1-i9j0"
  location_label: string;           // "§2.1 功能块 1 → format 字段"
  question: string;
  status: PendingStatus;
  recommended: string;
  expected: string;                 // 新增
  answer: string | null;            // resolve 时填入
  severity: PendingSeverity;
  resolved_at: string | null;
}

export interface SourceFacts {
  fields: Array<{ name: string; type: string; path: string; note: string }>;
  routes: Array<{ method: string; path: string; handler: string }>;
  state_enums: Array<{ name: string; values: string[]; file: string }>;
  permissions: Array<{ code: string; scope: string; file: string }>;
  api_signatures: Array<{ name: string; signature: string; file: string }>;
}

export interface SectionContent {
  anchor: string;                   // "s-1-1-a1b2"
  title: string;
  body: string;                     // markdown body, excluding heading line
}

export interface EnhancedDoc {
  frontmatter: EnhancedFrontmatter;
  overview: SectionContent[];        // §1.x
  functional: SectionContent[];      // §2.x
  images_summary: string;            // §3 正文（无子节）
  pending: PendingItem[];            // §4 所有 Q（含 resolved）
  source_facts: SourceFacts | null;  // Appendix A（已 deref）
  source_facts_ref: string | null;   // 若外溢则存 $ref 路径
}

export const ANCHOR_REGEX = /^s-\d+(-\d+-[0-9a-f]{4})?$/;
export const SOURCE_FACTS_ANCHOR = "source-facts";
export const Q_ANCHOR_REGEX = /^q\d+$/;
export const SOURCE_FACTS_BLOB_THRESHOLD = 64 * 1024;  // 64KB
```

- [ ] **Step 2: 类型检查**

Run: `bun run tsc --noEmit .claude/scripts/lib/enhanced-doc-types.ts`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add .claude/scripts/lib/enhanced-doc-types.ts
git commit -m "feat(enhanced-doc): add type definitions for frontmatter/pending/source-facts"
```

---

## Task 3: 锚点生成器 — enhanced-doc-anchors.ts

**Files:**
- Create: `.claude/scripts/lib/enhanced-doc-anchors.ts`
- Test: `.claude/scripts/__tests__/enhanced-doc-anchors.test.ts`

**Spec anchor:** Part 1.4 锚点规范

- [ ] **Step 1: 写失败测试**

Create `.claude/scripts/__tests__/enhanced-doc-anchors.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import {
  generateSectionAnchor,
  generateQAnchor,
  isValidSectionAnchor,
  isValidQAnchor,
  parseAnchor,
} from "../lib/enhanced-doc-anchors.ts";

describe("enhanced-doc-anchors", () => {
  test("generateSectionAnchor top-level", () => {
    expect(generateSectionAnchor(1)).toBe("s-1");
    expect(generateSectionAnchor(2)).toBe("s-2");
  });

  test("generateSectionAnchor sub-section has 4-hex uuid", () => {
    const a = generateSectionAnchor(2, 1);
    expect(a).toMatch(/^s-2-1-[0-9a-f]{4}$/);
  });

  test("generateSectionAnchor sub-sections are unique", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) seen.add(generateSectionAnchor(2, 1));
    expect(seen.size).toBeGreaterThan(40);  // 4-hex = 65536 space, collision rare
  });

  test("generateQAnchor from counter", () => {
    expect(generateQAnchor(1)).toBe("q1");
    expect(generateQAnchor(42)).toBe("q42");
  });

  test("isValidSectionAnchor accepts spec formats", () => {
    expect(isValidSectionAnchor("s-1")).toBe(true);
    expect(isValidSectionAnchor("s-2-1-a1b2")).toBe(true);
    expect(isValidSectionAnchor("source-facts")).toBe(true);
  });

  test("isValidSectionAnchor rejects malformed", () => {
    expect(isValidSectionAnchor("s-1-1")).toBe(false);  // missing uuid
    expect(isValidSectionAnchor("s-2-1-xyz")).toBe(false);  // uuid must be hex
    expect(isValidSectionAnchor("section-1")).toBe(false);
    expect(isValidSectionAnchor("q1")).toBe(false);  // Q anchor, not section
  });

  test("isValidQAnchor accepts q{n}", () => {
    expect(isValidQAnchor("q1")).toBe(true);
    expect(isValidQAnchor("q42")).toBe(true);
    expect(isValidQAnchor("Q1")).toBe(false);  // lowercase only
    expect(isValidQAnchor("q")).toBe(false);
  });

  test("parseAnchor decomposes section anchor", () => {
    expect(parseAnchor("s-2-1-a1b2")).toEqual({
      kind: "section",
      level: 2,
      index: 1,
      uuid: "a1b2",
    });
  });

  test("parseAnchor decomposes top-level section", () => {
    expect(parseAnchor("s-1")).toEqual({ kind: "section", level: 1 });
  });

  test("parseAnchor decomposes Q anchor", () => {
    expect(parseAnchor("q7")).toEqual({ kind: "pending", counter: 7 });
  });

  test("parseAnchor recognizes appendix", () => {
    expect(parseAnchor("source-facts")).toEqual({ kind: "appendix" });
  });

  test("parseAnchor returns null for invalid", () => {
    expect(parseAnchor("garbage")).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-anchors.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现最小代码**

Create `.claude/scripts/lib/enhanced-doc-anchors.ts`:

```typescript
import { randomBytes } from "node:crypto";
import { ANCHOR_REGEX, Q_ANCHOR_REGEX, SOURCE_FACTS_ANCHOR } from "./enhanced-doc-types.ts";

export function generateSectionAnchor(level: number, index?: number): string {
  if (index === undefined) return `s-${level}`;
  const uuid = randomBytes(2).toString("hex");  // 4 hex chars
  return `s-${level}-${index}-${uuid}`;
}

export function generateQAnchor(counter: number): string {
  return `q${counter}`;
}

export function isValidSectionAnchor(anchor: string): boolean {
  if (anchor === SOURCE_FACTS_ANCHOR) return true;
  return ANCHOR_REGEX.test(anchor);
}

export function isValidQAnchor(anchor: string): boolean {
  return Q_ANCHOR_REGEX.test(anchor);
}

export type ParsedAnchor =
  | { kind: "section"; level: number; index?: number; uuid?: string }
  | { kind: "pending"; counter: number }
  | { kind: "appendix" }
  | null;

export function parseAnchor(anchor: string): ParsedAnchor {
  if (anchor === SOURCE_FACTS_ANCHOR) return { kind: "appendix" };
  const qMatch = anchor.match(/^q(\d+)$/);
  if (qMatch) return { kind: "pending", counter: Number(qMatch[1]) };
  const topMatch = anchor.match(/^s-(\d+)$/);
  if (topMatch) return { kind: "section", level: Number(topMatch[1]) };
  const subMatch = anchor.match(/^s-(\d+)-(\d+)-([0-9a-f]{4})$/);
  if (subMatch) {
    return {
      kind: "section",
      level: Number(subMatch[1]),
      index: Number(subMatch[2]),
      uuid: subMatch[3],
    };
  }
  return null;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-anchors.test.ts`
Expected: PASS（12 test cases）

- [ ] **Step 5: 提交**

```bash
git add .claude/scripts/lib/enhanced-doc-anchors.ts .claude/scripts/__tests__/enhanced-doc-anchors.test.ts
git commit -m "feat(enhanced-doc): add anchor generator and parser (s-/q/source-facts formats)"
```

---

## Task 4: Frontmatter 读写 — enhanced-doc-store.ts 基础

**Files:**
- Create: `.claude/scripts/lib/enhanced-doc-store.ts`（骨架）
- Test: `.claude/scripts/__tests__/enhanced-doc-store.test.ts`

**Spec anchor:** Part 1.1 frontmatter schema / Part 2.3 状态机

- [ ] **Step 1: 写失败测试 — frontmatter 读写**

Create `.claude/scripts/__tests__/enhanced-doc-store.test.ts`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  initDoc,
  readDoc,
  writeFrontmatter,
  setStatus,
} from "../lib/enhanced-doc-store.ts";
import { repoRoot } from "../lib/paths.ts";

const TEST_PROJECT = "test-d1-project";
const TEST_YM = "202604";
const TEST_SLUG = "test-slug";

function cleanup() {
  const workspace = join(repoRoot(), "workspace", TEST_PROJECT);
  if (existsSync(workspace)) rmSync(workspace, { recursive: true, force: true });
}

describe("enhanced-doc-store: frontmatter", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test("initDoc creates enhanced.md with default frontmatter", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const doc = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(doc.frontmatter.schema_version).toBe(1);
    expect(doc.frontmatter.status).toBe("discussing");
    expect(doc.frontmatter.pending_count).toBe(0);
    expect(doc.frontmatter.q_counter).toBe(0);
    expect(doc.frontmatter.migrated_from_plan).toBe(false);
    expect(doc.frontmatter.prd_slug).toBe(TEST_SLUG);
  });

  test("initDoc with migrated_from_plan=true sets flag", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG, { migratedFromPlan: true });
    const doc = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(doc.frontmatter.migrated_from_plan).toBe(true);
  });

  test("initDoc pre-allocates top-level section anchors", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const raw = readFileSync(
      join(repoRoot(), "workspace", TEST_PROJECT, "prds", TEST_YM, TEST_SLUG, "enhanced.md"),
      "utf8",
    );
    expect(raw).toContain('<a id="s-1"></a>');
    expect(raw).toContain('<a id="s-2"></a>');
    expect(raw).toContain('<a id="s-3"></a>');
    expect(raw).toContain('<a id="s-4"></a>');
    expect(raw).toContain('<a id="source-facts"></a>');
  });

  test("setStatus updates frontmatter.status only", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    setStatus(TEST_PROJECT, TEST_YM, TEST_SLUG, "analyzing");
    const doc = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(doc.frontmatter.status).toBe("analyzing");
  });

  test("setStatus persists updated_at", async () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const before = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG).frontmatter.updated_at;
    await Bun.sleep(10);
    setStatus(TEST_PROJECT, TEST_YM, TEST_SLUG, "ready");
    const after = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG).frontmatter.updated_at;
    expect(after).not.toBe(before);
  });

  test("readDoc on non-existent file throws", () => {
    expect(() => readDoc(TEST_PROJECT, TEST_YM, "nonexistent")).toThrow();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现骨架 + frontmatter 支持**

Create `.claude/scripts/lib/enhanced-doc-store.ts`:

```typescript
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import matter from "gray-matter";
import { prdDir, enhancedMd } from "./paths.ts";
import { generateSectionAnchor } from "./enhanced-doc-anchors.ts";
import type {
  EnhancedDoc,
  EnhancedFrontmatter,
  EnhancedStatus,
  SectionContent,
  PendingItem,
} from "./enhanced-doc-types.ts";

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
  migratedFromPlan?: boolean;
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
    migrated_from_plan: opts.migratedFromPlan ?? false,
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
    source_facts: null,           // TODO: Task 10 blob deref
    source_facts_ref: null,
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
  const fm = { ...(parsed.data as EnhancedFrontmatter), ...updates, updated_at: new Date().toISOString() };
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

// ---- 占位解析器（后续 Task 5-9 填充） ----
function parseOverview(_body: string): SectionContent[] { return []; }
function parseFunctional(_body: string): SectionContent[] { return []; }
function parseImagesSummary(_body: string): string { return ""; }
function parsePending(_body: string): PendingItem[] { return []; }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts`
Expected: PASS（6 test cases）

- [ ] **Step 5: 提交**

```bash
git add .claude/scripts/lib/enhanced-doc-store.ts .claude/scripts/__tests__/enhanced-doc-store.test.ts
git commit -m "feat(enhanced-doc): add store skeleton with initDoc/readDoc/setStatus"
```

---

## Task 5: set-section 写入某小节内容

**Files:**
- Modify: `.claude/scripts/lib/enhanced-doc-store.ts`
- Modify: `.claude/scripts/__tests__/enhanced-doc-store.test.ts`

**Spec anchor:** Part 3.1 CLI 表 `set-section`

- [ ] **Step 1: 写失败测试**

Append to `.claude/scripts/__tests__/enhanced-doc-store.test.ts`:

```typescript
import { setSection, addSection } from "../lib/enhanced-doc-store.ts";

describe("enhanced-doc-store: set-section", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test("setSection replaces content by anchor, preserves anchor", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const doc = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const anchor11 = findOverviewAnchor(doc, 1);  // s-1-1-xxxx
    setSection(TEST_PROJECT, TEST_YM, TEST_SLUG, anchor11, "业务侧新需求说明……");
    const doc2 = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const sec = doc2.overview.find(s => s.anchor === anchor11);
    expect(sec?.body.trim()).toBe("业务侧新需求说明……");
    expect(sec?.anchor).toBe(anchor11);  // anchor unchanged
  });

  test("setSection on unknown anchor throws", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(() =>
      setSection(TEST_PROJECT, TEST_YM, TEST_SLUG, "s-9-9-dead", "..."),
    ).toThrow(/anchor not found/i);
  });

  test("addSection creates new sub-section under §2 with fresh anchor", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const anchor = addSection(
      TEST_PROJECT, TEST_YM, TEST_SLUG,
      { parentLevel: 2, title: "新功能块", body: "字段 ..." },
    );
    expect(anchor).toMatch(/^s-2-\d+-[0-9a-f]{4}$/);
    const doc = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const sec = doc.functional.find(s => s.anchor === anchor);
    expect(sec?.title).toBe("新功能块");
    expect(sec?.body).toContain("字段");
  });
});

function findOverviewAnchor(doc, index: number): string {
  return doc.overview[index - 1].anchor;
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts -t set-section`
Expected: FAIL

- [ ] **Step 3: 实现 parseOverview / parseFunctional / setSection / addSection**

Replace the placeholder parsers and add new functions in `enhanced-doc-store.ts`:

```typescript
const OVERVIEW_BEGIN = "<!-- overview-begin -->";
const OVERVIEW_END = "<!-- overview-end -->";
const FUNCTIONAL_BEGIN = "<!-- functional-begin -->";
const FUNCTIONAL_END = "<!-- functional-end -->";

function extractBlock(body: string, begin: string, end: string): string {
  const i = body.indexOf(begin);
  const j = body.indexOf(end);
  if (i < 0 || j < 0) return "";
  return body.slice(i + begin.length, j);
}

function parseSections(block: string): SectionContent[] {
  // match `### {title} <a id="{anchor}"></a>\n\n{body}`
  const sections: SectionContent[] = [];
  const re = /^### (.+?) <a id="(s-\d+-\d+-[0-9a-f]{4})"><\/a>$([\s\S]*?)(?=^### |\Z)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    sections.push({ anchor: m[2], title: m[1].trim(), body: m[3].trim() });
  }
  return sections;
}

function parseOverview(body: string): SectionContent[] {
  return parseSections(extractBlock(body, OVERVIEW_BEGIN, OVERVIEW_END));
}

function parseFunctional(body: string): SectionContent[] {
  return parseSections(extractBlock(body, FUNCTIONAL_BEGIN, FUNCTIONAL_END));
}

function parseImagesSummary(body: string): string {
  return extractBlock(body, "<!-- images-summary-begin -->", "<!-- images-summary-end -->").trim();
}

export function setSection(
  project: string, yyyymm: string, slug: string,
  anchor: string, content: string,
): void {
  const docPath = enhancedMd(project, yyyymm, slug);
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  let newBody = parsed.content;
  const headingLine = new RegExp(`^### .+? <a id="${anchor}"><\\/a>$`, "m");
  const match = headingLine.exec(newBody);
  if (!match) throw new Error(`anchor not found: ${anchor}`);
  // Find the content range: from end-of-heading-line to next `### ` or next comment block
  const start = match.index + match[0].length;
  const afterRest = newBody.slice(start);
  const nextHeadingMatch = afterRest.match(/\n### /);
  const nextBlockMatch = afterRest.match(/\n<!-- \w+-end -->/);
  let endOffset = afterRest.length;
  for (const candidate of [nextHeadingMatch?.index, nextBlockMatch?.index]) {
    if (candidate !== undefined && candidate < endOffset) endOffset = candidate;
  }
  const before = newBody.slice(0, start);
  const after = newBody.slice(start + endOffset);
  newBody = `${before}\n\n${content.trim()}\n${after}`;
  const fm = { ...(parsed.data as EnhancedFrontmatter), updated_at: new Date().toISOString() };
  writeFileSync(docPath, matter.stringify(newBody, fm), "utf8");
}

export interface AddSectionOpts {
  parentLevel: 2 | 3;                 // 仅允许在 §2 / §3 下加
  title: string;
  body: string;
}

export function addSection(
  project: string, yyyymm: string, slug: string,
  opts: AddSectionOpts,
): string {
  const docPath = enhancedMd(project, yyyymm, slug);
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  const existing = opts.parentLevel === 2 ? parseFunctional(parsed.content) : parseOverview(parsed.content);
  const newIndex = existing.length + 1;
  const anchor = generateSectionAnchor(opts.parentLevel, newIndex);
  const snippet = `### ${opts.title} <a id="${anchor}"></a>\n\n${opts.body}\n\n`;
  const block = opts.parentLevel === 2 ? FUNCTIONAL_END : OVERVIEW_END;
  const newBody = parsed.content.replace(block, snippet + block);
  const fm = { ...(parsed.data as EnhancedFrontmatter), updated_at: new Date().toISOString() };
  writeFileSync(docPath, matter.stringify(newBody, fm), "utf8");
  return anchor;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts`
Expected: PASS（9 test cases 累计）

- [ ] **Step 5: 提交**

```bash
git add .claude/scripts/lib/enhanced-doc-store.ts .claude/scripts/__tests__/enhanced-doc-store.test.ts
git commit -m "feat(enhanced-doc): implement setSection/addSection with anchor preservation"
```

---

## Task 6: add-pending — 分配 Q 编号 + 插入脚注 + §4 Q 区块

**Files:**
- Modify: `.claude/scripts/lib/enhanced-doc-store.ts`
- Modify: `.claude/scripts/__tests__/enhanced-doc-store.test.ts`

**Spec anchor:** Part 1.1 Q 区块模板 / Part 1.5 Q 编号策略 / Part 2.3 回射自动回退

- [ ] **Step 1: 写失败测试**

Append to test file:

```typescript
import { addPending } from "../lib/enhanced-doc-store.ts";

describe("enhanced-doc-store: add-pending", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test("addPending increments q_counter and returns q id", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const doc = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const sectionAnchor = doc.overview[0].anchor;
    const qid = addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, {
      locationAnchor: sectionAnchor,
      locationLabel: "§1.1 背景 → 范围",
      question: "是否支持 Kafka？",
      recommended: "否",
      expected: "仅 Spark Thrift 2.x",
      severity: "pending_for_pm",
    });
    expect(qid).toBe("q1");
    const doc2 = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(doc2.frontmatter.q_counter).toBe(1);
    expect(doc2.frontmatter.pending_count).toBe(1);
    expect(doc2.pending).toHaveLength(1);
    expect(doc2.pending[0].id).toBe("q1");
    expect(doc2.pending[0].expected).toBe("仅 Spark Thrift 2.x");
    expect(doc2.pending[0].severity).toBe("pending_for_pm");
  });

  test("addPending second call yields q2 (monotonic)", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const a1 = addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    const a2 = addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    expect(a1).toBe("q1");
    expect(a2).toBe("q2");
  });

  test("addPending during status=analyzing auto-retreats to discussing with reentry_from", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    setStatus(TEST_PROJECT, TEST_YM, TEST_SLUG, "analyzing");
    addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    const doc = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(doc.frontmatter.status).toBe("discussing");
    expect(doc.frontmatter.reentry_from).toBe("analyzing");
  });

  test("addPending during status=writing records reentry_from=writing", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    setStatus(TEST_PROJECT, TEST_YM, TEST_SLUG, "writing");
    addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    const doc = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(doc.frontmatter.reentry_from).toBe("writing");
  });

  test("addPending on invalid location anchor throws", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(() =>
      addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, {
        ...sampleQ(),
        locationAnchor: "s-9-9-dead",
      }),
    ).toThrow(/location anchor not found/i);
  });
});

function sampleQ() {
  return {
    locationAnchor: "s-1",
    locationLabel: "§1 概述",
    question: "q?",
    recommended: "r",
    expected: "e",
    severity: "blocking_unknown" as const,
  };
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts -t add-pending`
Expected: FAIL

- [ ] **Step 3: 实现 addPending + parsePending**

Append to `enhanced-doc-store.ts`:

```typescript
import { generateQAnchor, isValidSectionAnchor } from "./enhanced-doc-anchors.ts";

const PENDING_BEGIN = "<!-- pending-begin -->";
const PENDING_END = "<!-- pending-end -->";

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

function parsePending(body: string): PendingItem[] {
  const block = extractBlock(body, PENDING_BEGIN, PENDING_END);
  const items: PendingItem[] = [];
  const re = /^### (Q\d+|<del>Q\d+<\/del>) <a id="(q\d+)"><\/a>([\s\S]*?)(?=^### |\Z)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const resolved = m[1].startsWith("<del>");
    const qBlockText = m[0] + m[3];
    const sevMatch = qBlockText.match(/<!-- severity: (\w+) -->/);
    items.push({
      id: m[2],
      location_anchor: matchCell(m[3], "位置", /#([^)]+)\)/) ?? "",
      location_label: matchCell(m[3], "位置", /\[([^\]]+)\]/) ?? "",
      question: matchCell(m[3], "问题") ?? "",
      status: (matchCell(m[3], "状态") ?? "待确认") as PendingStatus,
      recommended: matchCell(m[3], "推荐") ?? "",
      expected: matchCell(m[3], "预期") ?? "",
      answer: resolved ? matchCell(m[3], "回答") : null,
      severity: (sevMatch?.[1] ?? "blocking_unknown") as PendingSeverity,
      resolved_at: resolved ? (matchCell(m[3], "已解决") ?? null) : null,
    });
  }
  return items;
}

function matchCell(table: string, label: string, innerExtract?: RegExp): string | null {
  const line = table.match(new RegExp(`\\*\\*${label}\\*\\*\\s*\\|\\s*(.+)$`, "m"));
  if (!line) return null;
  const raw = line[1].trim();
  if (innerExtract) {
    const inner = raw.match(innerExtract);
    return inner ? inner[1] : null;
  }
  return raw;
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
  project: string, yyyymm: string, slug: string,
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
  // 1) 正文插脚注（§1 概述级暂不插，仅子节可插；top-level 锚点跳过脚注）
  let newBody = body;
  const anchorParsed = opts.locationAnchor.match(/^s-(\d+)-(\d+)-([0-9a-f]{4})$/);
  if (anchorParsed) {
    // locate heading line and append `[^Qn]` marker at end of its body段首行
    const headingRegex = new RegExp(`(^### .+? <a id="${opts.locationAnchor}"><\\/a>$)`, "m");
    newBody = newBody.replace(headingRegex, (_, h) => `${h}\n\n[^${qid}]`);
  }
  // 2) §4 追加 Q 区块
  newBody = newBody.replace(PENDING_END, `${renderQBlock(item)}\n\n${PENDING_END}`);
  // 3) frontmatter 更新
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts`
Expected: PASS（14 test cases 累计）

- [ ] **Step 5: 提交**

```bash
git add .claude/scripts/lib/enhanced-doc-store.ts .claude/scripts/__tests__/enhanced-doc-store.test.ts
git commit -m "feat(enhanced-doc): implement addPending with q_counter + reentry_from auto-retreat"
```

---

## Task 7: resolve — 套删除线 + 计数更新

**Files:**
- Modify: `.claude/scripts/lib/enhanced-doc-store.ts`
- Modify: `.claude/scripts/__tests__/enhanced-doc-store.test.ts`

**Spec anchor:** Part 1.3 解决状态可视化

- [ ] **Step 1: 写失败测试**

```typescript
import { resolvePending } from "../lib/enhanced-doc-store.ts";

describe("enhanced-doc-store: resolve", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test("resolvePending wraps Q block in <del>, updates counts", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const qid = addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    resolvePending(TEST_PROJECT, TEST_YM, TEST_SLUG, qid, { answer: "不支持 Kafka" });
    const doc = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(doc.frontmatter.pending_count).toBe(0);
    expect(doc.frontmatter.resolved_count).toBe(1);
    const raw = readFileSync(enhancedMd(TEST_PROJECT, TEST_YM, TEST_SLUG), "utf8");
    expect(raw).toContain(`<del>${qid.toUpperCase()}</del>`);
    expect(raw).toContain("不支持 Kafka");
  });

  test("resolvePending with asDefault increments defaulted_count", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const qid = addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    resolvePending(TEST_PROJECT, TEST_YM, TEST_SLUG, qid, { answer: "采用推荐", asDefault: true });
    const doc = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(doc.frontmatter.defaulted_count).toBe(1);
    expect(doc.pending[0].status).toBe("默认采用");
  });

  test("resolvePending on unknown q id throws", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(() =>
      resolvePending(TEST_PROJECT, TEST_YM, TEST_SLUG, "q99", { answer: "x" }),
    ).toThrow(/q99 not found/i);
  });

  test("resolvePending idempotent on already resolved throws", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const qid = addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    resolvePending(TEST_PROJECT, TEST_YM, TEST_SLUG, qid, { answer: "a" });
    expect(() => resolvePending(TEST_PROJECT, TEST_YM, TEST_SLUG, qid, { answer: "b" }))
      .toThrow(/already resolved/i);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts -t resolve`
Expected: FAIL

- [ ] **Step 3: 实现 resolvePending**

Append to `enhanced-doc-store.ts`:

```typescript
export interface ResolveOpts {
  answer: string;
  asDefault?: boolean;
}

export function resolvePending(
  project: string, yyyymm: string, slug: string,
  qid: string, opts: ResolveOpts,
): void {
  const docPath = enhancedMd(project, yyyymm, slug);
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  let newBody = parsed.content;
  const fm = { ...(parsed.data as EnhancedFrontmatter) };
  // locate Q block
  const headingRe = new RegExp(`^### (Q\\d+|<del>Q\\d+<\\/del>) <a id="${qid}"><\\/a>$`, "m");
  const hm = headingRe.exec(newBody);
  if (!hm) throw new Error(`${qid} not found`);
  if (hm[1].startsWith("<del>")) throw new Error(`${qid} already resolved`);
  // replace heading to wrap in <del>
  newBody = newBody.replace(hm[0], `### <del>${qid.toUpperCase()}</del> <a id="${qid}"></a>`);
  // find the table and append answer row + resolved-at row
  const tableStart = newBody.indexOf(hm[0]);
  const tableBlockEnd = newBody.indexOf("\n### ", tableStart + 1);
  const blockEnd = tableBlockEnd < 0 ? newBody.indexOf(PENDING_END, tableStart) : tableBlockEnd;
  const before = newBody.slice(0, blockEnd);
  const after = newBody.slice(blockEnd);
  const resolvedAt = new Date().toISOString();
  const statusLabel = opts.asDefault ? "默认采用" : "已解决";
  const newTableAppendix = `| **回答** | ${opts.answer} |\n| **已解决** | ${resolvedAt} |\n`;
  // update 状态 row from 待确认 → statusLabel
  const updatedBefore = before.replace(/\*\*状态\*\* \| 待确认 \|/, `**状态** | ${statusLabel} |`);
  newBody = `${updatedBefore}\n${newTableAppendix}${after}`;
  // replace inline [^qN] footnote with answer text
  const footnoteRe = new RegExp(`\\[\\^${qid}\\]`, "g");
  newBody = newBody.replace(footnoteRe, `*${opts.answer}*`);
  // counts
  fm.pending_count = Math.max(0, fm.pending_count - 1);
  fm.resolved_count += 1;
  if (opts.asDefault) fm.defaulted_count += 1;
  fm.updated_at = new Date().toISOString();
  writeFileSync(docPath, matter.stringify(newBody, fm), "utf8");
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts`
Expected: PASS（18 test cases 累计）

- [ ] **Step 5: 提交**

```bash
git add .claude/scripts/lib/enhanced-doc-store.ts .claude/scripts/__tests__/enhanced-doc-store.test.ts
git commit -m "feat(enhanced-doc): implement resolvePending with <del> wrap and count updates"
```

---

## Task 8: list-pending + compact

**Files:**
- Modify: `.claude/scripts/lib/enhanced-doc-store.ts`
- Modify: `.claude/scripts/__tests__/enhanced-doc-store.test.ts`

**Spec anchor:** Part 3.1 CLI 表 `list-pending` `compact`

- [ ] **Step 1: 写失败测试**

```typescript
import { listPending, compactDoc } from "../lib/enhanced-doc-store.ts";

describe("enhanced-doc-store: list-pending + compact", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test("listPending excludes resolved by default", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const q1 = addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    resolvePending(TEST_PROJECT, TEST_YM, TEST_SLUG, q1, { answer: "a" });
    const list = listPending(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe("q2");
  });

  test("listPending with includeResolved returns all", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const q1 = addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    resolvePending(TEST_PROJECT, TEST_YM, TEST_SLUG, q1, { answer: "a" });
    const all = listPending(TEST_PROJECT, TEST_YM, TEST_SLUG, { includeResolved: true });
    expect(all.length).toBe(2);
  });

  test("compactDoc archives resolved items to resolved.md when threshold exceeded", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    for (let i = 0; i < 3; i++) {
      const q = addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
      resolvePending(TEST_PROJECT, TEST_YM, TEST_SLUG, q, { answer: "a" });
    }
    const moved = compactDoc(TEST_PROJECT, TEST_YM, TEST_SLUG, { threshold: 2 });
    expect(moved).toBe(3);
    const resolvedPath = join(repoRoot(), "workspace", TEST_PROJECT, "prds", TEST_YM, TEST_SLUG, "resolved.md");
    expect(existsSync(resolvedPath)).toBe(true);
    const enhanced = readFileSync(enhancedMd(TEST_PROJECT, TEST_YM, TEST_SLUG), "utf8");
    expect(enhanced).not.toContain("<del>Q1</del>");
  });

  test("compactDoc skips when threshold not met", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const q = addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    resolvePending(TEST_PROJECT, TEST_YM, TEST_SLUG, q, { answer: "a" });
    const moved = compactDoc(TEST_PROJECT, TEST_YM, TEST_SLUG, { threshold: 50 });
    expect(moved).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts -t "list-pending\|compact"`
Expected: FAIL

- [ ] **Step 3: 实现 listPending + compactDoc**

```typescript
import { resolvedMd } from "./paths.ts";

export interface ListPendingOpts {
  includeResolved?: boolean;
}

export function listPending(
  project: string, yyyymm: string, slug: string,
  opts: ListPendingOpts = {},
): PendingItem[] {
  const doc = readDoc(project, yyyymm, slug);
  if (opts.includeResolved) return doc.pending;
  return doc.pending.filter(p => p.status === "待确认");
}

export interface CompactOpts {
  threshold?: number;  // default 50
}

export function compactDoc(
  project: string, yyyymm: string, slug: string,
  opts: CompactOpts = {},
): number {
  const threshold = opts.threshold ?? 50;
  const docPath = enhancedMd(project, yyyymm, slug);
  const raw = readFileSync(docPath, "utf8");
  const parsed = matter(raw);
  const body = parsed.content;
  // count <del> Q blocks
  const delMatches = body.match(/^### <del>Q\d+<\/del> /gm) ?? [];
  if (delMatches.length < threshold) return 0;
  // extract <del> blocks
  const delRe = /^### <del>Q\d+<\/del>[\s\S]*?(?=^### |\s*<!-- pending-end -->)/gm;
  const archived = body.match(delRe) ?? [];
  // write resolved.md (append mode)
  const resolvedPath = resolvedMd(project, yyyymm, slug);
  const existing = existsSync(resolvedPath) ? readFileSync(resolvedPath, "utf8") : "# Resolved Q Archive\n\n";
  writeFileSync(resolvedPath, existing + archived.join("\n") + "\n", "utf8");
  // remove from enhanced.md
  const newBody = body.replace(delRe, "");
  writeFileSync(docPath, matter.stringify(newBody, parsed.data), "utf8");
  return archived.length;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts`
Expected: PASS（22 test cases 累计）

- [ ] **Step 5: 提交**

```bash
git add -A .claude/scripts/lib/enhanced-doc-store.ts .claude/scripts/__tests__/enhanced-doc-store.test.ts
git commit -m "feat(enhanced-doc): implement listPending + compactDoc with threshold"
```

---

## Task 9: validate — 6 项完整性检查

**Files:**
- Modify: `.claude/scripts/lib/enhanced-doc-store.ts`
- Modify: `.claude/scripts/__tests__/enhanced-doc-store.test.ts`

**Spec anchor:** Part 3.2 锚点完整性检查

- [ ] **Step 1: 写失败测试**

```typescript
import { validateDoc } from "../lib/enhanced-doc-store.ts";

describe("enhanced-doc-store: validate", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test("validateDoc on fresh doc reports no issues", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const r = validateDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  test("validateDoc catches pending_count mismatch", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    writeFrontmatter(TEST_PROJECT, TEST_YM, TEST_SLUG, { pending_count: 99 });
    const r = validateDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.includes("pending_count"))).toBe(true);
  });

  test("validateDoc catches q_counter regression", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    writeFrontmatter(TEST_PROJECT, TEST_YM, TEST_SLUG, { q_counter: 1 });  // less than max
    const r = validateDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.includes("q_counter"))).toBe(true);
  });

  test("validateDoc catches orphan q footnote", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    // manually corrupt: inject [^q99] footnote without Q block
    const p = enhancedMd(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const raw = readFileSync(p, "utf8");
    writeFileSync(p, raw.replace("## 2. 功能细节", "## 2. 功能细节\n\n[^q99]"), "utf8");
    const r = validateDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.includes("orphan") && i.includes("q99"))).toBe(true);
  });

  test("validateDoc catches broken location anchor in Q", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, {
      ...sampleQ(),
      locationAnchor: "s-1",  // valid format
    });
    // now manually delete the s-1 anchor
    const p = enhancedMd(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const raw = readFileSync(p, "utf8");
    writeFileSync(p, raw.replace('<a id="s-1"></a>', ""), "utf8");
    const r = validateDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.includes("broken location"))).toBe(true);
  });

  test("validateDoc with requireZeroPending flag", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    const r = validateDoc(TEST_PROJECT, TEST_YM, TEST_SLUG, { requireZeroPending: true });
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.includes("pending_count > 0"))).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts -t validate`
Expected: FAIL

- [ ] **Step 3: 实现 validateDoc**

```typescript
export interface ValidateOpts {
  requireZeroPending?: boolean;
  checkSourceRefs?: string[];   // 传入 source_ref 数组，校验每个都能解析
}

export interface ValidateResult {
  ok: boolean;
  issues: string[];
}

export function validateDoc(
  project: string, yyyymm: string, slug: string,
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

  // 2) anchor regex check
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

  // 5) pending_count / resolved_count match §4 content
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

  // optional gates
  if (opts.requireZeroPending && fm.pending_count > 0) {
    issues.push(`pending_count > 0 (requireZeroPending)`);
  }
  if (opts.checkSourceRefs) {
    for (const ref of opts.checkSourceRefs) {
      const [fileKey, anchor] = ref.split("#");
      if (fileKey !== "enhanced") continue;  // only validate enhanced refs here
      if (!body.includes(`<a id="${anchor}"></a>`)) {
        issues.push(`source_ref unresolved: ${ref}`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts`
Expected: PASS（28 test cases 累计）

- [ ] **Step 5: 提交**

```bash
git add -A .claude/scripts/lib/enhanced-doc-store.ts .claude/scripts/__tests__/enhanced-doc-store.test.ts
git commit -m "feat(enhanced-doc): implement validateDoc with 6 integrity checks"
```

---

## Task 10: source-facts 外溢 blob

**Files:**
- Modify: `.claude/scripts/lib/enhanced-doc-store.ts`
- Modify: `.claude/scripts/__tests__/enhanced-doc-store.test.ts`

**Spec anchor:** Part 6 风险表（blob 外溢）

- [ ] **Step 1: 写失败测试**

```typescript
import { setSourceFacts, readSourceFacts } from "../lib/enhanced-doc-store.ts";

describe("enhanced-doc-store: source-facts blob", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test("small source-facts inlined in enhanced.md", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const small = { fields: [{ name: "a", type: "string", path: "x.ts", note: "" }], routes: [], state_enums: [], permissions: [], api_signatures: [] };
    setSourceFacts(TEST_PROJECT, TEST_YM, TEST_SLUG, small);
    const read = readSourceFacts(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(read.fields.length).toBe(1);
    const raw = readFileSync(enhancedMd(TEST_PROJECT, TEST_YM, TEST_SLUG), "utf8");
    expect(raw).not.toContain("$ref");
  });

  test("large source-facts (>64KB) externalized to source-facts.json", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const big = {
      fields: Array.from({ length: 2000 }, (_, i) => ({
        name: `f${i}`, type: "string", path: `file${i}.ts`, note: "x".repeat(50),
      })),
      routes: [], state_enums: [], permissions: [], api_signatures: [],
    };
    setSourceFacts(TEST_PROJECT, TEST_YM, TEST_SLUG, big);
    const raw = readFileSync(enhancedMd(TEST_PROJECT, TEST_YM, TEST_SLUG), "utf8");
    expect(raw).toContain("$ref");
    const jsonPath = join(repoRoot(), "workspace", TEST_PROJECT, "prds", TEST_YM, TEST_SLUG, "source-facts.json");
    expect(existsSync(jsonPath)).toBe(true);
    const read = readSourceFacts(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(read.fields.length).toBe(2000);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts -t source-facts`
Expected: FAIL

- [ ] **Step 3: 实现 setSourceFacts / readSourceFacts**

```typescript
import { SOURCE_FACTS_BLOB_THRESHOLD } from "./enhanced-doc-types.ts";
import { sourceFactsJson } from "./paths.ts";

const SOURCE_FACTS_BEGIN = "<!-- source-facts-begin -->";
const SOURCE_FACTS_END = "<!-- source-facts-end -->";

export function setSourceFacts(
  project: string, yyyymm: string, slug: string,
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
  writeFileSync(docPath, matter.stringify(newBody, parsed.data), "utf8");
}

export function readSourceFacts(
  project: string, yyyymm: string, slug: string,
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
```

- [ ] **Step 4: 更新 readDoc 使用 readSourceFacts**

In `readDoc()` replace the `source_facts: null` line with:

```typescript
source_facts: hasSourceFacts(parsed.content) ? readSourceFacts(project, yyyymm, slug) : null,
source_facts_ref: extractSourceFactsRef(parsed.content),
```

And add helpers:

```typescript
function hasSourceFacts(body: string): boolean {
  const block = extractBlock(body, SOURCE_FACTS_BEGIN, SOURCE_FACTS_END).trim();
  return block.length > 0 && !block.includes("_TODO_");
}

function extractSourceFactsRef(body: string): string | null {
  const block = extractBlock(body, SOURCE_FACTS_BEGIN, SOURCE_FACTS_END);
  const m = block.match(/"\$ref":\s*"([^"]+)"/);
  return m ? m[1] : null;
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-store.test.ts`
Expected: PASS（30 test cases 累计）

- [ ] **Step 6: 提交**

```bash
git add -A .claude/scripts/lib/enhanced-doc-store.ts .claude/scripts/__tests__/enhanced-doc-store.test.ts
git commit -m "feat(enhanced-doc): setSourceFacts/readSourceFacts with >64KB blob externalization"
```

---

## Task 11: migrate-plan — 旧 plan.md 到 enhanced.md 迁移器

**Files:**
- Create: `.claude/scripts/lib/enhanced-doc-migrator.ts`
- Test: `.claude/scripts/__tests__/enhanced-doc-migrator.test.ts`

**Spec anchor:** Part 5.2 迁移脚本

- [ ] **Step 1: 写失败测试（基于 fixture 旧 plan.md）**

Create `.claude/scripts/__tests__/fixtures/legacy-plan-sample.md`:

```markdown
---
plan_version: 2
status: ready
project: dataAssets
prd_path: workspace/dataAssets/prds/202604/sample.md
blocking_count: 0
pending_count: 1
auto_defaulted_count: 2
handoff_mode: current
created_at: 2026-04-20T10:00:00Z
updated_at: 2026-04-24T10:00:00Z
knowledge_dropped: []
---

## §1 需求摘要

<!-- summary:begin -->
### 背景
历史系统已不满足需求。

### 痛点
性能差。

### 目标
提升吞吐 3 倍。

### 成功标准
P99 < 200ms。
<!-- summary:end -->

## §3 澄清问答清单

```json
[
  {"id":"Q1","dimension":"数据源","location":"全局层","question":"支持 Kafka？","severity":"blocking_unknown","recommended_option":{"description":"否"},"user_answer":"否"},
  {"id":"Q2","dimension":"权限","location":"功能层","question":"导出需权限？","severity":"blocking_unknown","recommended_option":{"description":"是"},"user_answer":"是"}
]
```

## §4 自动默认记录

- data_source: spark (defaulted from knowledge/overview.md)
- tz: Asia/Shanghai (defaulted)

## §6 待定清单

- [ ] **Q3**: PDF 导出分页？— AI 推荐：否
```

Create `.claude/scripts/__tests__/enhanced-doc-migrator.test.ts`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { readFileSync, existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { migratePlanToEnhanced } from "../lib/enhanced-doc-migrator.ts";
import { readDoc, initDoc } from "../lib/enhanced-doc-store.ts";
import { repoRoot, plansDir, enhancedMd } from "../lib/paths.ts";

const P = "test-d1-migrator";
const YM = "202604";
const SLUG = "sample";

function cleanup() {
  const ws = join(repoRoot(), "workspace", P);
  if (existsSync(ws)) rmSync(ws, { recursive: true, force: true });
}

function seedLegacyPlan() {
  const dir = plansDir(P, YM);
  mkdirSync(dir, { recursive: true });
  const src = readFileSync(join(import.meta.dirname, "fixtures/legacy-plan-sample.md"), "utf8");
  writeFileSync(join(dir, `${SLUG}.plan.md`), src, "utf8");
}

describe("migrate-plan", () => {
  beforeEach(() => { cleanup(); seedLegacyPlan(); });
  afterEach(cleanup);

  test("dryRun produces report without writing enhanced.md", () => {
    const report = migratePlanToEnhanced(P, YM, SLUG, { dryRun: true });
    expect(report.qCount).toBe(3);
    expect(report.migratedFromPlan).toBe(true);
    expect(existsSync(enhancedMd(P, YM, SLUG))).toBe(false);
  });

  test("real migration writes enhanced.md with migrated_from_plan=true", () => {
    migratePlanToEnhanced(P, YM, SLUG, { dryRun: false });
    const doc = readDoc(P, YM, SLUG);
    expect(doc.frontmatter.migrated_from_plan).toBe(true);
    expect(doc.frontmatter.status).toBe("discussing");
    expect(doc.frontmatter.q_counter).toBeGreaterThanOrEqual(3);
    expect(doc.pending.length).toBe(3);
    expect(doc.pending.find(p => p.id === "q1" || p.id === "Q1")?.status).toBe("已解决");
    expect(doc.pending.find(p => p.id === "q3" || p.id === "Q3")?.status).toBe("待确认");
    // §1 overview should contain 4 sub-sections with inherited text
    expect(doc.overview.length).toBe(4);
    expect(doc.overview[0].body).toContain("历史系统");
    // §2 / §3 / Appendix A left empty for next-run backfill
    expect(doc.functional.length).toBe(0);
    expect(doc.images_summary).toBe("");
    expect(doc.source_facts).toBeNull();
  });

  test("source plan.md is moved to legacy backup", () => {
    migratePlanToEnhanced(P, YM, SLUG, { dryRun: false });
    const src = join(plansDir(P, YM), `${SLUG}.plan.md`);
    expect(existsSync(src)).toBe(false);
    const backup = join(repoRoot(), "workspace", P, ".temp", "legacy-plan", `${SLUG}.plan.md`);
    expect(existsSync(backup)).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-migrator.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 migratePlanToEnhanced**

Create `.claude/scripts/lib/enhanced-doc-migrator.ts`:

```typescript
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import matter from "gray-matter";
import { plansDir, repoRoot, prdDir } from "./paths.ts";
import { initDoc, writeFrontmatter, setSection, addPending, resolvePending } from "./enhanced-doc-store.ts";
import type { PendingSeverity } from "./enhanced-doc-types.ts";

export interface MigrateReport {
  qCount: number;
  migratedFromPlan: boolean;
  overviewPreserved: boolean;
  pendingBreakdown: { waiting: number; resolved: number; defaulted: number };
}

export interface MigrateOpts {
  dryRun?: boolean;
}

interface LegacyClarify {
  id: string;
  dimension: string;
  location: string;
  question: string;
  severity: string;
  recommended_option: { description: string } | string;
  user_answer?: string;
}

export function migratePlanToEnhanced(
  project: string, yyyymm: string, slug: string,
  opts: MigrateOpts = {},
): MigrateReport {
  const planPath = join(plansDir(project, yyyymm), `${slug}.plan.md`);
  if (!existsSync(planPath)) throw new Error(`plan not found: ${planPath}`);
  const raw = readFileSync(planPath, "utf8");
  const parsed = matter(raw);

  // parse §1 4 子节
  const summaryBlock = extractSummary(parsed.content);
  // parse §3 JSON fence
  const clarifies = extractClarifies(parsed.content);
  // parse §6 pending checkboxes
  const pending = extractPendingCheckboxes(parsed.content);

  const report: MigrateReport = {
    qCount: clarifies.length + pending.length,
    migratedFromPlan: true,
    overviewPreserved: Boolean(summaryBlock),
    pendingBreakdown: {
      waiting: pending.length,
      resolved: clarifies.filter(c => c.user_answer).length,
      defaulted: 0,
    },
  };

  if (opts.dryRun) return report;

  // write enhanced.md
  initDoc(project, yyyymm, slug, { migratedFromPlan: true });
  if (summaryBlock) {
    setSection(project, yyyymm, slug, findFirstAnchor(project, yyyymm, slug, 1, 1), summaryBlock.background);
    setSection(project, yyyymm, slug, findFirstAnchor(project, yyyymm, slug, 1, 2), summaryBlock.painpoint);
    setSection(project, yyyymm, slug, findFirstAnchor(project, yyyymm, slug, 1, 3), summaryBlock.goal);
    setSection(project, yyyymm, slug, findFirstAnchor(project, yyyymm, slug, 1, 4), summaryBlock.criteria);
  }

  // migrate clarifies
  for (const c of clarifies) {
    const qid = addPending(project, yyyymm, slug, {
      locationAnchor: "s-1",
      locationLabel: `（迁入自 plan.md §3）${c.dimension} — ${c.location}`,
      question: c.question,
      recommended: typeof c.recommended_option === "string" ? c.recommended_option : c.recommended_option.description,
      expected: "—（迁入前未记录）",
      severity: c.severity as PendingSeverity,
    });
    if (c.user_answer) {
      resolvePending(project, yyyymm, slug, qid, { answer: c.user_answer });
    }
  }

  // migrate §6 pending
  for (const p of pending) {
    addPending(project, yyyymm, slug, {
      locationAnchor: "s-1",
      locationLabel: `（迁入自 plan.md §6）${p.location}`,
      question: p.question,
      recommended: p.recommended,
      expected: "—（迁入前未记录）",
      severity: "pending_for_pm",
    });
  }

  // move legacy plan to backup
  const backupDir = join(repoRoot(), "workspace", project, ".temp", "legacy-plan");
  mkdirSync(backupDir, { recursive: true });
  renameSync(planPath, join(backupDir, `${slug}.plan.md`));

  return report;
}

function extractSummary(body: string): { background: string; painpoint: string; goal: string; criteria: string } | null {
  const m = body.match(/<!-- summary:begin -->([\s\S]+?)<!-- summary:end -->/);
  if (!m) return null;
  const block = m[1];
  const pick = (label: string) => {
    const re = new RegExp(`### ${label}\\s*\\n+([\\s\\S]*?)(?=\\n### |$)`, "m");
    const mm = block.match(re);
    return mm ? mm[1].trim() : "";
  };
  return {
    background: pick("背景"),
    painpoint: pick("痛点"),
    goal: pick("目标"),
    criteria: pick("成功标准"),
  };
}

function extractClarifies(body: string): LegacyClarify[] {
  const m = body.match(/##\s+§3[^\n]*\n+```json\s*\n([\s\S]+?)\n```/);
  if (!m) return [];
  try { return JSON.parse(m[1]) as LegacyClarify[]; } catch { return []; }
}

function extractPendingCheckboxes(body: string): Array<{ location: string; question: string; recommended: string }> {
  const m = body.match(/##\s+§6[^\n]*\n([\s\S]*?)(?=\n##\s|$)/);
  if (!m) return [];
  const lines = m[1].split("\n").filter(l => /^- \[ \]/.test(l));
  return lines.map(l => {
    const parts = l.match(/\*\*(.+?)\*\*:?\s*(.+?)(?:\s+—\s+AI 推荐[：:]\s*(.+))?$/);
    if (!parts) return { location: "", question: l, recommended: "" };
    return { location: parts[1], question: parts[2], recommended: parts[3] ?? "" };
  });
}

function findFirstAnchor(project: string, yyyymm: string, slug: string, level: number, index: number): string {
  // read current doc, find the anchor for level-index sub-section
  // (helper to avoid hardcoding uuid)
  const raw = readFileSync(prdDir(project, yyyymm, slug) + "/enhanced.md", "utf8");
  const re = new RegExp(`<a id="(s-${level}-${index}-[0-9a-f]{4})">`);
  const m = raw.match(re);
  if (!m) throw new Error(`anchor s-${level}-${index}-* not found`);
  return m[1];
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun test .claude/scripts/__tests__/enhanced-doc-migrator.test.ts`
Expected: PASS（3 test cases）

- [ ] **Step 5: 提交**

```bash
git add -A .claude/scripts/lib/enhanced-doc-migrator.ts .claude/scripts/__tests__/enhanced-doc-migrator.test.ts .claude/scripts/__tests__/fixtures/legacy-plan-sample.md
git commit -m "feat(enhanced-doc): migratePlanToEnhanced with dry-run + legacy backup"
```

---

## Task 12: CLI wire-up — discuss.ts 新子命令

**Files:**
- Modify: `.claude/scripts/discuss.ts`
- Test: `.claude/scripts/__tests__/discuss-cli.test.ts`（新增 CLI 级集成测试）

**Spec anchor:** Part 3.1 CLI 合约

- [ ] **Step 1: 列出当前 discuss.ts 已有子命令**

Run: `bun .claude/scripts/discuss.ts --help`
记录现有子命令列表。新子命令列表：

```
init          --project --prd-slug --yyyymm [--migrated-from-plan]
read          --project --prd-slug --yyyymm [--raw]
set-status    --project --prd-slug --yyyymm --status <s>
set-section   --project --prd-slug --yyyymm --anchor <a> --content <str>
add-section   --project --prd-slug --yyyymm --parent-level <2|3> --title <s> --body <s>
set-source-facts --project --prd-slug --yyyymm --content <json>
add-pending   --project --prd-slug --yyyymm --location <anchor> --label <s> --question <s> --recommended <s> --expected <s> --severity <s>
resolve       --project --prd-slug --yyyymm --id <qid> --answer <s> [--as-default]
list-pending  --project --prd-slug --yyyymm [--format json|table] [--include-resolved]
compact       --project --prd-slug --yyyymm [--threshold N]
validate      --project --prd-slug --yyyymm [--require-zero-pending] [--check-source-refs <csv>]
migrate-plan  --project [--prd-slug] [--yyyymm] [--dry-run]
```

注意：保留所有现有子命令（`append-clarify`, `set-repo-consent` 等），不删，供 D2 前回归兜底。

- [ ] **Step 2: 写 CLI 集成测试**

Create `.claude/scripts/__tests__/discuss-cli.test.ts`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import { join } from "node:path";
import { existsSync, rmSync } from "node:fs";
import { repoRoot } from "../lib/paths.ts";

const P = "test-d1-cli";
const YM = "202604";
const SLUG = "cli-slug";
const CLI = join(repoRoot(), ".claude/scripts/discuss.ts");

function cleanup() {
  const ws = join(repoRoot(), "workspace", P);
  if (existsSync(ws)) rmSync(ws, { recursive: true, force: true });
}

describe("discuss CLI — new subcommands", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test("init creates enhanced.md", async () => {
    const r = await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    expect(r.exitCode).toBe(0);
    expect(existsSync(join(repoRoot(), "workspace", P, "prds", YM, SLUG, "enhanced.md"))).toBe(true);
  });

  test("read --raw preserves $ref", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    const r = await $`bun ${CLI} read --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --raw`.quiet();
    expect(r.exitCode).toBe(0);
    const out = JSON.parse(r.stdout.toString());
    expect(out.frontmatter.status).toBe("discussing");
  });

  test("add-pending + resolve + list-pending", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    const add = await $`bun ${CLI} add-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --location s-1 --label "§1" --question "q?" --recommended "r" --expected "e" --severity blocking_unknown`.quiet();
    const qid = JSON.parse(add.stdout.toString()).id;
    expect(qid).toBe("q1");
    const list1 = await $`bun ${CLI} list-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --format json`.quiet();
    expect(JSON.parse(list1.stdout.toString()).length).toBe(1);
    await $`bun ${CLI} resolve --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --id ${qid} --answer "final"`.quiet();
    const list2 = await $`bun ${CLI} list-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --format json`.quiet();
    expect(JSON.parse(list2.stdout.toString()).length).toBe(0);
  });

  test("validate --require-zero-pending returns non-zero exit with pending", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    await $`bun ${CLI} add-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --location s-1 --label x --question q --recommended r --expected e --severity blocking_unknown`.quiet();
    const r = await $`bun ${CLI} validate --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --require-zero-pending`.nothrow().quiet();
    expect(r.exitCode).not.toBe(0);
  });

  test("set-status transitions", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    await $`bun ${CLI} set-status --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --status analyzing`.quiet();
    const r = await $`bun ${CLI} read --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    expect(JSON.parse(r.stdout.toString()).frontmatter.status).toBe("analyzing");
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `bun test .claude/scripts/__tests__/discuss-cli.test.ts`
Expected: FAIL（新命令未注册）

- [ ] **Step 4: 注册新子命令到 discuss.ts**

Modify `.claude/scripts/discuss.ts`：

1. 顶部新增 import：
   ```typescript
   import {
     initDoc, readDoc, setStatus, setSection, addSection, setSourceFacts,
     addPending, resolvePending, listPending, compactDoc, validateDoc,
   } from "./lib/enhanced-doc-store.ts";
   import { migratePlanToEnhanced } from "./lib/enhanced-doc-migrator.ts";
   ```

2. 在 `program.command(...)` 注册链末尾追加 12 条新命令（保留所有现有命令），以 `init` 为例：

   ```typescript
   program
     .command("init")
     .description("创建 enhanced.md 骨架")
     .requiredOption("--project <p>", "项目名")
     .requiredOption("--yyyymm <ym>", "月份")
     .requiredOption("--prd-slug <slug>", "PRD slug")
     .option("--migrated-from-plan", "从 plan.md 迁移")
     .action((opts) => {
       initDoc(opts.project, opts.yyyymm, opts.prdSlug, { migratedFromPlan: opts.migratedFromPlan });
       process.stdout.write(JSON.stringify({ ok: true }) + "\n");
     });
   ```

   类似实现 `read / set-status / set-section / add-section / set-source-facts / add-pending / resolve / list-pending / compact / validate / migrate-plan`。每条按 Step 1 的签名表实现；所有命令 stdout 输出 JSON，失败时 process.exit(非 0)。

3. `validate` 在 issue 非空时 process.exit(1)；`--require-zero-pending` 单独用 exit code 3：

   ```typescript
   program.command("validate")
     .requiredOption("--project <p>")
     .requiredOption("--yyyymm <ym>")
     .requiredOption("--prd-slug <slug>")
     .option("--require-zero-pending")
     .option("--check-source-refs <csv>")
     .action((opts) => {
       const r = validateDoc(opts.project, opts.yyyymm, opts.prdSlug, {
         requireZeroPending: !!opts.requireZeroPending,
         checkSourceRefs: opts.checkSourceRefs?.split(","),
       });
       process.stdout.write(JSON.stringify(r) + "\n");
       if (!r.ok) process.exit(r.issues.some(i => i.includes("requireZeroPending")) ? 3 : 1);
     });
   ```

- [ ] **Step 5: 运行集成测试**

Run: `bun test .claude/scripts/__tests__/discuss-cli.test.ts`
Expected: PASS（5 test cases）

- [ ] **Step 6: 全量回归**

Run: `bun test .claude/scripts/__tests__`
Expected: 全绿

- [ ] **Step 7: 提交**

```bash
git add -A .claude/scripts/discuss.ts .claude/scripts/__tests__/discuss-cli.test.ts
git commit -m "feat(discuss-cli): register 12 new subcommands for enhanced.md workflow"
```

---

## Task 13: 端到端 smoke — 手工验证完整 resolve 循环

**Files:**
- 无代码变更；手工验证脚本产物

- [ ] **Step 1: 创建 smoke 目录**

```bash
rm -rf workspace/smoke-d1
mkdir -p workspace/smoke-d1/prds/202604
```

- [ ] **Step 2: init + add 3 pending**

```bash
bun .claude/scripts/discuss.ts init --project smoke-d1 --yyyymm 202604 --prd-slug demo
bun .claude/scripts/discuss.ts add-pending --project smoke-d1 --yyyymm 202604 --prd-slug demo \
  --location s-1 --label "§1 概述" --question "是否支持 Kafka？" --recommended "否" --expected "仅 Spark Thrift 2.x" --severity blocking_unknown
bun .claude/scripts/discuss.ts add-pending --project smoke-d1 --yyyymm 202604 --prd-slug demo \
  --location s-1 --label "§1 概述" --question "历史数据迁移策略？" --recommended "非破坏性" --expected "读旧写新" --severity blocking_unknown
bun .claude/scripts/discuss.ts add-pending --project smoke-d1 --yyyymm 202604 --prd-slug demo \
  --location s-1 --label "§1 概述" --question "PDF 分页？" --recommended "否" --expected "单页长图" --severity pending_for_pm
```

Expected stdout：每条返回 `{"id":"q1"}` / `{"id":"q2"}` / `{"id":"q3"}`

- [ ] **Step 3: 检查 enhanced.md 结构**

```bash
cat workspace/smoke-d1/prds/202604/demo/enhanced.md
```

Expected 可见：3 个 Q 区块（Q1/Q2/Q3）、pending_count=3、q_counter=3、正文 §1 末有 `[^q1]` `[^q2]` `[^q3]`

- [ ] **Step 4: list-pending 过滤**

```bash
bun .claude/scripts/discuss.ts list-pending --project smoke-d1 --yyyymm 202604 --prd-slug demo --format json
```

Expected：数组长度 3

- [ ] **Step 5: resolve + 再 list**

```bash
bun .claude/scripts/discuss.ts resolve --project smoke-d1 --yyyymm 202604 --prd-slug demo --id q1 --answer "不支持 Kafka"
bun .claude/scripts/discuss.ts resolve --project smoke-d1 --yyyymm 202604 --prd-slug demo --id q2 --answer "按推荐" --as-default
bun .claude/scripts/discuss.ts list-pending --project smoke-d1 --yyyymm 202604 --prd-slug demo --format json
```

Expected：剩 1 条（q3）；defaulted_count=1

- [ ] **Step 6: validate 通过 + 硬门禁失败**

```bash
bun .claude/scripts/discuss.ts validate --project smoke-d1 --yyyymm 202604 --prd-slug demo
echo "EXIT=$?"
bun .claude/scripts/discuss.ts validate --project smoke-d1 --yyyymm 202604 --prd-slug demo --require-zero-pending
echo "EXIT=$?"
```

Expected：第一条 EXIT=0；第二条 EXIT=3（因 q3 still pending）

- [ ] **Step 7: 状态切换**

```bash
bun .claude/scripts/discuss.ts set-status --project smoke-d1 --yyyymm 202604 --prd-slug demo --status analyzing
bun .claude/scripts/discuss.ts add-pending --project smoke-d1 --yyyymm 202604 --prd-slug demo \
  --location s-1 --label test --question "late Q" --recommended x --expected y --severity blocking_unknown
```

Expected：add-pending stdout `{"id":"q4"}`；frontmatter.status 回到 discussing，reentry_from=analyzing

验证：

```bash
bun .claude/scripts/discuss.ts read --project smoke-d1 --yyyymm 202604 --prd-slug demo | jq '.frontmatter | {status, reentry_from}'
```

Expected：`{"status":"discussing","reentry_from":"analyzing"}`

- [ ] **Step 8: 清理 smoke**

```bash
rm -rf workspace/smoke-d1
```

- [ ] **Step 9: 提交 plan 完结标记**

```bash
# no code change; commit just to mark smoke pass
git commit --allow-empty -m "test(phase-d1): manual smoke passed for full add/resolve/validate/status cycle"
```

---

## Phase D1 出口检查

- [ ] `bun test .claude/scripts/__tests__` 全绿（含新增 ~40 test cases）
- [ ] `bun test` 全仓单测全绿
- [ ] `bun .claude/scripts/discuss.ts --help` 列出所有新子命令
- [ ] Smoke 验证完整 resolve 循环
- [ ] `workspace/smoke-*` 目录已清理
- [ ] 老 `.claude/scripts/lib/discuss.ts`（plan.md 版）未动，可回归

---

## 后续（非本 phase）

Phase D1 落地后：

- **Phase D2**：workflow 合并（改写 `03-discuss.md`、删 `04-transform.md` / `05-enhance.md`、编号前移；新增 `source-facts-agent`；改 analyze/writer/reviewer agents）
- **Phase D3**：下游切换 + 真实迁移（analyze/write/review 入口门禁 / F16 / Writer 回射 / progress migrate-session / grep 零检查）

Phase D2/D3 的 plan 文件待 D1 落地后基于实际 CLI/store 行为细化。
