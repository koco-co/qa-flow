import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  initDoc,
  readDoc,
  writeFrontmatter,
  setStatus,
  setSection,
  addSection,
  addPending,
  resolvePending,
  listPending,
  compactDoc,
  validateDoc,
  setSourceFacts,
  readSourceFacts,
} from "../lib/enhanced-doc-store.ts";
import { repoRoot, enhancedMd, sourceFactsJson } from "../lib/paths.ts";

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

describe("enhanced-doc-store: set-section", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test("setSection replaces content by anchor, preserves anchor", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const doc = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const anchor11 = doc.overview[0].anchor;
    setSection(TEST_PROJECT, TEST_YM, TEST_SLUG, anchor11, "业务侧新需求说明……");
    const doc2 = readDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const sec = doc2.overview.find(s => s.anchor === anchor11);
    expect(sec?.body.trim()).toBe("业务侧新需求说明……");
    expect(sec?.anchor).toBe(anchor11);
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

  test("resolvePending on already resolved throws", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const qid = addPending(TEST_PROJECT, TEST_YM, TEST_SLUG, sampleQ());
    resolvePending(TEST_PROJECT, TEST_YM, TEST_SLUG, qid, { answer: "a" });
    expect(() => resolvePending(TEST_PROJECT, TEST_YM, TEST_SLUG, qid, { answer: "b" }))
      .toThrow(/already resolved/i);
  });
});

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
    writeFrontmatter(TEST_PROJECT, TEST_YM, TEST_SLUG, { q_counter: 1 });
    const r = validateDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.includes("q_counter"))).toBe(true);
  });

  test("validateDoc catches orphan q footnote", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
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
      locationAnchor: "s-1",
    });
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

describe("enhanced-doc-store: source-facts blob", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test("small source-facts inlined in enhanced.md", () => {
    initDoc(TEST_PROJECT, TEST_YM, TEST_SLUG);
    const small = {
      fields: [{ name: "a", type: "string", path: "x.ts", note: "" }],
      routes: [],
      state_enums: [],
      permissions: [],
      api_signatures: [],
    };
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
    const jsonPath = sourceFactsJson(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(existsSync(jsonPath)).toBe(true);
    const read = readSourceFacts(TEST_PROJECT, TEST_YM, TEST_SLUG);
    expect(read.fields.length).toBe(2000);
  });
});
