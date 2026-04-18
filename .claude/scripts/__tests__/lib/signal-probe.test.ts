import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifySource,
  classifyPrd,
  classifyHistory,
  classifyKnowledge,
  computeFieldFillRate,
  firstModuleKebab,
  isCacheValid,
  buildCacheEntry,
  composeProfile,
} from "../../lib/signal-probe.ts";
import type {
  SignalEntry,
  SignalProfile,
  ArchiveSearchHit,
} from "../../lib/signal-probe.ts";

// ---------------------------------------------------------------------------
// classifySource
// ---------------------------------------------------------------------------

describe("classifySource", () => {
  it("returns missing when output is null", () => {
    const result = classifySource(null);
    assert.equal(result.level, "missing");
    assert.equal((result.evidence as Record<string, unknown>).a_level_count, 0);
    assert.equal((result.evidence as Record<string, unknown>).coverage_rate, 0);
  });

  it("returns strong when a_level has 3 items and coverage_rate >= 0.05", () => {
    const result = classifySource({
      a_level: ["a", "b", "c"],
      b_level: [],
      coverage_rate: 0.05,
      searched_files: 10,
      matched_files: 1,
    });
    assert.equal(result.level, "strong");
    assert.equal((result.evidence as Record<string, unknown>).a_level_count, 3);
    assert.equal((result.evidence as Record<string, unknown>).coverage_rate, 0.05);
  });

  it("returns weak when a_level has 2 items regardless of coverage_rate", () => {
    const result = classifySource({
      a_level: ["a", "b"],
      b_level: [],
      coverage_rate: 0.2,
      searched_files: 10,
      matched_files: 2,
    });
    assert.equal(result.level, "weak");
    assert.equal((result.evidence as Record<string, unknown>).a_level_count, 2);
  });

  it("returns weak when a_level is empty but b_level has 1 item", () => {
    const result = classifySource({
      a_level: [],
      b_level: ["x"],
      coverage_rate: 0,
      searched_files: 5,
      matched_files: 0,
    });
    assert.equal(result.level, "weak");
    assert.equal((result.evidence as Record<string, unknown>).b_level_count, 1);
  });

  it("returns missing when both a_level and b_level are empty", () => {
    const result = classifySource({
      a_level: [],
      b_level: [],
      coverage_rate: 0,
      searched_files: 5,
      matched_files: 0,
    });
    assert.equal(result.level, "missing");
  });
});

// ---------------------------------------------------------------------------
// classifyPrd
// ---------------------------------------------------------------------------

describe("classifyPrd", () => {
  it("returns strong when fillRate >= 0.7 and confidence >= 0.8", () => {
    const result = classifyPrd({ fieldFillRate: 0.85, confidence: 0.9, pageCount: 3 });
    assert.equal(result.level, "strong");
    assert.equal((result.evidence as Record<string, unknown>).field_fill_rate, 0.85);
    assert.equal((result.evidence as Record<string, unknown>).page_count, 3);
  });

  it("returns weak when fillRate is in [0.3, 0.7)", () => {
    const result = classifyPrd({ fieldFillRate: 0.5, confidence: 0.6, pageCount: 2 });
    assert.equal(result.level, "weak");
    assert.equal((result.evidence as Record<string, unknown>).confidence, 0.6);
  });

  it("returns missing when fillRate < 0.3", () => {
    const result = classifyPrd({ fieldFillRate: 0.2, confidence: 0.5, pageCount: 1 });
    assert.equal(result.level, "missing");
    assert.equal((result.evidence as Record<string, unknown>).field_fill_rate, 0.2);
  });
});

// ---------------------------------------------------------------------------
// classifyHistory
// ---------------------------------------------------------------------------

describe("classifyHistory", () => {
  it("returns strong when >= 2 hits have score >= 0.7", () => {
    const hits: ArchiveSearchHit[] = [
      { score: 0.9, path: "a.md" },
      { score: 0.8, path: "b.md" },
      { score: 0.85, path: "c.md" },
    ];
    const result = classifyHistory(hits);
    assert.equal(result.level, "strong");
    assert.equal((result.evidence as Record<string, unknown>).top_hits, 3);
    assert.equal((result.evidence as Record<string, unknown>).best_score, 0.9);
  });

  it("returns weak when exactly 1 hit has score >= 0.5", () => {
    const hits: ArchiveSearchHit[] = [{ score: 0.6, path: "a.md" }];
    const result = classifyHistory(hits);
    assert.equal(result.level, "weak");
    assert.equal((result.evidence as Record<string, unknown>).best_score, 0.6);
  });

  it("returns missing when all hits have score < 0.5", () => {
    const hits: ArchiveSearchHit[] = [
      { score: 0.3, path: "a.md" },
      { score: 0.4, path: "b.md" },
    ];
    const result = classifyHistory(hits);
    assert.equal(result.level, "missing");
    assert.equal((result.evidence as Record<string, unknown>).top_hits, 0);
  });
});

// ---------------------------------------------------------------------------
// classifyKnowledge
// ---------------------------------------------------------------------------

describe("classifyKnowledge", () => {
  it("returns strong when core is non-null and matchedModuleContent is non-empty", () => {
    const result = classifyKnowledge({
      core: { overview: "some overview", terms: "some terms" },
      matchedModuleContent: "module content here",
      moduleName: "商品管理",
    });
    assert.equal(result.level, "strong");
    assert.equal((result.evidence as Record<string, unknown>).core_nonempty, true);
  });

  it("returns weak when core is non-null but matchedModuleContent is null", () => {
    const result = classifyKnowledge({
      core: { overview: "some overview", terms: "some terms" },
      matchedModuleContent: null,
      moduleName: null,
    });
    assert.equal(result.level, "weak");
    assert.equal((result.evidence as Record<string, unknown>).core_nonempty, true);
  });

  it("returns missing when core is null", () => {
    const result = classifyKnowledge({
      core: null,
      matchedModuleContent: null,
    });
    assert.equal(result.level, "missing");
    assert.equal((result.evidence as Record<string, unknown>).core_nonempty, false);
  });
});

// ---------------------------------------------------------------------------
// computeFieldFillRate
// ---------------------------------------------------------------------------

describe("computeFieldFillRate", () => {
  it("returns pageCount === 3 and fillRate near 1.0 for 3 well-filled field tables", () => {
    const buildTable = (fieldName: string) =>
      `### 字段定义\n\n| 字段名 | 控件类型 | 必填 | 校验规则 |\n| --- | --- | --- | --- |\n| ${fieldName}_1 | 文本框 | 是 | 非空 |\n| ${fieldName}_2 | 下拉框 | 否 | 枚举值 |\n`;

    const prd = [buildTable("page1"), buildTable("page2"), buildTable("page3")].join(
      "\n\n",
    );

    const { fillRate, pageCount } = computeFieldFillRate(prd);
    assert.equal(pageCount, 3);
    assert.ok(
      fillRate >= 0.8 && fillRate <= 1.0,
      `Expected fillRate near 1.0 but got ${fillRate}`,
    );
  });

  it("returns fillRate === 0 and pageCount === 0 when no 字段定义 anchor exists", () => {
    const prd = "# 需求说明\n\n这里没有字段定义表格。\n\n## 功能描述\n\n正文内容。\n";
    const { fillRate, pageCount } = computeFieldFillRate(prd);
    assert.equal(fillRate, 0);
    assert.equal(pageCount, 0);
  });
});

// ---------------------------------------------------------------------------
// firstModuleKebab
// ---------------------------------------------------------------------------

describe("firstModuleKebab", () => {
  it("preserves Chinese module name as-is", () => {
    const result = firstModuleKebab({ modules: ["商品管理"] });
    assert.equal(result, "商品管理");
  });

  it("returns null when modules array is empty", () => {
    const result = firstModuleKebab({ modules: [] });
    assert.equal(result, null);
  });

  it("returns null when modules field is absent", () => {
    const result = firstModuleKebab({});
    assert.equal(result, null);
  });

  it("converts ASCII uppercase to lowercase and spaces to hyphens", () => {
    const result = firstModuleKebab({ modules: ["Order Management"] });
    assert.equal(result, "order-management");
  });

  it("converts underscores to hyphens", () => {
    const result = firstModuleKebab({ modules: ["user_profile"] });
    assert.equal(result, "user-profile");
  });
});

// ---------------------------------------------------------------------------
// isCacheValid + buildCacheEntry
// ---------------------------------------------------------------------------

describe("isCacheValid and buildCacheEntry", () => {
  const makeMinimalProfile = (): SignalProfile => ({
    source: { level: "strong", evidence: {} },
    prd: { level: "weak", evidence: {} },
    history: { level: "missing", evidence: {} },
    knowledge: { level: "strong", evidence: {} },
    probed_at: "2026-04-18T02:30:00.000Z",
    project: "dataAssets",
    prd_path: "workspace/dataAssets/prds/test.md",
  });

  it("returns true when entry mtime values match the provided mtimes", () => {
    const profile = makeMinimalProfile();
    const entry = buildCacheEntry(profile, 1000, 2000);
    assert.equal(isCacheValid(entry, 1000, 2000), true);
  });

  it("returns false when prd mtime does not match", () => {
    const profile = makeMinimalProfile();
    const entry = buildCacheEntry(profile, 1000, 2000);
    assert.equal(isCacheValid(entry, 9999, 2000), false);
  });

  it("returns false when entry is null", () => {
    assert.equal(isCacheValid(null, 1000, 2000), false);
  });
});

// ---------------------------------------------------------------------------
// composeProfile
// ---------------------------------------------------------------------------

describe("composeProfile", () => {
  it("produces a SignalProfile with correct probed_at (UTC ISO) and passes through all fields", () => {
    const now = new Date("2026-04-18T10:30:00+08:00");

    const source: SignalEntry = { level: "strong", evidence: { a_level_count: 3 } };
    const prd: SignalEntry = { level: "weak", evidence: { field_fill_rate: 0.5 } };
    const history: SignalEntry = { level: "missing", evidence: { top_hits: 0 } };
    const knowledge: SignalEntry = { level: "strong", evidence: { core_nonempty: true } };

    const profile = composeProfile({
      project: "dataAssets",
      prdPath: "workspace/dataAssets/prds/sample.md",
      source,
      prd,
      history,
      knowledge,
      now,
    });

    assert.equal(profile.probed_at, "2026-04-18T02:30:00.000Z");
    assert.equal(profile.project, "dataAssets");
    assert.equal(profile.prd_path, "workspace/dataAssets/prds/sample.md");
    assert.deepEqual(profile.source, source);
    assert.deepEqual(profile.prd, prd);
    assert.deepEqual(profile.history, history);
    assert.deepEqual(profile.knowledge, knowledge);
  });
});
