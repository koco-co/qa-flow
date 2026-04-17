import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseFrontmatter,
  serializeFrontmatter,
  todayIso,
  parseContentJson,
  renderIndex,
  searchPitfalls,
  confidenceGate,
  autoFixFrontmatter,
  lintChecks,
  type Frontmatter,
  type ContentTerm,
  type ContentOverview,
  type ContentModule,
  type ContentPitfall,
  type IndexData,
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

describe("todayIso", () => {
  it("returns YYYY-MM-DD format", () => {
    const s = todayIso();
    assert.match(s, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches today's date in local time", () => {
    const s = todayIso();
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    assert.equal(s, expected);
  });
});

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
    assert.ok(dsIdx > 0 && qIdx > 0);
    assert.ok(dsIdx < qIdx);
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
    assert.ok(out.includes("术语表（7 条"));
  });
});

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
    assert.equal(res.length, 1);
    assert.deepEqual(res[0].match_by.sort(), ["filename", "tags"]);
  });

  it("returns empty when no match", () => {
    const res = searchPitfalls("xyzzy", files);
    assert.deepEqual(res, []);
  });

  it("returns empty on empty query", () => {
    const res = searchPitfalls("", files);
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
