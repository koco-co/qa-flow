# knowledge-keeper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付 `knowledge-keeper` skill（CLI + SKILL.md），实施 Phase 0 spec §5 的 7 个 actions，落地 W2 置信度分级与 R3 分层懒加载，向前兼容 Phase 0 骨架。

**Architecture:** CLI + Skill 双层。CLI（`.claude/scripts/knowledge-keeper.ts`）负责纯文件 I/O 与 JSON stdout；核心纯函数抽到 `lib/knowledge.ts` 便于单测；Skill（`.claude/skills/knowledge-keeper/SKILL.md`）负责对话分支、AskUserQuestion、置信度分流。测试通过 `node:test` + `execFileSync` 混合单元/集成。

**Tech Stack:** TypeScript + Bun + Commander CLI + `node:test` + YAML frontmatter（自实现最小解析器，对齐 rule-loader 无外部依赖风格）。

**Spec:** [`../specs/2026-04-17-knowledge-keeper-design.md`](../specs/2026-04-17-knowledge-keeper-design.md)

**Roadmap:** [`../../refactor-roadmap.md`](../../refactor-roadmap.md)

---

## 文件布局

| 文件 | 职责 |
|---|---|
| `.claude/scripts/lib/paths.ts`（修改） | 新增 `knowledgeDir` / `knowledgePath` / `knowledgeModulesDir` / `knowledgePitfallsDir` |
| `.claude/scripts/lib/knowledge.ts`（新建） | 纯函数：YAML frontmatter parse/serialize、content JSON 校验、_index.md 渲染、pitfall 检索、lint 规则、confidence gate、Phase 0 auto-fix |
| `.claude/scripts/knowledge-keeper.ts`（新建） | Commander CLI，7 个 action handlers |
| `.claude/scripts/__tests__/lib/paths.test.ts`（修改） | 追加 knowledge path helper 用例 |
| `.claude/scripts/__tests__/lib/knowledge.test.ts`（新建） | 单元测试 lib 内所有纯函数 |
| `.claude/scripts/__tests__/knowledge-keeper.test.ts`（新建） | 集成测试：真实 CLI 调用 + tmpdir fixture |
| `.claude/skills/knowledge-keeper/SKILL.md`（新建） | Skill 定义 + 对话流程 |

---

## 共享符号表（跨任务一致性）

所有任务共享以下类型/函数签名，后续 Task 不得改动：

```typescript
// lib/knowledge.ts

export interface Frontmatter {
  title: string;
  type: "overview" | "term" | "module" | "pitfall";
  tags: string[];
  confidence: "high" | "medium" | "low";
  source: string;
  updated: string;
}

export interface ParsedFile {
  frontmatter: Frontmatter | null;
  body: string;
}

export interface TermRow {
  term: string;
  zh: string;
  desc: string;
  alias: string;
}

export interface IndexEntry {
  name: string;
  title: string;
  tags: string[];
  updated: string;
  confidence: string;
}

export interface IndexData {
  modules: IndexEntry[];
  pitfalls: IndexEntry[];
  overview_updated: string;
  terms_updated: string;
  terms_count: number;
}

export interface ContentTerm {
  term: string;
  zh: string;
  desc: string;
  alias: string;
}

export interface ContentOverview {
  section: string;
  body: string;
  mode: "append" | "replace";
}

export interface ContentModule {
  name: string;
  title: string;
  tags: string[];
  body: string;
  source: string;
}

export interface ContentPitfall extends ContentModule {}

export interface LintError {
  file: string;
  rule: string;
  detail: string;
}

export interface LintResult {
  errors: LintError[];
  warnings: LintError[];
}

// Function signatures
export function parseFrontmatter(raw: string): ParsedFile;
export function serializeFrontmatter(fm: Frontmatter): string;
export function parseContentJson<T>(type: string, raw: string): T;
export function renderIndex(project: string, data: IndexData): string;
export function searchPitfalls(query: string, files: { name: string; tags: string[] }[]): { name: string; match_by: string[] }[];
export function lintChecks(project: string, knowledgeDirPath: string): LintResult;
export function confidenceGate(confidence: string, confirmed: boolean): { allowed: boolean; reason?: string };
export function autoFixFrontmatter(rawContent: string, filePath: string, today: string): { fixed: boolean; content: string };
export function todayIso(): string;  // returns "YYYY-MM-DD"

// lib/paths.ts (new additions)
export function knowledgeDir(project: string): string;
export function knowledgePath(project: string, ...segments: string[]): string;
export function knowledgeModulesDir(project: string): string;
export function knowledgePitfallsDir(project: string): string;
```

---

### Task 1: paths.ts 新增 knowledge helpers

**Files:**
- Modify: `.claude/scripts/lib/paths.ts`
- Modify: `.claude/scripts/__tests__/lib/paths.test.ts`

- [ ] **Step 1: 追加 paths.test.ts 失败用例**

在文件底部（`describe("projectRulesDir", ...)` 之后）追加：

```typescript
import {
  knowledgeDir,
  knowledgePath,
  knowledgeModulesDir,
  knowledgePitfallsDir,
} from "../../lib/paths.ts";

describe("knowledgeDir", () => {
  it("returns <workspace>/<project>/knowledge", () => {
    const dir = knowledgeDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/knowledge"), `got: ${dir}`);
  });
});

describe("knowledgePath", () => {
  it("joins segments under knowledge dir", () => {
    const p = knowledgePath("dataAssets", "modules", "data-source.md");
    assert.ok(p.endsWith("workspace/dataAssets/knowledge/modules/data-source.md"), `got: ${p}`);
  });

  it("returns knowledge dir itself when no segments", () => {
    const p = knowledgePath("dataAssets");
    assert.ok(p.endsWith("workspace/dataAssets/knowledge"), `got: ${p}`);
  });
});

describe("knowledgeModulesDir", () => {
  it("returns <knowledge>/modules", () => {
    const dir = knowledgeModulesDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/knowledge/modules"), `got: ${dir}`);
  });
});

describe("knowledgePitfallsDir", () => {
  it("returns <knowledge>/pitfalls", () => {
    const dir = knowledgePitfallsDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/knowledge/pitfalls"), `got: ${dir}`);
  });
});
```

注意 import 需加入文件顶部 import 清单（与 `projectRulesDir` 同一行位置）。

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/paths.test.ts`
Expected: 4 个新 `describe` 块对应用例均失败（knowledgeDir is not exported）

- [ ] **Step 3: 实现 paths.ts 新增函数**

在 `projectRulesDir` 之后插入：

```typescript
export function knowledgeDir(project: string): string {
  return join(projectDir(project), "knowledge");
}

export function knowledgePath(project: string, ...segments: string[]): string {
  return join(knowledgeDir(project), ...segments);
}

export function knowledgeModulesDir(project: string): string {
  return join(knowledgeDir(project), "modules");
}

export function knowledgePitfallsDir(project: string): string {
  return join(knowledgeDir(project), "pitfalls");
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/paths.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/lib/paths.ts .claude/scripts/__tests__/lib/paths.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): add knowledge path helpers to paths.ts"
```

---

### Task 2: lib/knowledge.ts — frontmatter parse/serialize

**Files:**
- Create: `.claude/scripts/lib/knowledge.ts`
- Create: `.claude/scripts/__tests__/lib/knowledge.test.ts`

- [ ] **Step 1: 创建 knowledge.test.ts 并写 frontmatter parse 失败用例**

```typescript
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseFrontmatter,
  serializeFrontmatter,
  type Frontmatter,
} from "../../lib/knowledge.ts";

describe("parseFrontmatter", () => {
  it("parses a valid frontmatter block", () => {
    const raw = `---
title: 测试标题
type: module
tags: [a, b, c]
confidence: high
source: foo/bar.ts:42
updated: 2026-04-17
---

正文内容
`;
    const result = parseFrontmatter(raw);
    assert.ok(result.frontmatter, "frontmatter must be parsed");
    assert.equal(result.frontmatter!.title, "测试标题");
    assert.equal(result.frontmatter!.type, "module");
    assert.deepEqual(result.frontmatter!.tags, ["a", "b", "c"]);
    assert.equal(result.frontmatter!.confidence, "high");
    assert.equal(result.frontmatter!.source, "foo/bar.ts:42");
    assert.equal(result.frontmatter!.updated, "2026-04-17");
    assert.equal(result.body.trim(), "正文内容");
  });

  it("returns null frontmatter when no --- delimiters", () => {
    const raw = "# 只有正文\n没有 frontmatter\n";
    const result = parseFrontmatter(raw);
    assert.equal(result.frontmatter, null);
    assert.equal(result.body, raw);
  });

  it("handles empty tags array", () => {
    const raw = `---
title: t
type: pitfall
tags: []
confidence: medium
source: ""
updated: 2026-04-17
---
body`;
    const result = parseFrontmatter(raw);
    assert.deepEqual(result.frontmatter!.tags, []);
    assert.equal(result.frontmatter!.source, "");
  });

  it("returns null on malformed frontmatter missing closing ---", () => {
    const raw = `---
title: 破损
type: module
`;
    const result = parseFrontmatter(raw);
    assert.equal(result.frontmatter, null);
  });
});

describe("serializeFrontmatter", () => {
  it("round-trips a full frontmatter", () => {
    const fm: Frontmatter = {
      title: "x",
      type: "term",
      tags: ["y", "z"],
      confidence: "high",
      source: "a/b.ts",
      updated: "2026-04-17",
    };
    const out = serializeFrontmatter(fm);
    assert.ok(out.startsWith("---\n"));
    assert.ok(out.includes("title: x"));
    assert.ok(out.includes("tags: [y, z]"));
    assert.ok(out.endsWith("---\n"));

    const reparsed = parseFrontmatter(out + "\ntail");
    assert.deepEqual(reparsed.frontmatter, fm);
  });

  it("serializes empty tags as []", () => {
    const fm: Frontmatter = {
      title: "a",
      type: "module",
      tags: [],
      confidence: "medium",
      source: "",
      updated: "2026-04-17",
    };
    const out = serializeFrontmatter(fm);
    assert.ok(out.includes("tags: []"));
    assert.ok(out.includes('source: ""'));
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: "Cannot find module '../../lib/knowledge.ts'"

- [ ] **Step 3: 创建 lib/knowledge.ts 骨架与 parseFrontmatter / serializeFrontmatter 实现**

```typescript
// lib/knowledge.ts

export interface Frontmatter {
  title: string;
  type: "overview" | "term" | "module" | "pitfall";
  tags: string[];
  confidence: "high" | "medium" | "low";
  source: string;
  updated: string;
}

export interface ParsedFile {
  frontmatter: Frontmatter | null;
  body: string;
}

export function parseFrontmatter(raw: string): ParsedFile {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) {
    return { frontmatter: null, body: raw };
  }
  const lines = raw.split("\n");
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) {
    return { frontmatter: null, body: raw };
  }

  const fmLines = lines.slice(1, endIdx);
  const body = lines.slice(endIdx + 1).join("\n");

  const fm: Partial<Frontmatter> = {};
  for (const line of fmLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === "tags") {
      // Parse [a, b, c] form
      if (value.startsWith("[") && value.endsWith("]")) {
        const inner = value.slice(1, -1).trim();
        if (inner === "") {
          fm.tags = [];
        } else {
          fm.tags = inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
        }
      } else {
        fm.tags = [];
      }
    } else if (key === "title") {
      fm.title = value;
    } else if (key === "type") {
      fm.type = value as Frontmatter["type"];
    } else if (key === "confidence") {
      fm.confidence = value as Frontmatter["confidence"];
    } else if (key === "source") {
      fm.source = value;
    } else if (key === "updated") {
      fm.updated = value;
    }
  }

  // Validate required fields
  if (
    typeof fm.title !== "string" ||
    typeof fm.type !== "string" ||
    !Array.isArray(fm.tags) ||
    typeof fm.confidence !== "string" ||
    typeof fm.source !== "string" ||
    typeof fm.updated !== "string"
  ) {
    return { frontmatter: null, body: raw };
  }

  return { frontmatter: fm as Frontmatter, body };
}

export function serializeFrontmatter(fm: Frontmatter): string {
  const lines = [
    "---",
    `title: ${fm.title}`,
    `type: ${fm.type}`,
    `tags: [${fm.tags.join(", ")}]`,
    `confidence: ${fm.confidence}`,
    `source: ${fm.source === "" ? '""' : fm.source}`,
    `updated: ${fm.updated}`,
    "---",
    "",
  ];
  return lines.join("\n");
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: 6 个用例全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/lib/knowledge.ts .claude/scripts/__tests__/lib/knowledge.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): add frontmatter parse/serialize in lib/knowledge.ts"
```

---

### Task 3: lib/knowledge.ts — content JSON schema 校验

**Files:**
- Modify: `.claude/scripts/lib/knowledge.ts`
- Modify: `.claude/scripts/__tests__/lib/knowledge.test.ts`

- [ ] **Step 1: 追加失败用例**

在 knowledge.test.ts 底部追加：

```typescript
import {
  parseContentJson,
  type ContentTerm,
  type ContentOverview,
  type ContentModule,
  type ContentPitfall,
} from "../../lib/knowledge.ts";

describe("parseContentJson", () => {
  it("parses valid term content", () => {
    const raw = '{"term":"QI","zh":"质量项","desc":"data quality entity","alias":"quality-item"}';
    const result = parseContentJson<ContentTerm>("term", raw);
    assert.equal(result.term, "QI");
    assert.equal(result.zh, "质量项");
    assert.equal(result.desc, "data quality entity");
    assert.equal(result.alias, "quality-item");
  });

  it("parses valid overview content", () => {
    const raw = '{"section":"产品定位","body":"数据资产平台","mode":"replace"}';
    const result = parseContentJson<ContentOverview>("overview", raw);
    assert.equal(result.section, "产品定位");
    assert.equal(result.mode, "replace");
  });

  it("parses valid module content with empty arrays/strings", () => {
    const raw = '{"name":"data-source","title":"数据源接入","tags":[],"body":"...","source":""}';
    const result = parseContentJson<ContentModule>("module", raw);
    assert.equal(result.name, "data-source");
    assert.deepEqual(result.tags, []);
    assert.equal(result.source, "");
  });

  it("parses valid pitfall content", () => {
    const raw = '{"name":"dom-drift","title":"DOM 漂移","tags":["ui"],"body":"...","source":"x.ts:1"}';
    const result = parseContentJson<ContentPitfall>("pitfall", raw);
    assert.equal(result.name, "dom-drift");
    assert.deepEqual(result.tags, ["ui"]);
  });

  it("throws on invalid JSON", () => {
    assert.throws(
      () => parseContentJson("term", "{not json}"),
      /Invalid JSON/,
    );
  });

  it("throws on term missing required field", () => {
    assert.throws(
      () => parseContentJson("term", '{"term":"x"}'),
      /Missing required field/,
    );
  });

  it("throws on unknown type", () => {
    assert.throws(
      () => parseContentJson("bogus", "{}"),
      /Unknown type/,
    );
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: 新增 7 个失败。

- [ ] **Step 3: 在 lib/knowledge.ts 追加实现**

```typescript
// lib/knowledge.ts 追加

export interface ContentTerm {
  term: string;
  zh: string;
  desc: string;
  alias: string;
}

export interface ContentOverview {
  section: string;
  body: string;
  mode: "append" | "replace";
}

export interface ContentModule {
  name: string;
  title: string;
  tags: string[];
  body: string;
  source: string;
}

export interface ContentPitfall extends ContentModule {}

const TERM_FIELDS: (keyof ContentTerm)[] = ["term", "zh", "desc", "alias"];
const OVERVIEW_FIELDS: (keyof ContentOverview)[] = ["section", "body", "mode"];
const MODULE_FIELDS: (keyof ContentModule)[] = ["name", "title", "tags", "body", "source"];

export function parseContentJson<T>(type: string, raw: string): T {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid JSON for type=${type}`);
  }

  let required: string[];
  if (type === "term") required = TERM_FIELDS as string[];
  else if (type === "overview") required = OVERVIEW_FIELDS as string[];
  else if (type === "module" || type === "pitfall") required = MODULE_FIELDS as string[];
  else throw new Error(`Unknown type: ${type}`);

  for (const field of required) {
    if (!(field in obj)) {
      throw new Error(`Missing required field "${field}" for type=${type}`);
    }
  }

  // Type-specific validation
  if (type === "overview") {
    const mode = obj.mode as string;
    if (mode !== "append" && mode !== "replace") {
      throw new Error(`Invalid mode "${mode}" for overview; must be append|replace`);
    }
  }
  if ((type === "module" || type === "pitfall") && !Array.isArray(obj.tags)) {
    throw new Error(`Field "tags" must be an array for type=${type}`);
  }

  return obj as T;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/lib/knowledge.ts .claude/scripts/__tests__/lib/knowledge.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): add content JSON schema validator"
```

---

### Task 4: lib/knowledge.ts — renderIndex

**Files:**
- Modify: `.claude/scripts/lib/knowledge.ts`
- Modify: `.claude/scripts/__tests__/lib/knowledge.test.ts`

- [ ] **Step 1: 追加失败用例**

```typescript
import { renderIndex, type IndexData } from "../../lib/knowledge.ts";

describe("renderIndex", () => {
  it("renders header + core + empty modules/pitfalls", () => {
    const data: IndexData = {
      modules: [],
      pitfalls: [],
      overview_updated: "2026-04-17",
      terms_updated: "2026-04-17",
      terms_count: 0,
    };
    const out = renderIndex("dataAssets", data);
    assert.ok(out.includes("# dataAssets Knowledge Index"));
    assert.ok(out.includes("## Core"));
    assert.ok(out.includes("## Modules"));
    assert.ok(out.includes("## Pitfalls"));
    assert.ok(out.includes("<!-- last-indexed: "));
  });

  it("lists module entries sorted by name", () => {
    const data: IndexData = {
      modules: [
        { name: "quality", title: "质量管理", tags: ["q"], updated: "2026-04-16", confidence: "medium" },
        { name: "data-source", title: "数据源", tags: ["ds"], updated: "2026-04-17", confidence: "high" },
      ],
      pitfalls: [],
      overview_updated: "2026-04-17",
      terms_updated: "2026-04-17",
      terms_count: 3,
    };
    const out = renderIndex("p", data);
    const dsIdx = out.indexOf("data-source.md");
    const qIdx = out.indexOf("quality.md");
    assert.ok(dsIdx > 0 && qIdx > 0, "both modules listed");
    assert.ok(dsIdx < qIdx, "modules sorted alphabetically");
    assert.ok(out.includes("[tags: ds]"));
    assert.ok(out.includes("confidence: high"));
  });

  it("lists pitfalls correctly", () => {
    const data: IndexData = {
      modules: [],
      pitfalls: [
        { name: "ui-drift", title: "UI 漂移", tags: ["ui", "playwright"], updated: "2026-04-15", confidence: "high" },
      ],
      overview_updated: "2026-04-17",
      terms_updated: "2026-04-17",
      terms_count: 0,
    };
    const out = renderIndex("p", data);
    assert.ok(out.includes("[ui-drift.md](pitfalls/ui-drift.md)"));
    assert.ok(out.includes("[tags: ui, playwright]"));
  });

  it("terms_count appears in Core block", () => {
    const data: IndexData = {
      modules: [],
      pitfalls: [],
      overview_updated: "2026-04-17",
      terms_updated: "2026-04-17",
      terms_count: 7,
    };
    const out = renderIndex("p", data);
    assert.ok(out.includes("术语表（7 条"), `got: ${out}`);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: 4 个新用例失败（未导出）。

- [ ] **Step 3: 实现 renderIndex**

追加到 lib/knowledge.ts：

```typescript
export interface IndexEntry {
  name: string;
  title: string;
  tags: string[];
  updated: string;
  confidence: string;
}

export interface IndexData {
  modules: IndexEntry[];
  pitfalls: IndexEntry[];
  overview_updated: string;
  terms_updated: string;
  terms_count: number;
}

function renderIndexEntry(subdir: "modules" | "pitfalls", entry: IndexEntry): string {
  const tagsStr = entry.tags.length ? ` [tags: ${entry.tags.join(", ")}]` : "";
  return `- [${entry.name}.md](${subdir}/${entry.name}.md) — ${entry.title}${tagsStr} (updated: ${entry.updated}, confidence: ${entry.confidence})`;
}

export function renderIndex(project: string, data: IndexData): string {
  const sortedModules = [...data.modules].sort((a, b) => a.name.localeCompare(b.name));
  const sortedPitfalls = [...data.pitfalls].sort((a, b) => a.name.localeCompare(b.name));

  const modulesBody = sortedModules.length
    ? sortedModules.map((e) => renderIndexEntry("modules", e)).join("\n")
    : "_（暂无）_";
  const pitfallsBody = sortedPitfalls.length
    ? sortedPitfalls.map((e) => renderIndexEntry("pitfalls", e)).join("\n")
    : "_（暂无）_";

  const nowIso = new Date().toISOString();

  return `# ${project} Knowledge Index

> 由 knowledge-keeper 自动维护，请勿手动编辑。

## Core

- [overview.md](overview.md) — 产品定位 + 主流程（updated: ${data.overview_updated}）
- [terms.md](terms.md) — 术语表（${data.terms_count} 条，updated: ${data.terms_updated}）

## Modules

${modulesBody}

## Pitfalls

${pitfallsBody}

<!-- last-indexed: ${nowIso} -->
`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/lib/knowledge.ts .claude/scripts/__tests__/lib/knowledge.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): add renderIndex for _index.md generation"
```

---

### Task 5: lib/knowledge.ts — pitfall 检索

**Files:**
- Modify: `.claude/scripts/lib/knowledge.ts`
- Modify: `.claude/scripts/__tests__/lib/knowledge.test.ts`

- [ ] **Step 1: 追加失败用例**

```typescript
import { searchPitfalls } from "../../lib/knowledge.ts";

describe("searchPitfalls", () => {
  const files = [
    { name: "ui-dom-drift", tags: ["ui", "playwright"] },
    { name: "auth-token-expire", tags: ["auth"] },
    { name: "data-source-timeout", tags: ["ds", "timeout"] },
  ];

  it("matches by filename substring (case-insensitive)", () => {
    const res = searchPitfalls("DOM", files);
    assert.equal(res.length, 1);
    assert.equal(res[0].name, "ui-dom-drift");
    assert.ok(res[0].match_by.includes("filename"));
  });

  it("matches by tag substring", () => {
    const res = searchPitfalls("auth", files);
    assert.equal(res.length, 1);
    assert.equal(res[0].name, "auth-token-expire");
  });

  it("returns both filename and tag matches deduplicated", () => {
    const res = searchPitfalls("timeout", files);
    // filename match: data-source-timeout; tag match: data-source-timeout (tag includes timeout)
    assert.equal(res.length, 1);
    assert.deepEqual(res[0].match_by.sort(), ["filename", "tags"]);
  });

  it("returns empty when no match", () => {
    const res = searchPitfalls("xyzzy", files);
    assert.deepEqual(res, []);
  });

  it("returns empty on empty query", () => {
    const res = searchPitfalls("", files);
    // Empty query matches everything by the "includes" semantics, so normalize:
    // Spec expects empty string -> empty result (guard)
    assert.deepEqual(res, []);
  });

  it("matches multiple files", () => {
    const res = searchPitfalls("ui", [
      { name: "ui-a", tags: [] },
      { name: "ui-b", tags: [] },
      { name: "other", tags: [] },
    ]);
    assert.equal(res.length, 2);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: 新用例失败。

- [ ] **Step 3: 实现 searchPitfalls**

追加到 lib/knowledge.ts：

```typescript
export function searchPitfalls(
  query: string,
  files: { name: string; tags: string[] }[],
): { name: string; match_by: string[] }[] {
  if (query === "") return [];
  const q = query.toLowerCase();
  const hits = new Map<string, Set<string>>();

  for (const f of files) {
    if (f.name.toLowerCase().includes(q)) {
      if (!hits.has(f.name)) hits.set(f.name, new Set());
      hits.get(f.name)!.add("filename");
    }
    if (f.tags.some((t) => t.toLowerCase().includes(q))) {
      if (!hits.has(f.name)) hits.set(f.name, new Set());
      hits.get(f.name)!.add("tags");
    }
  }

  return Array.from(hits.entries()).map(([name, by]) => ({
    name,
    match_by: Array.from(by).sort(),
  }));
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/lib/knowledge.ts .claude/scripts/__tests__/lib/knowledge.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): add pitfall search algorithm"
```

---

### Task 6: lib/knowledge.ts — confidenceGate

**Files:**
- Modify: `.claude/scripts/lib/knowledge.ts`
- Modify: `.claude/scripts/__tests__/lib/knowledge.test.ts`

- [ ] **Step 1: 追加失败用例**

```typescript
import { confidenceGate } from "../../lib/knowledge.ts";

describe("confidenceGate", () => {
  it("allows high without --confirmed", () => {
    const r = confidenceGate("high", false);
    assert.equal(r.allowed, true);
  });

  it("allows high with --confirmed (harmless redundancy)", () => {
    const r = confidenceGate("high", true);
    assert.equal(r.allowed, true);
  });

  it("rejects medium without --confirmed", () => {
    const r = confidenceGate("medium", false);
    assert.equal(r.allowed, false);
    assert.match(r.reason ?? "", /requires --confirmed/);
  });

  it("allows medium with --confirmed", () => {
    const r = confidenceGate("medium", true);
    assert.equal(r.allowed, true);
  });

  it("rejects low always (even with --confirmed)", () => {
    assert.equal(confidenceGate("low", false).allowed, false);
    assert.equal(confidenceGate("low", true).allowed, false);
  });

  it("rejects unknown confidence", () => {
    const r = confidenceGate("bogus", true);
    assert.equal(r.allowed, false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: 失败。

- [ ] **Step 3: 实现 confidenceGate**

```typescript
export function confidenceGate(
  confidence: string,
  confirmed: boolean,
): { allowed: boolean; reason?: string } {
  if (confidence === "high") return { allowed: true };
  if (confidence === "low") {
    return {
      allowed: false,
      reason: "Low confidence is forbidden; upgrade to medium in skill layer",
    };
  }
  if (confidence === "medium") {
    if (confirmed) return { allowed: true };
    return {
      allowed: false,
      reason: "Non-high confidence requires --confirmed flag",
    };
  }
  return { allowed: false, reason: `Unknown confidence: ${confidence}` };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/lib/knowledge.ts .claude/scripts/__tests__/lib/knowledge.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): add confidence gate logic"
```

---

### Task 7: lib/knowledge.ts — autoFixFrontmatter

**Files:**
- Modify: `.claude/scripts/lib/knowledge.ts`
- Modify: `.claude/scripts/__tests__/lib/knowledge.test.ts`

- [ ] **Step 1: 追加失败用例**

```typescript
import { autoFixFrontmatter } from "../../lib/knowledge.ts";

describe("autoFixFrontmatter", () => {
  it("injects minimal frontmatter into a phase-0 template module file", () => {
    const raw = `# 某模块标题

> 由 knowledge-keeper skill（阶段 1 实施后）维护。

模块正文。
`;
    const result = autoFixFrontmatter(raw, "/path/workspace/p/knowledge/modules/foo.md", "2026-04-17");
    assert.equal(result.fixed, true);
    assert.ok(result.content.startsWith("---\n"));
    assert.ok(result.content.includes("title: 某模块标题"));
    assert.ok(result.content.includes("type: module"));
    assert.ok(result.content.includes("tags: []"));
    assert.ok(result.content.includes("confidence: high"));
    assert.ok(result.content.includes("updated: 2026-04-17"));
  });

  it("does not modify file that already has frontmatter", () => {
    const raw = `---
title: 已有
type: module
tags: [x]
confidence: high
source: ""
updated: 2026-04-17
---

body`;
    const result = autoFixFrontmatter(raw, "/w/p/knowledge/modules/foo.md", "2099-01-01");
    assert.equal(result.fixed, false);
    assert.equal(result.content, raw);
  });

  it("infers type=pitfall from path", () => {
    const raw = "# 坑标题\n正文\n";
    const result = autoFixFrontmatter(raw, "/w/p/knowledge/pitfalls/bad.md", "2026-04-17");
    assert.equal(result.fixed, true);
    assert.ok(result.content.includes("type: pitfall"));
  });

  it("infers type=overview for overview.md", () => {
    const raw = "# X 业务概览\n\n正文\n";
    const result = autoFixFrontmatter(raw, "/w/p/knowledge/overview.md", "2026-04-17");
    assert.equal(result.fixed, true);
    assert.ok(result.content.includes("type: overview"));
  });

  it("infers type=term for terms.md", () => {
    const raw = "# 术语表\n\n| 术语 | 中文 |\n";
    const result = autoFixFrontmatter(raw, "/w/p/knowledge/terms.md", "2026-04-17");
    assert.equal(result.fixed, true);
    assert.ok(result.content.includes("type: term"));
  });

  it("falls back to filename when no H1 present", () => {
    const raw = "没有 H1 的正文\n";
    const result = autoFixFrontmatter(raw, "/w/p/knowledge/modules/my-module.md", "2026-04-17");
    assert.equal(result.fixed, true);
    assert.ok(result.content.includes("title: my-module"));
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: 失败。

- [ ] **Step 3: 实现 autoFixFrontmatter**

```typescript
export function autoFixFrontmatter(
  rawContent: string,
  filePath: string,
  today: string,
): { fixed: boolean; content: string } {
  const parsed = parseFrontmatter(rawContent);
  if (parsed.frontmatter !== null) {
    return { fixed: false, content: rawContent };
  }

  // Infer type from path
  let type: Frontmatter["type"];
  if (filePath.includes("/modules/")) type = "module";
  else if (filePath.includes("/pitfalls/")) type = "pitfall";
  else if (filePath.endsWith("overview.md")) type = "overview";
  else if (filePath.endsWith("terms.md")) type = "term";
  else type = "module"; // fallback

  // Extract title from H1 or fallback to filename
  let title = "";
  const h1Match = rawContent.match(/^#\s+(.+)$/m);
  if (h1Match) {
    title = h1Match[1].trim();
  } else {
    const segments = filePath.split("/");
    title = segments[segments.length - 1].replace(/\.md$/, "");
  }

  const fm: Frontmatter = {
    title,
    type,
    tags: [],
    confidence: "high",
    source: "",
    updated: today,
  };

  const content = serializeFrontmatter(fm) + "\n" + rawContent;
  return { fixed: true, content };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/lib/knowledge.ts .claude/scripts/__tests__/lib/knowledge.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): add phase-0 frontmatter auto-fix"
```

---

### Task 8: lib/knowledge.ts — lintChecks

**Files:**
- Modify: `.claude/scripts/lib/knowledge.ts`
- Modify: `.claude/scripts/__tests__/lib/knowledge.test.ts`

- [ ] **Step 1: 追加失败用例（使用 tmpdir fixture）**

```typescript
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before } from "node:test";
import { lintChecks } from "../../lib/knowledge.ts";

describe("lintChecks", () => {
  const TMP = join(tmpdir(), `kk-lint-test-${process.pid}`);
  const knowledgeDirPath = join(TMP, "knowledge");

  before(() => {
    mkdirSync(join(knowledgeDirPath, "modules"), { recursive: true });
    mkdirSync(join(knowledgeDirPath, "pitfalls"), { recursive: true });
  });
  after(() => {
    try { rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("reports missing frontmatter field as error", () => {
    writeFileSync(
      join(knowledgeDirPath, "modules", "broken.md"),
      `---
type: module
tags: []
confidence: high
source: ""
updated: 2026-04-17
---
body`,
    );
    // Generate a minimal _index.md so orphan check doesn't false-positive
    writeFileSync(
      join(knowledgeDirPath, "_index.md"),
      "# p Knowledge Index\n\n- [broken.md](modules/broken.md)\n",
    );
    const result = lintChecks("p", knowledgeDirPath);
    assert.ok(result.errors.some((e) => e.rule === "missing-frontmatter-field"),
      `expected missing-frontmatter-field error, got errors: ${JSON.stringify(result.errors)}`);
    rmSync(join(knowledgeDirPath, "modules", "broken.md"));
  });

  it("reports type mismatch as error", () => {
    writeFileSync(
      join(knowledgeDirPath, "modules", "wrong-type.md"),
      `---
title: x
type: pitfall
tags: []
confidence: high
source: ""
updated: 2026-04-17
---
body`,
    );
    writeFileSync(
      join(knowledgeDirPath, "_index.md"),
      "# p\n\n- [wrong-type.md](modules/wrong-type.md)\n",
    );
    const result = lintChecks("p", knowledgeDirPath);
    assert.ok(result.errors.some((e) => e.rule === "type-dir-mismatch"));
    rmSync(join(knowledgeDirPath, "modules", "wrong-type.md"));
  });

  it("reports non-kebab-case name as error", () => {
    writeFileSync(
      join(knowledgeDirPath, "modules", "Bad_Name.md"),
      `---
title: bad
type: module
tags: []
confidence: high
source: ""
updated: 2026-04-17
---
body`,
    );
    writeFileSync(
      join(knowledgeDirPath, "_index.md"),
      "# p\n\n- [Bad_Name.md](modules/Bad_Name.md)\n",
    );
    const result = lintChecks("p", knowledgeDirPath);
    assert.ok(result.errors.some((e) => e.rule === "non-kebab-case-name"));
    rmSync(join(knowledgeDirPath, "modules", "Bad_Name.md"));
  });

  it("reports empty tags as warning", () => {
    writeFileSync(
      join(knowledgeDirPath, "modules", "notag.md"),
      `---
title: x
type: module
tags: []
confidence: high
source: "src.ts"
updated: 2026-04-17
---
body`,
    );
    writeFileSync(
      join(knowledgeDirPath, "_index.md"),
      "# p\n\n- [notag.md](modules/notag.md)\n",
    );
    const result = lintChecks("p", knowledgeDirPath);
    assert.equal(result.errors.length, 0);
    assert.ok(result.warnings.some((w) => w.rule === "empty-tags"));
    rmSync(join(knowledgeDirPath, "modules", "notag.md"));
  });

  it("reports empty source as warning", () => {
    writeFileSync(
      join(knowledgeDirPath, "modules", "nosrc.md"),
      `---
title: x
type: module
tags: [a]
confidence: high
source: ""
updated: 2026-04-17
---
body`,
    );
    writeFileSync(
      join(knowledgeDirPath, "_index.md"),
      "# p\n\n- [nosrc.md](modules/nosrc.md)\n",
    );
    const result = lintChecks("p", knowledgeDirPath);
    assert.ok(result.warnings.some((w) => w.rule === "empty-source"));
    rmSync(join(knowledgeDirPath, "modules", "nosrc.md"));
  });

  it("reports orphan file (present but not in _index.md) as warning", () => {
    writeFileSync(
      join(knowledgeDirPath, "modules", "orphan.md"),
      `---
title: orphan
type: module
tags: [a]
confidence: high
source: "x"
updated: 2026-04-17
---
body`,
    );
    writeFileSync(
      join(knowledgeDirPath, "_index.md"),
      "# p Knowledge Index\n\n## Modules\n_（暂无）_\n",
    );
    const result = lintChecks("p", knowledgeDirPath);
    assert.ok(result.warnings.some((w) => w.rule === "orphan-file"));
    rmSync(join(knowledgeDirPath, "modules", "orphan.md"));
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: lintChecks 未导出，6 个用例失败。

- [ ] **Step 3: 实现 lintChecks**

```typescript
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

export interface LintError {
  file: string;
  rule: string;
  detail: string;
}

export interface LintResult {
  errors: LintError[];
  warnings: LintError[];
}

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function checkKebabCase(fileBase: string): boolean {
  const name = fileBase.replace(/^private-/, "");
  return KEBAB_RE.test(name);
}

function listMd(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".md"));
}

export function lintChecks(project: string, knowledgeDirPath: string): LintResult {
  const errors: LintError[] = [];
  const warnings: LintError[] = [];

  const indexPath = join(knowledgeDirPath, "_index.md");
  const indexContent = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";

  const check = (subdir: "modules" | "pitfalls", expectedType: "module" | "pitfall") => {
    const dir = join(knowledgeDirPath, subdir);
    for (const fname of listMd(dir)) {
      const relPath = `${subdir}/${fname}`;
      const raw = readFileSync(join(dir, fname), "utf8");
      const parsed = parseFrontmatter(raw);

      const base = basename(fname, ".md");
      if (!checkKebabCase(base)) {
        errors.push({ file: relPath, rule: "non-kebab-case-name", detail: base });
      }

      if (parsed.frontmatter === null) {
        errors.push({ file: relPath, rule: "missing-frontmatter-field", detail: "all fields" });
        continue;
      }
      const fm = parsed.frontmatter;
      for (const field of ["title", "type", "confidence", "updated"] as const) {
        if (!fm[field]) {
          errors.push({ file: relPath, rule: "missing-frontmatter-field", detail: field });
        }
      }
      if (fm.type !== expectedType) {
        errors.push({
          file: relPath,
          rule: "type-dir-mismatch",
          detail: `expected ${expectedType}, got ${fm.type}`,
        });
      }
      if (fm.tags.length === 0) {
        warnings.push({ file: relPath, rule: "empty-tags", detail: "" });
      }
      if (fm.source === "") {
        warnings.push({ file: relPath, rule: "empty-source", detail: "" });
      }
      if (!indexContent.includes(fname)) {
        warnings.push({ file: relPath, rule: "orphan-file", detail: "not listed in _index.md" });
      }
    }
  };

  check("modules", "module");
  check("pitfalls", "pitfall");

  return { errors, warnings };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/lib/knowledge.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/lib/knowledge.ts .claude/scripts/__tests__/lib/knowledge.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): add lint checks for knowledge files"
```

---

### Task 9: knowledge-keeper.ts CLI 骨架

**Files:**
- Create: `.claude/scripts/knowledge-keeper.ts`
- Create: `.claude/scripts/__tests__/knowledge-keeper.test.ts`

- [ ] **Step 1: 创建 knowledge-keeper.test.ts 集成测试框架与最小用例**

```typescript
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const TMP = join(tmpdir(), `qa-flow-kk-test-${process.pid}`);
const WORKSPACE_DIR = join(TMP, "workspace");
const PROJECT = "kk-fixture";
const PROJECT_KNOWLEDGE = join(WORKSPACE_DIR, PROJECT, "knowledge");

function runKk(
  args: string[],
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "bun",
      ["run", ".claude/scripts/knowledge-keeper.ts", ...args],
      {
        cwd: resolve(import.meta.dirname, "../.."),
        encoding: "utf8",
        env: { ...process.env, WORKSPACE_DIR },
      },
    );
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      code: e.status ?? 1,
    };
  }
}

function resetFixture(): void {
  rmSync(join(WORKSPACE_DIR, PROJECT), { recursive: true, force: true });
  mkdirSync(join(PROJECT_KNOWLEDGE, "modules"), { recursive: true });
  mkdirSync(join(PROJECT_KNOWLEDGE, "pitfalls"), { recursive: true });
  // Minimal overview + terms templates
  writeFileSync(
    join(PROJECT_KNOWLEDGE, "overview.md"),
    `---
title: kk 业务概览
type: overview
tags: []
confidence: high
source: ""
updated: 2026-04-17
---

# kk 业务概览

## 产品定位

占位。

## 主流程

1. 占位
`,
  );
  writeFileSync(
    join(PROJECT_KNOWLEDGE, "terms.md"),
    `---
title: kk 术语表
type: term
tags: []
confidence: high
source: ""
updated: 2026-04-17
---

# kk 术语表

| 术语 | 中文 | 解释 | 别名 |
|---|---|---|---|
`,
  );
}

before(() => {
  mkdirSync(WORKSPACE_DIR, { recursive: true });
});
after(() => {
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("knowledge-keeper CLI skeleton", () => {
  it("prints help when no args", () => {
    const { stdout, code } = runKk(["--help"]);
    assert.equal(code, 0);
    assert.ok(stdout.includes("knowledge-keeper"));
    assert.ok(stdout.includes("read-core"));
  });

  it("errors when --project missing", () => {
    const { code, stderr } = runKk(["read-core"]);
    assert.notEqual(code, 0);
    assert.ok(stderr.includes("--project") || stderr.includes("required"));
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: "Cannot find module"（脚本不存在）。

- [ ] **Step 3: 创建 CLI 骨架**

```typescript
#!/usr/bin/env bun
/**
 * knowledge-keeper.ts — 业务知识库 CRUD + lint/index。
 * Usage:
 *   bun run .claude/scripts/knowledge-keeper.ts <action> --project <name> [...]
 * Actions: read-core | read-module | read-pitfall | write | update | index | lint
 */

import { Command } from "commander";
import { initEnv } from "./lib/env.ts";

initEnv();

const program = new Command();

program
  .name("knowledge-keeper")
  .description("Knowledge base CRUD + lint/index for workspace/{project}/knowledge/");

program
  .command("read-core")
  .description("Load core knowledge (overview + terms + index)")
  .requiredOption("--project <name>", "Project name")
  .action(async (_opts: { project: string }) => {
    // placeholder — implemented in Task 10
    process.stdout.write(JSON.stringify({ project: _opts.project, todo: "task10" }) + "\n");
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`[knowledge-keeper] Unexpected error: ${err}\n`);
  process.exit(1);
});
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 2 个用例全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/knowledge-keeper.ts .claude/scripts/__tests__/knowledge-keeper.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): add knowledge-keeper CLI skeleton"
```

---

### Task 10: read-core action

**Files:**
- Modify: `.claude/scripts/knowledge-keeper.ts`
- Modify: `.claude/scripts/__tests__/knowledge-keeper.test.ts`

- [ ] **Step 1: 追加失败用例**

```typescript
describe("read-core", () => {
  before(resetFixture);

  it("returns shape: project / overview / terms / index", () => {
    const { stdout, code } = runKk(["read-core", "--project", PROJECT]);
    assert.equal(code, 0, `stderr? stdout=${stdout}`);
    const obj = JSON.parse(stdout);
    assert.equal(obj.project, PROJECT);
    assert.ok(obj.overview);
    assert.equal(typeof obj.overview.title, "string");
    assert.ok(obj.overview.content.includes("产品定位"));
    assert.ok(Array.isArray(obj.terms));
    assert.ok(obj.index);
    assert.ok(Array.isArray(obj.index.modules));
    assert.ok(Array.isArray(obj.index.pitfalls));
  });

  it("parses terms table with rows", () => {
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "terms.md"),
      `---
title: terms
type: term
tags: []
confidence: high
source: ""
updated: 2026-04-17
---

| 术语 | 中文 | 解释 | 别名 |
|---|---|---|---|
| QI | 质量项 | 数据质量实体 | quality-item |
| DS | 数据源 | 数据接入 | data-source |
`,
    );
    const { stdout } = runKk(["read-core", "--project", PROJECT]);
    const obj = JSON.parse(stdout);
    assert.equal(obj.terms.length, 2);
    assert.equal(obj.terms[0].term, "QI");
    assert.equal(obj.terms[0].zh, "质量项");
    assert.equal(obj.terms[1].alias, "data-source");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 失败（read-core 未真实实现）。

- [ ] **Step 3: 实现 read-core**

修改 knowledge-keeper.ts：

```typescript
// 顶部追加 imports
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { knowledgeDir, knowledgePath } from "./lib/paths.ts";
import {
  parseFrontmatter,
  type TermRow,
  type IndexEntry,
} from "./lib/knowledge.ts";
import { readdirSync } from "node:fs";

// 新增 lib helper: 扫 modules/pitfalls 目录，读 frontmatter，返回 IndexEntry[]
function scanEntries(dir: string): IndexEntry[] {
  if (!existsSync(dir)) return [];
  const entries: IndexEntry[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    const raw = readFileSync(join(dir, f), "utf8");
    const parsed = parseFrontmatter(raw);
    if (!parsed.frontmatter) continue;
    entries.push({
      name: f.replace(/\.md$/, ""),
      title: parsed.frontmatter.title,
      tags: parsed.frontmatter.tags,
      updated: parsed.frontmatter.updated,
      confidence: parsed.frontmatter.confidence,
    });
  }
  return entries;
}

function parseTermsTable(body: string): TermRow[] {
  const rows: TermRow[] = [];
  const lines = body.split("\n");
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
      // Skip header + separator
      if (cells.some((c) => /^-+$/.test(c))) { inTable = true; continue; }
      if (!inTable) continue;
      if (cells[0] === "术语" || cells[0] === "Term") continue; // header fallback
      if (cells.length >= 4) {
        rows.push({ term: cells[0], zh: cells[1], desc: cells[2], alias: cells[3] });
      }
    }
  }
  return rows;
}

// 替换原 read-core 占位 action 为：
program
  .command("read-core")
  .description("Load core knowledge (overview + terms + index)")
  .requiredOption("--project <name>", "Project name")
  .action((opts: { project: string }) => {
    const kdir = knowledgeDir(opts.project);

    // Overview
    const ovPath = knowledgePath(opts.project, "overview.md");
    let overview = { title: "", content: "", updated: "" };
    if (existsSync(ovPath)) {
      const raw = readFileSync(ovPath, "utf8");
      const parsed = parseFrontmatter(raw);
      overview = {
        title: parsed.frontmatter?.title ?? "",
        content: parsed.body,
        updated: parsed.frontmatter?.updated ?? "",
      };
    }

    // Terms
    const termsPath = knowledgePath(opts.project, "terms.md");
    let terms: TermRow[] = [];
    let terms_updated = "";
    if (existsSync(termsPath)) {
      const raw = readFileSync(termsPath, "utf8");
      const parsed = parseFrontmatter(raw);
      terms = parseTermsTable(parsed.body);
      terms_updated = parsed.frontmatter?.updated ?? "";
    }

    // Index entries (rely on scan rather than _index.md)
    const modules = scanEntries(join(kdir, "modules"));
    const pitfalls = scanEntries(join(kdir, "pitfalls"));

    const result = {
      project: opts.project,
      overview,
      terms,
      index: { modules, pitfalls, overview_updated: overview.updated, terms_updated, terms_count: terms.length },
    };

    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  });
```

此外，在 `lib/knowledge.ts` 中追加 `TermRow` 类型导出（若尚未）：

```typescript
export interface TermRow {
  term: string;
  zh: string;
  desc: string;
  alias: string;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/knowledge-keeper.ts .claude/scripts/lib/knowledge.ts .claude/scripts/__tests__/knowledge-keeper.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): implement read-core action"
```

---

### Task 11: read-module action

**Files:**
- Modify: `.claude/scripts/knowledge-keeper.ts`
- Modify: `.claude/scripts/__tests__/knowledge-keeper.test.ts`

- [ ] **Step 1: 追加失败用例**

```typescript
describe("read-module", () => {
  before(resetFixture);

  it("returns frontmatter + content for existing module", () => {
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "data-source.md"),
      `---
title: 数据源接入
type: module
tags: [ds, auth]
confidence: high
source: src.ts
updated: 2026-04-17
---

# 数据源接入

模块正文。
`,
    );
    const { stdout, code } = runKk(["read-module", "--project", PROJECT, "--module", "data-source"]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.equal(obj.module, "data-source");
    assert.equal(obj.frontmatter.title, "数据源接入");
    assert.deepEqual(obj.frontmatter.tags, ["ds", "auth"]);
    assert.ok(obj.content.includes("模块正文"));
  });

  it("exits 1 when module not found", () => {
    const { code, stderr } = runKk(["read-module", "--project", PROJECT, "--module", "nope"]);
    assert.notEqual(code, 0);
    assert.ok(stderr.includes("Module not found"));
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: read-module 命令不存在。

- [ ] **Step 3: 实现 read-module**

在 knowledge-keeper.ts 追加：

```typescript
program
  .command("read-module")
  .description("Load a single module by name")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--module <name>", "Module name (without .md)")
  .action((opts: { project: string; module: string }) => {
    const path = knowledgePath(opts.project, "modules", `${opts.module}.md`);
    if (!existsSync(path)) {
      process.stderr.write(`[knowledge-keeper] Module not found: ${opts.module}\n`);
      process.exit(1);
    }
    const raw = readFileSync(path, "utf8");
    const parsed = parseFrontmatter(raw);
    const result = {
      project: opts.project,
      module: opts.module,
      frontmatter: parsed.frontmatter,
      content: parsed.body,
    };
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  });
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/knowledge-keeper.ts .claude/scripts/__tests__/knowledge-keeper.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): implement read-module action"
```

---

### Task 12: read-pitfall action

**Files:**
- Modify: `.claude/scripts/knowledge-keeper.ts`
- Modify: `.claude/scripts/__tests__/knowledge-keeper.test.ts`

- [ ] **Step 1: 追加失败用例**

```typescript
describe("read-pitfall", () => {
  before(() => {
    resetFixture();
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "pitfalls", "ui-dom-drift.md"),
      `---
title: UI DOM 漂移
type: pitfall
tags: [ui, playwright]
confidence: high
source: x.ts:1
updated: 2026-04-17
---
body`,
    );
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "pitfalls", "auth-expire.md"),
      `---
title: 认证过期
type: pitfall
tags: [auth]
confidence: medium
source: ""
updated: 2026-04-17
---
body`,
    );
  });

  it("matches filename substring", () => {
    const { stdout, code } = runKk(["read-pitfall", "--project", PROJECT, "--query", "dom"]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.equal(obj.matches.length, 1);
    assert.equal(obj.matches[0].name, "ui-dom-drift");
    assert.ok(obj.matches[0].match_by.includes("filename"));
  });

  it("matches tag substring", () => {
    const { stdout } = runKk(["read-pitfall", "--project", PROJECT, "--query", "auth"]);
    const obj = JSON.parse(stdout);
    assert.equal(obj.matches.length, 1);
    assert.equal(obj.matches[0].name, "auth-expire");
    assert.ok(obj.matches[0].match_by.includes("tags"));
  });

  it("returns empty matches with exit 0", () => {
    const { stdout, code } = runKk(["read-pitfall", "--project", PROJECT, "--query", "xyzzy"]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.deepEqual(obj.matches, []);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 失败。

- [ ] **Step 3: 实现 read-pitfall**

```typescript
// 顶部追加 import
import { searchPitfalls } from "./lib/knowledge.ts";

program
  .command("read-pitfall")
  .description("Search pitfalls by query (filename + tags)")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--query <keyword>", "Search keyword")
  .action((opts: { project: string; query: string }) => {
    const pdir = knowledgePath(opts.project, "pitfalls");
    const files: { name: string; tags: string[]; title: string; path: string }[] = [];
    if (existsSync(pdir)) {
      for (const f of readdirSync(pdir)) {
        if (!f.endsWith(".md")) continue;
        const raw = readFileSync(join(pdir, f), "utf8");
        const parsed = parseFrontmatter(raw);
        if (!parsed.frontmatter) continue;
        files.push({
          name: f.replace(/\.md$/, ""),
          tags: parsed.frontmatter.tags,
          title: parsed.frontmatter.title,
          path: join(pdir, f),
        });
      }
    }

    const hits = searchPitfalls(opts.query, files);
    const matches = hits.map((h) => {
      const f = files.find((x) => x.name === h.name)!;
      return {
        name: f.name,
        title: f.title,
        tags: f.tags,
        match_by: h.match_by,
        path: f.path,
      };
    });

    process.stdout.write(JSON.stringify({ project: opts.project, query: opts.query, matches }, null, 2) + "\n");
  });
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/knowledge-keeper.ts .claude/scripts/__tests__/knowledge-keeper.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): implement read-pitfall action"
```

---

### Task 13: index action（独立命令，不含 auto-trigger）

**Files:**
- Modify: `.claude/scripts/knowledge-keeper.ts`
- Modify: `.claude/scripts/__tests__/knowledge-keeper.test.ts`

先实施独立的 `index` 命令，Task 16 再加 write/update 的自动触发。

- [ ] **Step 1: 追加失败用例**

```typescript
describe("index", () => {
  before(() => {
    resetFixture();
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "ds.md"),
      `---
title: 数据源
type: module
tags: [ds]
confidence: high
source: ""
updated: 2026-04-17
---
body`,
    );
  });

  it("writes a _index.md with correct structure", () => {
    const { stdout, code } = runKk(["index", "--project", PROJECT]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.equal(obj.project, PROJECT);
    assert.equal(obj.modules_count, 1);
    assert.equal(obj.pitfalls_count, 0);

    const idxContent = readFileSync(join(PROJECT_KNOWLEDGE, "_index.md"), "utf8");
    assert.ok(idxContent.includes("## Core"));
    assert.ok(idxContent.includes("[ds.md](modules/ds.md)"));
    assert.ok(idxContent.includes("<!-- last-indexed: "));
  });

  it("fixes missing frontmatter and reports in fixed_frontmatter", () => {
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "legacy.md"),
      "# 遗留模块\n\n正文\n",
    );
    const { stdout } = runKk(["index", "--project", PROJECT]);
    const obj = JSON.parse(stdout);
    assert.ok(obj.fixed_frontmatter.includes("modules/legacy.md"));
    // Confirm file was rewritten with frontmatter
    const fixed = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "legacy.md"), "utf8");
    assert.ok(fixed.startsWith("---\n"));
    assert.ok(fixed.includes("type: module"));
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 失败。

- [ ] **Step 3: 实现 index action（含 Phase 0 auto-fix）**

```typescript
// 顶部追加 import
import { writeFileSync } from "node:fs";
import {
  autoFixFrontmatter,
  renderIndex,
  todayIso,
  type IndexData,
  type IndexEntry,
} from "./lib/knowledge.ts";

function gatherIndexData(projectName: string): {
  data: IndexData;
  fixedFiles: string[];
} {
  const kdir = knowledgeDir(projectName);
  const today = todayIso();
  const fixedFiles: string[] = [];

  const scanAndFix = (
    subdir: "modules" | "pitfalls",
  ): IndexEntry[] => {
    const dir = join(kdir, subdir);
    if (!existsSync(dir)) return [];
    const entries: IndexEntry[] = [];
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      const full = join(dir, f);
      let raw = readFileSync(full, "utf8");
      const fix = autoFixFrontmatter(raw, full, today);
      if (fix.fixed) {
        writeFileSync(full, fix.content);
        fixedFiles.push(`${subdir}/${f}`);
        raw = fix.content;
      }
      const parsed = parseFrontmatter(raw);
      if (!parsed.frontmatter) continue;
      entries.push({
        name: f.replace(/\.md$/, ""),
        title: parsed.frontmatter.title,
        tags: parsed.frontmatter.tags,
        updated: parsed.frontmatter.updated,
        confidence: parsed.frontmatter.confidence,
      });
    }
    return entries;
  };

  // Overview/terms: fix if missing frontmatter
  for (const single of ["overview.md", "terms.md"]) {
    const full = join(kdir, single);
    if (!existsSync(full)) continue;
    const raw = readFileSync(full, "utf8");
    const fix = autoFixFrontmatter(raw, full, today);
    if (fix.fixed) {
      writeFileSync(full, fix.content);
      fixedFiles.push(single);
    }
  }

  const modules = scanAndFix("modules");
  const pitfalls = scanAndFix("pitfalls");

  // Extract overview/terms updated + terms count
  const readUpdated = (name: string): string => {
    const path = join(kdir, name);
    if (!existsSync(path)) return "";
    const parsed = parseFrontmatter(readFileSync(path, "utf8"));
    return parsed.frontmatter?.updated ?? "";
  };
  const termsPath = join(kdir, "terms.md");
  let terms_count = 0;
  if (existsSync(termsPath)) {
    const parsed = parseFrontmatter(readFileSync(termsPath, "utf8"));
    terms_count = parsed.body.split("\n").filter((l) => {
      const t = l.trim();
      return t.startsWith("|")
        && t.endsWith("|")
        && !t.includes("---")
        && !t.startsWith("| 术语")
        && !t.startsWith("| Term");
    }).length;
  }

  return {
    data: {
      modules,
      pitfalls,
      overview_updated: readUpdated("overview.md"),
      terms_updated: readUpdated("terms.md"),
      terms_count,
    },
    fixedFiles,
  };
}

function writeIndexFile(projectName: string): { modules_count: number; pitfalls_count: number; fixed_frontmatter: string[]; written: string } {
  const { data, fixedFiles } = gatherIndexData(projectName);
  const out = renderIndex(projectName, data);
  const indexPath = join(knowledgeDir(projectName), "_index.md");
  writeFileSync(indexPath, out);
  return {
    modules_count: data.modules.length,
    pitfalls_count: data.pitfalls.length,
    fixed_frontmatter: fixedFiles,
    written: indexPath,
  };
}

program
  .command("index")
  .description("Rebuild _index.md (and auto-fix phase-0 templates)")
  .requiredOption("--project <name>", "Project name")
  .action((opts: { project: string }) => {
    const result = writeIndexFile(opts.project);
    process.stdout.write(JSON.stringify({ project: opts.project, ...result }, null, 2) + "\n");
  });
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/knowledge-keeper.ts .claude/scripts/__tests__/knowledge-keeper.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): implement index action with phase-0 auto-fix"
```

---

### Task 14: write action（四种 type + 所有 flag）

**Files:**
- Modify: `.claude/scripts/knowledge-keeper.ts`
- Modify: `.claude/scripts/__tests__/knowledge-keeper.test.ts`

- [ ] **Step 1: 追加失败用例**

```typescript
describe("write --type term", () => {
  before(resetFixture);

  it("dry-run does not persist", () => {
    const { stdout, code } = runKk([
      "write", "--project", PROJECT,
      "--type", "term",
      "--content", JSON.stringify({ term: "XYZ", zh: "测试术语", desc: "", alias: "" }),
      "--confidence", "high",
      "--dry-run",
    ]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.equal(obj.dry_run, true);
    const terms = readFileSync(join(PROJECT_KNOWLEDGE, "terms.md"), "utf8");
    assert.ok(!terms.includes("XYZ"), "terms.md should not contain XYZ after dry-run");
  });

  it("high confidence real write persists term row", () => {
    const { stdout, code } = runKk([
      "write", "--project", PROJECT,
      "--type", "term",
      "--content", JSON.stringify({ term: "XYZ", zh: "术语 X", desc: "说明", alias: "x" }),
      "--confidence", "high",
    ]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.ok(obj.file.endsWith("terms.md"));
    const terms = readFileSync(join(PROJECT_KNOWLEDGE, "terms.md"), "utf8");
    assert.ok(terms.includes("| XYZ | 术语 X | 说明 | x |"));
  });

  it("medium without --confirmed fails", () => {
    const { code, stderr } = runKk([
      "write", "--project", PROJECT,
      "--type", "term",
      "--content", JSON.stringify({ term: "M", zh: "m", desc: "", alias: "" }),
      "--confidence", "medium",
    ]);
    assert.notEqual(code, 0);
    assert.ok(stderr.includes("--confirmed"));
  });

  it("low always fails", () => {
    const { code, stderr } = runKk([
      "write", "--project", PROJECT,
      "--type", "term",
      "--content", JSON.stringify({ term: "L", zh: "l", desc: "", alias: "" }),
      "--confidence", "low",
      "--confirmed",
    ]);
    assert.notEqual(code, 0);
    assert.ok(stderr.includes("Low"));
  });
});

describe("write --type overview", () => {
  before(resetFixture);

  it("replaces a section body", () => {
    const { code } = runKk([
      "write", "--project", PROJECT,
      "--type", "overview",
      "--content", JSON.stringify({ section: "产品定位", body: "企业级数据资产平台", mode: "replace" }),
      "--confidence", "high",
    ]);
    assert.equal(code, 0);
    const ov = readFileSync(join(PROJECT_KNOWLEDGE, "overview.md"), "utf8");
    assert.ok(ov.includes("企业级数据资产平台"));
    assert.ok(!ov.includes("占位。\n"));
  });

  it("appends to a section body", () => {
    const { code } = runKk([
      "write", "--project", PROJECT,
      "--type", "overview",
      "--content", JSON.stringify({ section: "主流程", body: "\n新增一条流程说明", mode: "append" }),
      "--confidence", "high",
    ]);
    assert.equal(code, 0);
    const ov = readFileSync(join(PROJECT_KNOWLEDGE, "overview.md"), "utf8");
    assert.ok(ov.includes("新增一条流程说明"));
  });
});

describe("write --type module", () => {
  before(resetFixture);

  it("creates a new module file with frontmatter", () => {
    const { stdout, code } = runKk([
      "write", "--project", PROJECT,
      "--type", "module",
      "--content", JSON.stringify({ name: "data-source", title: "数据源", tags: ["ds"], body: "正文", source: "" }),
      "--confidence", "high",
    ]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.ok(obj.file.endsWith("modules/data-source.md"));
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "data-source.md"), "utf8");
    assert.ok(content.startsWith("---\n"));
    assert.ok(content.includes("title: 数据源"));
    assert.ok(content.includes("正文"));
  });

  it("refuses to overwrite existing file without --overwrite", () => {
    const { code, stderr } = runKk([
      "write", "--project", PROJECT,
      "--type", "module",
      "--content", JSON.stringify({ name: "data-source", title: "覆盖尝试", tags: [], body: "new", source: "" }),
      "--confidence", "high",
    ]);
    assert.notEqual(code, 0);
    assert.ok(stderr.includes("File exists"));
  });

  it("allows overwrite with --overwrite", () => {
    const { code } = runKk([
      "write", "--project", PROJECT,
      "--type", "module",
      "--content", JSON.stringify({ name: "data-source", title: "已覆盖", tags: ["new"], body: "new body", source: "" }),
      "--confidence", "high",
      "--overwrite",
    ]);
    assert.equal(code, 0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "data-source.md"), "utf8");
    assert.ok(content.includes("title: 已覆盖"));
  });
});

describe("write --type pitfall", () => {
  before(resetFixture);

  it("creates a pitfall file", () => {
    const { code } = runKk([
      "write", "--project", PROJECT,
      "--type", "pitfall",
      "--content", JSON.stringify({ name: "dom-drift", title: "DOM 漂移", tags: ["ui"], body: "详情", source: "" }),
      "--confidence", "high",
    ]);
    assert.equal(code, 0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "pitfalls", "dom-drift.md"), "utf8");
    assert.ok(content.includes("type: pitfall"));
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 失败。

- [ ] **Step 3: 实现 write action（统一入口 + 4 种 type 分发）**

```typescript
// 顶部追加 import
import {
  parseContentJson,
  serializeFrontmatter,
  confidenceGate,
  type Frontmatter,
  type ContentTerm,
  type ContentOverview,
  type ContentModule,
  type ContentPitfall,
} from "./lib/knowledge.ts";

interface WriteOpts {
  project: string;
  type: string;
  content: string;
  confidence?: string;
  confirmed?: boolean;
  dryRun?: boolean;
  overwrite?: boolean;
}

function buildModuleOrPitfallContent(
  type: "module" | "pitfall",
  c: ContentModule | ContentPitfall,
  today: string,
): string {
  const fm: Frontmatter = {
    title: c.title,
    type,
    tags: c.tags,
    confidence: "high", // placeholder — overwritten by caller
    source: c.source,
    updated: today,
  };
  return serializeFrontmatter(fm) + "\n" + c.body + (c.body.endsWith("\n") ? "" : "\n");
}

function renderTermRow(t: ContentTerm): string {
  return `| ${t.term} | ${t.zh} | ${t.desc} | ${t.alias} |`;
}

function upsertOverviewSection(body: string, section: string, newBody: string, mode: "append" | "replace"): string {
  const re = new RegExp(`(##\\s+${section.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}[\\s\\S]*?)(?=\\n##\\s+|$)`);
  const match = body.match(re);
  if (match) {
    const header = match[0].split("\n")[0];
    if (mode === "replace") {
      return body.replace(re, `${header}\n\n${newBody}\n`);
    }
    return body.replace(re, `${match[0]}${newBody}`);
  }
  // Section not found — append
  return body + `\n## ${section}\n\n${newBody}\n`;
}

function upsertTermRow(body: string, newRow: string, term: string): string {
  const lines = body.split("\n");
  let inTable = false;
  let inserted = false;
  const result: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("|") && t.endsWith("|") && t.includes("---")) {
      inTable = true;
      result.push(line);
      continue;
    }
    if (inTable && t.startsWith("|") && t.startsWith(`| ${term} |`)) {
      result.push(newRow);
      inserted = true;
      continue;
    }
    result.push(line);
  }
  if (!inserted) {
    // Append at end of table
    const idx = result.findIndex((l) => {
      const t = l.trim();
      return t.startsWith("|") && t.endsWith("|") && t.includes("---");
    });
    if (idx >= 0) {
      // find end of table
      let insertAt = idx + 1;
      while (insertAt < result.length) {
        const t = result[insertAt].trim();
        if (t.startsWith("|") && t.endsWith("|")) insertAt++;
        else break;
      }
      result.splice(insertAt, 0, newRow);
    } else {
      result.push(newRow);
    }
  }
  return result.join("\n");
}

program
  .command("write")
  .description("Write a new knowledge entry")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--type <t>", "overview|term|module|pitfall")
  .requiredOption("--content <json>", "JSON payload")
  .option("--confidence <c>", "high|medium|low", "medium")
  .option("--confirmed", "Confirm write for non-high confidence")
  .option("--dry-run", "Preview without persisting")
  .option("--overwrite", "Allow overwriting existing module/pitfall file")
  .action((opts: WriteOpts) => {
    const type = opts.type;
    const confidence = opts.confidence ?? "medium";
    const confirmed = Boolean(opts.confirmed);
    const dryRun = Boolean(opts.dryRun);
    const overwrite = Boolean(opts.overwrite);

    // Confidence gate
    const gate = confidenceGate(confidence, confirmed);
    if (!gate.allowed) {
      process.stderr.write(`[knowledge-keeper] ${gate.reason}\n`);
      process.exit(1);
    }

    let targetPath: string;
    let beforeContent = "";
    let afterContent = "";
    const today = todayIso();

    if (type === "term") {
      const c = parseContentJson<ContentTerm>("term", opts.content);
      targetPath = knowledgePath(opts.project, "terms.md");
      beforeContent = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
      const parsed = parseFrontmatter(beforeContent);
      const fm: Frontmatter = parsed.frontmatter ?? {
        title: "术语表",
        type: "term",
        tags: [],
        confidence: "high",
        source: "",
        updated: today,
      };
      fm.updated = today;
      const newBody = upsertTermRow(parsed.body, renderTermRow(c), c.term);
      afterContent = serializeFrontmatter(fm) + "\n" + newBody;
    } else if (type === "overview") {
      const c = parseContentJson<ContentOverview>("overview", opts.content);
      targetPath = knowledgePath(opts.project, "overview.md");
      beforeContent = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
      const parsed = parseFrontmatter(beforeContent);
      const fm: Frontmatter = parsed.frontmatter ?? {
        title: "业务概览",
        type: "overview",
        tags: [],
        confidence: "high",
        source: "",
        updated: today,
      };
      fm.updated = today;
      const newBody = upsertOverviewSection(parsed.body, c.section, c.body, c.mode);
      afterContent = serializeFrontmatter(fm) + "\n" + newBody;
    } else if (type === "module" || type === "pitfall") {
      const c = parseContentJson<ContentModule>(type, opts.content);
      const subdir = type === "module" ? "modules" : "pitfalls";
      targetPath = knowledgePath(opts.project, subdir, `${c.name}.md`);
      const exists = existsSync(targetPath);
      if (exists && !overwrite) {
        process.stderr.write(`[knowledge-keeper] File exists; use 'update' action or pass --overwrite: ${targetPath}\n`);
        process.exit(1);
      }
      beforeContent = exists ? readFileSync(targetPath, "utf8") : "";
      const fm: Frontmatter = {
        title: c.title,
        type: type as "module" | "pitfall",
        tags: c.tags,
        confidence: confidence as Frontmatter["confidence"],
        source: c.source,
        updated: today,
      };
      afterContent = serializeFrontmatter(fm) + "\n" + c.body + (c.body.endsWith("\n") ? "" : "\n");
    } else {
      process.stderr.write(`[knowledge-keeper] Unknown type: ${type}\n`);
      process.exit(1);
    }

    if (dryRun) {
      process.stdout.write(JSON.stringify({
        dry_run: true,
        action: "write",
        type,
        file: targetPath,
        before: beforeContent,
        after: afterContent,
      }, null, 2) + "\n");
      return;
    }

    // Ensure parent dir
    const { dirname } = require("node:path");
    mkdirSyncHelper(dirname(targetPath));
    writeFileSync(targetPath, afterContent);

    // Auto-trigger index (see Task 16 for wired expectation)
    // In this task, just write file; index wiring comes in Task 16.

    process.stdout.write(JSON.stringify({
      action: "write",
      type,
      file: targetPath,
      before: beforeContent,
      after: afterContent,
    }, null, 2) + "\n");
  });

// Helper for parent dir creation (avoid top-level require)
import { mkdirSync as _mkdirSync } from "node:fs";
import { dirname as _dirname } from "node:path";
function mkdirSyncHelper(dir: string): void {
  _mkdirSync(dir, { recursive: true });
}
```

**注意 TypeScript 清理**：删掉 `const { dirname } = require(...)` 和本地 import 冗余，统一放到顶部 import：

```typescript
// 顶部 imports 应最终为：
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
```

将 write action 里的 `mkdirSyncHelper(dirname(targetPath))` 改为 `mkdirSync(dirname(targetPath), { recursive: true });` 并删除辅助函数。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/knowledge-keeper.ts .claude/scripts/__tests__/knowledge-keeper.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): implement write action with 4 type dispatch"
```

---

### Task 15: update action

**Files:**
- Modify: `.claude/scripts/knowledge-keeper.ts`
- Modify: `.claude/scripts/__tests__/knowledge-keeper.test.ts`

- [ ] **Step 1: 追加失败用例**

```typescript
describe("update action", () => {
  before(() => {
    resetFixture();
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "m1.md"),
      `---
title: 原标题
type: module
tags: [a]
confidence: medium
source: "old"
updated: 2026-04-15
---

原 body
`,
    );
  });

  it("patches frontmatter fields", () => {
    const { code } = runKk([
      "update", "--project", PROJECT,
      "--path", "modules/m1.md",
      "--content", JSON.stringify({
        frontmatter_patch: { title: "新标题", tags: ["a", "b"] },
        mode: "patch",
      }),
      "--confirmed",
    ]);
    assert.equal(code, 0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    assert.ok(content.includes("title: 新标题"));
    assert.ok(content.includes("tags: [a, b]"));
    // unchanged fields stay
    assert.ok(content.includes("source: old"));
    // body unchanged
    assert.ok(content.includes("原 body"));
  });

  it("patches body for module type replaces new_body fully", () => {
    const { code } = runKk([
      "update", "--project", PROJECT,
      "--path", "modules/m1.md",
      "--content", JSON.stringify({
        body_patch: { new_body: "更新后的正文\n" },
        mode: "patch",
      }),
      "--confirmed",
    ]);
    assert.equal(code, 0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    assert.ok(content.includes("更新后的正文"));
    assert.ok(!content.includes("原 body"));
  });

  it("dry-run does not persist", () => {
    const { stdout } = runKk([
      "update", "--project", PROJECT,
      "--path", "modules/m1.md",
      "--content", JSON.stringify({ frontmatter_patch: { title: "XXX" }, mode: "patch" }),
      "--confirmed", "--dry-run",
    ]);
    const obj = JSON.parse(stdout);
    assert.equal(obj.dry_run, true);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    assert.ok(!content.includes("title: XXX"));
  });

  it("exits 1 on missing file", () => {
    const { code, stderr } = runKk([
      "update", "--project", PROJECT,
      "--path", "modules/nonexistent.md",
      "--content", JSON.stringify({ frontmatter_patch: {}, mode: "patch" }),
      "--confirmed",
    ]);
    assert.notEqual(code, 0);
    assert.ok(stderr.includes("not found") || stderr.includes("does not exist"));
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 失败。

- [ ] **Step 3: 实现 update action**

```typescript
interface UpdateContentShape {
  frontmatter_patch?: Partial<Frontmatter>;
  body_patch?: { section?: string; row_id?: string; new_body?: string };
  mode: "patch" | "replace";
}

program
  .command("update")
  .description("Update an existing knowledge file (frontmatter / body)")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--path <rel>", "Relative path under knowledge/")
  .requiredOption("--content <json>", "JSON patch spec")
  .option("--confirmed", "Confirm update")
  .option("--dry-run", "Preview without persisting")
  .action((opts: { project: string; path: string; content: string; confirmed?: boolean; dryRun?: boolean }) => {
    // Security: disallow absolute paths or traversal
    if (opts.path.startsWith("/") || opts.path.includes("..")) {
      process.stderr.write(`[knowledge-keeper] Invalid path: ${opts.path}\n`);
      process.exit(1);
    }

    const confirmed = Boolean(opts.confirmed);
    if (!confirmed) {
      process.stderr.write(`[knowledge-keeper] update requires --confirmed\n`);
      process.exit(1);
    }

    const full = knowledgePath(opts.project, opts.path);
    if (!existsSync(full)) {
      process.stderr.write(`[knowledge-keeper] File not found: ${opts.path}\n`);
      process.exit(1);
    }

    let patch: UpdateContentShape;
    try {
      patch = JSON.parse(opts.content) as UpdateContentShape;
    } catch {
      process.stderr.write(`[knowledge-keeper] Invalid --content JSON\n`);
      process.exit(1);
    }

    const before = readFileSync(full, "utf8");
    const parsed = parseFrontmatter(before);
    if (!parsed.frontmatter) {
      process.stderr.write(`[knowledge-keeper] Target file missing frontmatter; run 'index' first to auto-fix\n`);
      process.exit(1);
    }

    const today = todayIso();
    const fm: Frontmatter = { ...parsed.frontmatter, ...(patch.frontmatter_patch ?? {}), updated: today };

    let newBody = parsed.body;
    if (patch.body_patch) {
      if (patch.body_patch.new_body !== undefined) {
        // For module/pitfall: replace whole body. For overview: replace specific section if provided. For terms: replace row identified by row_id.
        if (fm.type === "module" || fm.type === "pitfall") {
          newBody = patch.body_patch.new_body;
        } else if (fm.type === "overview" && patch.body_patch.section) {
          newBody = upsertOverviewSection(parsed.body, patch.body_patch.section, patch.body_patch.new_body, patch.mode === "replace" ? "replace" : "replace");
        } else if (fm.type === "term" && patch.body_patch.row_id) {
          newBody = upsertTermRow(parsed.body, patch.body_patch.new_body, patch.body_patch.row_id);
        }
      }
    }

    const after = serializeFrontmatter(fm) + "\n" + newBody + (newBody.endsWith("\n") ? "" : "\n");

    if (opts.dryRun) {
      process.stdout.write(JSON.stringify({ dry_run: true, action: "update", file: full, before, after }, null, 2) + "\n");
      return;
    }

    writeFileSync(full, after);
    process.stdout.write(JSON.stringify({ action: "update", file: full, before, after }, null, 2) + "\n");
  });
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/knowledge-keeper.ts .claude/scripts/__tests__/knowledge-keeper.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): implement update action"
```

---

### Task 16: write/update 自动触发 index

**Files:**
- Modify: `.claude/scripts/knowledge-keeper.ts`
- Modify: `.claude/scripts/__tests__/knowledge-keeper.test.ts`

- [ ] **Step 1: 追加失败用例**

```typescript
describe("write/update auto-triggers index", () => {
  before(resetFixture);

  it("after write module, _index.md is regenerated", () => {
    // Remove existing _index.md so we can verify re-creation
    const idxPath = join(PROJECT_KNOWLEDGE, "_index.md");
    if (existsSync(idxPath)) rmSync(idxPath);

    runKk([
      "write", "--project", PROJECT,
      "--type", "module",
      "--content", JSON.stringify({ name: "auto-idx", title: "自动索引测试", tags: ["t"], body: "x", source: "" }),
      "--confidence", "high",
    ]);

    const idx = readFileSync(idxPath, "utf8");
    assert.ok(idx.includes("auto-idx.md"));
    assert.ok(idx.includes("<!-- last-indexed: "));
  });

  it("after update module, _index.md last-indexed timestamp advances", () => {
    const idxPath = join(PROJECT_KNOWLEDGE, "_index.md");
    const before = readFileSync(idxPath, "utf8");
    const beforeTs = before.match(/last-indexed: (\S+)/)?.[1];

    // Sleep 1ms to ensure timestamp changes
    const t = Date.now();
    while (Date.now() - t < 10) { /* busy wait 10ms */ }

    runKk([
      "update", "--project", PROJECT,
      "--path", "modules/auto-idx.md",
      "--content", JSON.stringify({ frontmatter_patch: { title: "变更标题" }, mode: "patch" }),
      "--confirmed",
    ]);

    const after = readFileSync(idxPath, "utf8");
    const afterTs = after.match(/last-indexed: (\S+)/)?.[1];
    assert.notEqual(beforeTs, afterTs, "last-indexed should change");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 失败（index 未在 write/update 后自动触发）。

- [ ] **Step 3: 在 write 和 update action 的真实写入后追加 `writeIndexFile(opts.project)` 调用**

找到 write action 的 `writeFileSync(targetPath, afterContent);` 后、stdout 输出前插入：

```typescript
writeIndexFile(opts.project);
```

同样在 update action 的 `writeFileSync(full, after);` 后插入：

```typescript
writeIndexFile(opts.project);
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 全绿（确认新测试 + 旧测试均通过）。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/knowledge-keeper.ts .claude/scripts/__tests__/knowledge-keeper.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): auto-trigger index after write/update"
```

---

### Task 17: lint action

**Files:**
- Modify: `.claude/scripts/knowledge-keeper.ts`
- Modify: `.claude/scripts/__tests__/knowledge-keeper.test.ts`

- [ ] **Step 1: 追加失败用例**

```typescript
describe("lint action", () => {
  before(() => {
    resetFixture();
    // Create a module with all errors
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "Bad_Name.md"),
      `---
type: pitfall
tags: []
confidence: high
source: ""
updated: 2026-04-17
---
body`,
    );
    // Ensure _index.md exists (otherwise orphan warning would fire always)
    runKk(["index", "--project", PROJECT]);
  });

  it("reports errors and exits 1 for violations", () => {
    const { stdout, code } = runKk(["lint", "--project", PROJECT]);
    assert.equal(code, 1, `expected exit 1, got ${code}. stdout=${stdout}`);
    const obj = JSON.parse(stdout);
    assert.ok(obj.errors.length >= 2, `expected >= 2 errors. got: ${JSON.stringify(obj.errors)}`);
    const rules = obj.errors.map((e: { rule: string }) => e.rule);
    assert.ok(rules.includes("non-kebab-case-name"));
    assert.ok(rules.includes("type-dir-mismatch"));
  });

  it("returns exit 2 when only warnings", () => {
    // Clean errors; introduce orphan/empty-tags warning only
    rmSync(join(PROJECT_KNOWLEDGE, "modules", "Bad_Name.md"));
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "notag.md"),
      `---
title: notag
type: module
tags: []
confidence: high
source: "x"
updated: 2026-04-17
---
body`,
    );
    // Do NOT run index so orphan warning fires
    rmSync(join(PROJECT_KNOWLEDGE, "_index.md"), { force: true });

    const { stdout, code } = runKk(["lint", "--project", PROJECT]);
    assert.equal(code, 2, `expected exit 2 (warnings). got ${code}. stdout=${stdout}`);
    const obj = JSON.parse(stdout);
    assert.equal(obj.errors.length, 0);
    assert.ok(obj.warnings.length >= 1);
  });

  it("exit 0 when clean", () => {
    // Remove all artifacts + rebuild index
    rmSync(join(PROJECT_KNOWLEDGE, "modules", "notag.md"), { force: true });
    runKk(["index", "--project", PROJECT]);
    const { stdout, code } = runKk(["lint", "--project", PROJECT]);
    assert.equal(code, 0, `expected exit 0. stdout=${stdout}`);
  });

  it("--strict upgrades warnings to errors", () => {
    // Reintroduce warning-only file
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "warn-only.md"),
      `---
title: warn
type: module
tags: []
confidence: high
source: "x"
updated: 2026-04-17
---
body`,
    );
    rmSync(join(PROJECT_KNOWLEDGE, "_index.md"), { force: true });
    const { code } = runKk(["lint", "--project", PROJECT, "--strict"]);
    assert.equal(code, 1);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: lint action 未实现，失败。

- [ ] **Step 3: 实现 lint action**

```typescript
import { lintChecks } from "./lib/knowledge.ts";

program
  .command("lint")
  .description("Health check for knowledge files")
  .requiredOption("--project <name>", "Project name")
  .option("--strict", "Treat warnings as errors")
  .action((opts: { project: string; strict?: boolean }) => {
    const kdir = knowledgeDir(opts.project);
    const result = lintChecks(opts.project, kdir);
    const output = { project: opts.project, ...result };
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");

    if (result.errors.length > 0) {
      process.exit(1);
    }
    if (result.warnings.length > 0) {
      process.exit(opts.strict ? 1 : 2);
    }
    process.exit(0);
  });
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__/knowledge-keeper.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/knowledge-keeper.ts .claude/scripts/__tests__/knowledge-keeper.test.ts
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): implement lint action"
```

---

### Task 18: 创建 SKILL.md

**Files:**
- Create: `.claude/skills/knowledge-keeper/SKILL.md`

- [ ] **Step 1: 创建目录并写入 SKILL.md**

```bash
mkdir -p /Users/poco/Projects/qa-flow/.claude/skills/knowledge-keeper
```

写入内容（完整）：

```markdown
---
name: knowledge-keeper
description: "业务知识库读写。记录/查询业务概览、术语、模块知识、踩坑记录。触发词：记一下、沉淀到知识库、更新知识库、查业务规则、这个坑记一下、查术语、查模块知识。"
argument-hint: "[操作] [关键词或内容]"
---

# knowledge-keeper

## 前置加载

### 项目选择

扫描 `workspace/` 目录下的子目录（排除以 `.` 开头的隐藏目录）：

- 仅 1 个项目：自动选择，输出 `当前项目：{{project}}`
- 多项目：列出让用户选择
- 无项目：提示 `/qa-flow init` 初始化

选定的项目记为 `{{project}}`。

### 规则上下文

按 rule-loader 合并加载：

```bash
bun run .claude/scripts/rule-loader.ts load --project {{project}}
```

## 场景 A：查询（只读）

### A1. 查术语

```bash
bun run .claude/scripts/knowledge-keeper.ts read-core --project {{project}}
```

从返回 JSON 的 `terms` 字段中过滤用户关键词并 Markdown 渲染。

### A2. 查模块知识

```bash
bun run .claude/scripts/knowledge-keeper.ts read-module --project {{project}} --module {{name}}
```

渲染 `frontmatter` + `content`。文件不存在时给用户建议（列出已有 modules）。

### A3. 查踩坑

```bash
bun run .claude/scripts/knowledge-keeper.ts read-pitfall --project {{project}} --query {{keyword}}
```

空结果时提示"未找到，建议：补充关键词 / 列出已有 pitfalls / 新增踩坑"。

## 场景 B：写入

### B1. 写入流程（所有 type 通用）

1. **识别触发词 + 解析意图**
   - "记一下 X 是 Y" → type=term，confidence=high
   - "项目的 XX 模块有 YY 规则" → type=module
   - "XX 概览是..." → type=overview
   - "踩坑：ZZ" → type=pitfall

2. **判断置信度**
   - 用户显式"记一下" / 提供完整信息 → high
   - 从源码/PRD 提炼推断 → medium
   - 信息不足 → 走 low 升级流程（见 B3）

3. **构造 content JSON**（按 type）：
   ```json
   // type=term: { "term": "...", "zh": "...", "desc": "...", "alias": "" }
   // type=overview: { "section": "...", "body": "...", "mode": "append"|"replace" }
   // type=module/pitfall: { "name": "kebab-case", "title": "...", "tags": ["..."], "body": "...", "source": "" }
   ```

4. **dry-run 预览**：
   ```bash
   bun run .claude/scripts/knowledge-keeper.ts write \
     --project {{project}} --type {{type}} \
     --content '{{json}}' --confidence {{conf}} --dry-run
   ```

5. **展示 before/after + 置信度分流**：
   - `confidence=high`：跳过 AskUser，直接真实写入
   - `confidence=medium`：AskUserQuestion 确认后带 `--confirmed` 真写

6. **真实写入**：去掉 `--dry-run` 加 `--confirmed`（如为 medium）：
   ```bash
   bun run .claude/scripts/knowledge-keeper.ts write \
     --project {{project}} --type {{type}} \
     --content '{{json}}' --confidence {{conf}} --confirmed
   ```

7. **展示结果摘要**：
   ```
   已写入 knowledge/{{path}}
   _index.md 已自动刷新
   ```

### B2. 覆盖已有 module/pitfall

CLI 默认拒绝覆盖。选择：
- **走 update**（推荐）：使用 `update` 命令精细改 frontmatter / body
- **强制覆盖**：加 `--overwrite` flag（同时需要 `--confirmed`）

### B3. low 置信度升级流程

当主 agent 判断置信度为 low 时（信息不足/推断性结论），使用 AskUserQuestion：

```
该知识条目证据不足（low 置信度），需补充信息升级为 medium 再写入。

推断内容：{{content_summary}}
推断依据：{{source_or_reasoning}}

选项：[补充证据] [直接升级为 medium 并确认] [放弃]
```

用户选择后视为 medium 继续 B1 流程。

### B4. medium 置信度 AskUser 模板

```
检测到新的业务知识条目（置信度：medium）

类型：{{type}}
目标：workspace/{{project}}/knowledge/{{path}}
标题：{{title}}
标签：{{tags}}
证据：{{source}}

【内容预览】
{{body 前 200 字}}...

选项：[确认写入] [调整内容] [更换路径] [跳过]
```

## 场景 C：维护

### C1. 刷新 _index.md

```bash
bun run .claude/scripts/knowledge-keeper.ts index --project {{project}}
```

通常 write/update 会自动刷新；用户手改或导入后需显式触发。

### C2. 健康检查

```bash
bun run .claude/scripts/knowledge-keeper.ts lint --project {{project}}
```

返回 `errors` + `warnings`。exit 0 = 健康 / exit 1 = 有 error / exit 2 = 仅 warning。

`--strict` 将 warning 升级为 error。

## Subagent 调用守则

- subagent **禁止**直接调 `write` / `update`
- subagent 发现需沉淀知识时，在返回报告中标注：
  `建议沉淀：{{type}} / {{content 摘要}} / 置信度 {{conf}}`
- 主 agent 收到后由本 skill 统一处理写入流程
- subagent 可自由调 `read-core` / `read-module` / `read-pitfall`（只读安全）

## 其他 skill 集成

其他 skill 如需业务背景，在 SKILL.md 顶部新增：

```bash
bun run .claude/scripts/knowledge-keeper.ts read-core --project {{project}}
```

返回的 overview / terms / index 作为业务背景注入后续决策。

**本阶段仅在本 SKILL.md 提供标准调用块**，其他 skill 的集成不做强制修改。
```

- [ ] **Step 2: smoke 验证 skill 可被识别**

Run: `ls .claude/skills/knowledge-keeper/SKILL.md`
Expected: 输出存在。

实际 slash command 注册依赖 Claude Code 运行时扫描，此处只保证文件就位。

- [ ] **Step 3: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/skills/knowledge-keeper/
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase1): add knowledge-keeper SKILL.md"
```

---

### Task 19: 最终验证 + Phase 0 兼容性 smoke

- [ ] **Step 1: 全量测试**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__`
Expected: 全绿。所有原有测试 + 新增测试通过。

- [ ] **Step 2: Phase 0 骨架兼容性 smoke（只读验证）**

```bash
cd /Users/poco/Projects/qa-flow
bun run .claude/scripts/knowledge-keeper.ts read-core --project dataAssets | head -30
```

Expected: 返回 JSON，`project=dataAssets`，`overview.content` 含"产品定位"。不报错（缺 frontmatter 的 Phase 0 文件读时返回 `frontmatter: null`，不阻断）。

- [ ] **Step 3: Phase 0 骨架 index 触发 auto-fix**

```bash
cd /Users/poco/Projects/qa-flow
bun run .claude/scripts/knowledge-keeper.ts index --project dataAssets
```

Expected: 返回 JSON，`fixed_frontmatter` 包含 `overview.md` 和 `terms.md`（Phase 0 模板无 frontmatter）。

检查：
```bash
head -10 workspace/dataAssets/knowledge/overview.md
head -10 workspace/dataAssets/knowledge/terms.md
```
Expected: 两文件开头应有 `---\ntitle: ...\n...\n---` 的 frontmatter。

- [ ] **Step 4: Phase 0 smoke 写入验证**

```bash
cd /Users/poco/Projects/qa-flow
bun run .claude/scripts/knowledge-keeper.ts write --project dataAssets \
  --type term --confidence high \
  --content '{"term":"SMOKE","zh":"烟雾","desc":"阶段 1 验证","alias":""}' \
  --dry-run
```
Expected: stdout JSON 含 `dry_run: true`，`after.body` 含 `| SMOKE | 烟雾 | 阶段 1 验证 |`；文件未变。

```bash
bun run .claude/scripts/knowledge-keeper.ts write --project dataAssets \
  --type term --confidence high \
  --content '{"term":"SMOKE","zh":"烟雾","desc":"阶段 1 验证","alias":""}'
```
Expected: 真实写入。

验证：
```bash
grep -q "| SMOKE |" workspace/dataAssets/knowledge/terms.md && echo OK
grep -q "last-indexed" workspace/dataAssets/knowledge/_index.md && echo OK
```

- [ ] **Step 5: lint 健康**

```bash
bun run .claude/scripts/knowledge-keeper.ts lint --project dataAssets
```
Expected: exit 0 或 2（Phase 0 骨架可能触发 empty-tags/empty-source warnings，可接受），无 error。

- [ ] **Step 6: 回滚 smoke 写入**

```bash
cd /Users/poco/Projects/qa-flow
git checkout workspace/dataAssets/knowledge/
```
Expected: dataAssets/knowledge/ 下所有文件恢复到 Phase 0 状态（无 frontmatter 注入、无 SMOKE 术语）。

- [ ] **Step 7: grep 扫查漏网与硬编码**

```bash
cd /Users/poco/Projects/qa-flow
grep -rn "/Users/poco" .claude/scripts/knowledge-keeper.ts .claude/scripts/lib/knowledge.ts .claude/scripts/__tests__/knowledge-keeper.test.ts .claude/scripts/__tests__/lib/knowledge.test.ts
```
Expected: 无硬编码绝对路径（测试使用 `tmpdir()` + `import.meta.dirname`）。

```bash
grep -rn "172\\." .claude/scripts/knowledge-keeper.ts .claude/scripts/lib/knowledge.ts
```
Expected: 无内部服务地址。

- [ ] **Step 8: TypeScript 编译健康**

```bash
cd /Users/poco/Projects/qa-flow
bunx tsc --noEmit .claude/scripts/knowledge-keeper.ts .claude/scripts/lib/knowledge.ts 2>&1 | head -20
```
Expected: 无 error。

- [ ] **Step 9: Commit（若回滚或清理产生变更）**

```bash
git -C /Users/poco/Projects/qa-flow status
# 如有未 commit 的清理改动则 commit，否则跳过
```

---

### Task 20: 生成子目标 2 启动 prompt（子目标 1 收尾）

子目标 1 完成后，**不立即进入子目标 2**，而是生成启动 prompt 供主 agent 接续（在同一 Phase 1 session 中继续或 `/clear` 后粘贴）。

- [ ] **Step 1: 在对话中呈现以下内容**

```
# Phase 1 子目标 1 完成 · 启动子目标 2（create-project skill）

## 子目标 1 交付
- Spec: docs/refactor/specs/2026-04-17-knowledge-keeper-design.md
- Plan: docs/refactor/plans/2026-04-17-knowledge-keeper-implementation.md
- CLI: .claude/scripts/knowledge-keeper.ts
- Lib: .claude/scripts/lib/knowledge.ts
- Skill: .claude/skills/knowledge-keeper/SKILL.md
- Tests: .claude/scripts/__tests__/knowledge-keeper.test.ts + lib/knowledge.test.ts
- 单元/集成测试全绿，Phase 0 骨架兼容性 smoke 通过

## 子目标 2 scope（create-project skill）
- 新增 .claude/skills/create-project/SKILL.md
- 交互式创建新项目并初始化 workspace/{project}/ 完整子结构（含 rules/ + knowledge/）
- 创建时可调用 knowledge-keeper index 生成初始 _index.md（避免硬编码模板）
- setup skill 当前的"第 2 步：项目管理"职责将转移过来

## 工作方式
- 按 brainstorming → writing-plans → subagent-driven-development 推进
- 独立 spec → plan → 实施 → smoke → commit
- 完成后再启动子目标 3（setup 瘦身）

## 现在开始
先跑一遍子目标 1 的 smoke 确认交付，然后对子目标 2 用 brainstorming skill 提澄清问题。
```

- [ ] **Step 2: TaskUpdate 标记子目标 1 完成**

无代码改动，仅状态收尾。

---

## Self-Review

### Spec 覆盖检查

- [x] §2 Goals.1-3: 7 个 actions 实施 → Tasks 10-17
- [x] §2 Goals.4: W2 置信度分级 → Task 6 + 14
- [x] §2 Goals.5: R3 分层懒加载 → Tasks 10-12
- [x] §2 Goals.6: Phase 0 骨架兼容 → Task 7 + 13
- [x] §2 Goals.7: paths.ts helper → Task 1
- [x] §2 Goals.8: 单元 + 集成测试 → 每个 task 都 TDD
- [x] §4.1 双层职责边界 → Task 9 CLI + Task 18 Skill
- [x] §5.3 Frontmatter 契约 → Task 2
- [x] §5.4 _index.md 格式 → Task 4
- [x] §5.5 Phase 0 兼容 → Task 7 + 13
- [x] §6.1-§6.7 7 个 actions API → Tasks 10-17
- [x] §7 SKILL.md 交互流程 → Task 18
- [x] §8 测试策略三层 → Task 1-19 全覆盖
- [x] §9 Success Criteria 12 条 → Task 19 对号入座
- [x] §10 Risks 皆已在实施逻辑中体现

### Placeholder 扫描

- [x] 无 TBD / TODO / 占位未填
- [x] 每个代码步骤均含完整可执行代码
- [x] 每个命令均给出 Expected 输出

### 类型一致性

- [x] 符号对照表开头锁定，所有 Task 遵循
- [x] `Frontmatter` / `IndexData` / `ContentXxx` / `LintResult` 等类型全程统一
- [x] 函数签名：`parseFrontmatter` / `serializeFrontmatter` / `renderIndex` / `searchPitfalls` / `lintChecks` / `confidenceGate` / `autoFixFrontmatter` / `todayIso` 全程一致

### 风险

- Task 14 write action 复杂度最高（4 种 type 分发 + 3 种 flag），若实施时发现子步骤过多可再拆分
- Task 16 auto-trigger index 依赖 Task 14 + 15 完成；如 Task 14 的 write 代码未暴露 `writeIndexFile` 则需要微调引用点
- Task 13 索引 terms_count 计算基于表格行计数启发式，若 terms.md 有非标准结构需 Task 实施时加 guard

---

## 执行选择

**Plan 已保存到 `docs/refactor/plans/2026-04-17-knowledge-keeper-implementation.md`。两种执行方式：**

**1. Subagent-Driven（推荐）** — 每个 Task 派 fresh subagent 实施，主 agent 在 Task 间 review，保护 context 并便于回滚。

**2. Inline Execution** — 在当前 session 按 executing-plans skill 批量执行，中间有 checkpoint。

**请选择。**
