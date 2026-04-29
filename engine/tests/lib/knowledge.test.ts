import { describe, it, beforeEach, afterEach, expect } from "bun:test";
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
    expect(result.frontmatter).toBeTruthy();
    expect(result.frontmatter!.title).toBe("测试标题");
    expect(result.frontmatter!.type).toBe("module");
    expect(result.frontmatter!.tags).toEqual(["a", "b", "c"]);
    expect(result.frontmatter!.confidence).toBe("high");
    expect(result.frontmatter!.source).toBe("foo/bar.ts:42");
    expect(result.frontmatter!.updated).toBe("2026-04-17");
    expect(result.body.trim()).toBe("正文内容");
  });

  it("returns null frontmatter when no --- delimiters", () => {
    const raw = "# 只有正文\n没有 frontmatter\n";
    const result = parseFrontmatter(raw);
    expect(result.frontmatter).toBe(null);
    expect(result.body).toBe(raw);
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
    expect(result.frontmatter!.tags).toEqual([]);
    expect(result.frontmatter!.source).toBe("");
  });

  it("returns null on malformed frontmatter missing closing ---", () => {
    const raw = `---
title: 破损
type: module
`;
    const result = parseFrontmatter(raw);
    expect(result.frontmatter).toBe(null);
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
    expect(out.startsWith("---\n")).toBeTruthy();
    expect(out.includes("title: x")).toBeTruthy();
    expect(out.includes("tags: [y, z]")).toBeTruthy();
    expect(out.endsWith("---\n")).toBeTruthy();

    const reparsed = parseFrontmatter(out + "\ntail");
    expect(reparsed.frontmatter).toEqual(fm);
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
    expect(out.includes("tags: []")).toBeTruthy();
    expect(out.includes('source: ""')).toBeTruthy();
  });
});

describe("todayIso", () => {
  it("returns YYYY-MM-DD format", () => {
    const s = todayIso();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches today's date in local time", () => {
    const s = todayIso();
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(s).toBe(expected);
  });
});

describe("parseContentJson", () => {
  it("parses valid term content", () => {
    const raw = '{"term":"QI","zh":"质量项","desc":"data quality entity","alias":"quality-item"}';
    const result = parseContentJson<ContentTerm>("term", raw);
    expect(result.term).toBe("QI");
    expect(result.zh).toBe("质量项");
    expect(result.desc).toBe("data quality entity");
    expect(result.alias).toBe("quality-item");
  });

  it("parses valid overview content", () => {
    const raw = '{"section":"产品定位","body":"数据资产平台","mode":"replace"}';
    const result = parseContentJson<ContentOverview>("overview", raw);
    expect(result.section).toBe("产品定位");
    expect(result.mode).toBe("replace");
  });

  it("parses valid module content with empty arrays/strings", () => {
    const raw = '{"name":"data-source","title":"数据源接入","tags":[],"body":"...","source":""}';
    const result = parseContentJson<ContentModule>("module", raw);
    expect(result.name).toBe("data-source");
    expect(result.tags).toEqual([]);
    expect(result.source).toBe("");
  });

  it("parses valid pitfall content", () => {
    const raw =
      '{"name":"dom-drift","title":"DOM 漂移","tags":["ui"],"body":"...","source":"x.ts:1"}';
    const result = parseContentJson<ContentPitfall>("pitfall", raw);
    expect(result.name).toBe("dom-drift");
    expect(result.tags).toEqual(["ui"]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseContentJson("term", "{not json}")).toThrow(/Invalid JSON/);
  });

  it("throws on term missing required field", () => {
    expect(() => parseContentJson("term", '{"term":"x"}')).toThrow(/Missing required field/);
  });

  it("throws on unknown type", () => {
    expect(() => parseContentJson("bogus", "{}")).toThrow(/Unknown type/);
  });
});

describe("renderIndex", () => {
  it("renders header + core + empty modules/pitfalls", () => {
    const data: IndexData = {
      modules: [],
      pitfalls: [],
      sites: [],
      overview_updated: "2026-04-17",
      terms_updated: "2026-04-17",
      terms_count: 0,
    };
    const out = renderIndex("dataAssets", data);
    expect(out.includes("# dataAssets Knowledge Index")).toBeTruthy();
    expect(out.includes("## Core")).toBeTruthy();
    expect(out.includes("## Modules")).toBeTruthy();
    expect(out.includes("## Pitfalls")).toBeTruthy();
    expect(out.includes("<!-- last-indexed: ")).toBeTruthy();
  });

  it("lists module entries sorted by name", () => {
    const data: IndexData = {
      modules: [
        {
          name: "quality",
          title: "质量管理",
          tags: ["q"],
          updated: "2026-04-16",
          confidence: "medium",
        },
        {
          name: "data-source",
          title: "数据源",
          tags: ["ds"],
          updated: "2026-04-17",
          confidence: "high",
        },
      ],
      pitfalls: [],
      sites: [],
      overview_updated: "2026-04-17",
      terms_updated: "2026-04-17",
      terms_count: 3,
    };
    const out = renderIndex("p", data);
    const dsIdx = out.indexOf("data-source.md");
    const qIdx = out.indexOf("quality.md");
    expect(dsIdx > 0 && qIdx > 0).toBeTruthy();
    expect(dsIdx < qIdx).toBeTruthy();
    expect(out.includes("[tags: ds]")).toBeTruthy();
    expect(out.includes("confidence: high")).toBeTruthy();
  });

  it("lists pitfalls correctly", () => {
    const data: IndexData = {
      modules: [],
      pitfalls: [
        {
          name: "ui-drift",
          title: "UI 漂移",
          tags: ["ui", "playwright"],
          updated: "2026-04-15",
          confidence: "high",
        },
      ],
      sites: [],
      overview_updated: "2026-04-17",
      terms_updated: "2026-04-17",
      terms_count: 0,
    };
    const out = renderIndex("p", data);
    expect(out.includes("[ui-drift.md](pitfalls/ui-drift.md).toBeTruthy()"));
    expect(out.includes("[tags: ui, playwright]")).toBeTruthy();
  });

  it("terms_count appears in Core block", () => {
    const data: IndexData = {
      modules: [],
      pitfalls: [],
      sites: [],
      overview_updated: "2026-04-17",
      terms_updated: "2026-04-17",
      terms_count: 7,
    };
    const out = renderIndex("p", data);
    expect(out.includes("术语表（7 条")).toBeTruthy();
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
    expect(res.length).toBe(1);
    expect(res[0].name).toBe("ui-dom-drift");
    expect(res[0].match_by.includes("filename")).toBeTruthy();
  });

  it("matches by tag substring", () => {
    const res = searchPitfalls("auth", files);
    expect(res.length).toBe(1);
    expect(res[0].name).toBe("auth-token-expire");
  });

  it("returns both filename and tag matches deduplicated", () => {
    const res = searchPitfalls("timeout", files);
    expect(res.length).toBe(1);
    expect(res[0].match_by.sort()).toEqual(["filename", "tags"]);
  });

  it("returns empty when no match", () => {
    const res = searchPitfalls("xyzzy", files);
    expect(res).toEqual([]);
  });

  it("returns empty on empty query", () => {
    const res = searchPitfalls("", files);
    expect(res).toEqual([]);
  });

  it("matches multiple files", () => {
    const res = searchPitfalls("ui", [
      { name: "ui-a", tags: [] },
      { name: "ui-b", tags: [] },
      { name: "other", tags: [] },
    ]);
    expect(res.length).toBe(2);
  });
});

describe("confidenceGate", () => {
  it("allows high without --confirmed", () => {
    const r = confidenceGate("high", false);
    expect(r.allowed).toBe(true);
  });

  it("allows high with --confirmed (harmless redundancy)", () => {
    const r = confidenceGate("high", true);
    expect(r.allowed).toBe(true);
  });

  it("rejects medium without --confirmed", () => {
    const r = confidenceGate("medium", false);
    expect(r.allowed).toBe(false);
    expect(r.reason ?? "").toMatch(/requires --confirmed/);
  });

  it("allows medium with --confirmed", () => {
    const r = confidenceGate("medium", true);
    expect(r.allowed).toBe(true);
  });

  it("rejects low always (even with --confirmed)", () => {
    expect(confidenceGate("low").allowed).toBe(false);
    expect(confidenceGate("low", true).allowed).toBe(false);
  });

  it("rejects unknown confidence", () => {
    const r = confidenceGate("bogus", true);
    expect(r.allowed).toBe(false);
  });
});

describe("autoFixFrontmatter", () => {
  it("injects minimal frontmatter into a phase-0 template module file", () => {
    const raw = `# 某模块标题

> 由 knowledge-keeper skill（阶段 1 实施后）维护。

模块正文。
`;
    const result = autoFixFrontmatter(
      raw,
      "/path/workspace/p/knowledge/modules/foo.md",
      "2026-04-17",
    );
    expect(result.fixed).toBe(true);
    expect(result.content.startsWith("---\n")).toBeTruthy();
    expect(result.content.includes("title: 某模块标题")).toBeTruthy();
    expect(result.content.includes("type: module")).toBeTruthy();
    expect(result.content.includes("tags: []")).toBeTruthy();
    expect(result.content.includes("confidence: high")).toBeTruthy();
    expect(result.content.includes("updated: 2026-04-17")).toBeTruthy();
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
    expect(result.fixed).toBe(false);
    expect(result.content).toBe(raw);
  });

  it("infers type=pitfall from path", () => {
    const raw = "# 坑标题\n正文\n";
    const result = autoFixFrontmatter(raw, "/w/p/knowledge/pitfalls/bad.md", "2026-04-17");
    expect(result.fixed).toBe(true);
    expect(result.content.includes("type: pitfall")).toBeTruthy();
  });

  it("infers type=overview for overview.md", () => {
    const raw = "# X 业务概览\n\n正文\n";
    const result = autoFixFrontmatter(raw, "/w/p/knowledge/overview.md", "2026-04-17");
    expect(result.fixed).toBe(true);
    expect(result.content.includes("type: overview")).toBeTruthy();
  });

  it("infers type=term for terms.md", () => {
    const raw = "# 术语表\n\n| 术语 | 中文 |\n";
    const result = autoFixFrontmatter(raw, "/w/p/knowledge/terms.md", "2026-04-17");
    expect(result.fixed).toBe(true);
    expect(result.content.includes("type: term")).toBeTruthy();
  });

  it("falls back to filename when no H1 present", () => {
    const raw = "没有 H1 的正文\n";
    const result = autoFixFrontmatter(raw, "/w/p/knowledge/modules/my-module.md", "2026-04-17");
    expect(result.fixed).toBe(true);
    expect(result.content.includes("title: my-module")).toBeTruthy();
  });
});

describe("lintChecks", () => {
  const TMP = join(tmpdir(), `kk-lint-test-${process.pid}`);
  const knowledgeDirPath = join(TMP, "knowledge");

  beforeEach(() => {
    mkdirSync(join(knowledgeDirPath, "modules"), { recursive: true });
    mkdirSync(join(knowledgeDirPath, "pitfalls"), { recursive: true });
  });
  afterEach(() => {
    try {
      rmSync(TMP, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("reports missing frontmatter field as error", () => {
    const modulePath = join(knowledgeDirPath, "modules", "broken.md");
    try {
      writeFileSync(
        modulePath,
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
        "# p Knowledge Index\n\n- [modules/broken.md](modules/broken.md)\n",
      );
      const result = lintChecks("p", knowledgeDirPath);
      expect(result.errors.some((e) => e.rule === "missing-frontmatter-field")).toBeTruthy();
    } finally {
      try {
        rmSync(modulePath);
      } catch {
        /* ignore */
      }
    }
  });

  it("reports type mismatch as error", () => {
    const modulePath = join(knowledgeDirPath, "modules", "wrong-type.md");
    try {
      writeFileSync(
        modulePath,
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
        "# p\n\n- [modules/wrong-type.md](modules/wrong-type.md)\n",
      );
      const result = lintChecks("p", knowledgeDirPath);
      expect(result.errors.some((e) => e.rule === "type-dir-mismatch")).toBeTruthy();
    } finally {
      try {
        rmSync(modulePath);
      } catch {
        /* ignore */
      }
    }
  });

  it("reports non-kebab-case name as error", () => {
    const modulePath = join(knowledgeDirPath, "modules", "Bad_Name.md");
    try {
      writeFileSync(
        modulePath,
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
        "# p\n\n- [modules/Bad_Name.md](modules/Bad_Name.md)\n",
      );
      const result = lintChecks("p", knowledgeDirPath);
      expect(result.errors.some((e) => e.rule === "non-kebab-case-name")).toBeTruthy();
    } finally {
      try {
        rmSync(modulePath);
      } catch {
        /* ignore */
      }
    }
  });

  it("reports empty tags as warning", () => {
    const modulePath = join(knowledgeDirPath, "modules", "notag.md");
    try {
      writeFileSync(
        modulePath,
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
        "# p\n\n- [modules/notag.md](modules/notag.md)\n",
      );
      const result = lintChecks("p", knowledgeDirPath);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.some((w) => w.rule === "empty-tags")).toBeTruthy();
    } finally {
      try {
        rmSync(modulePath);
      } catch {
        /* ignore */
      }
    }
  });

  it("reports empty source as warning", () => {
    const modulePath = join(knowledgeDirPath, "modules", "nosrc.md");
    try {
      writeFileSync(
        modulePath,
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
        "# p\n\n- [modules/nosrc.md](modules/nosrc.md)\n",
      );
      const result = lintChecks("p", knowledgeDirPath);
      expect(result.warnings.some((w) => w.rule === "empty-source")).toBeTruthy();
    } finally {
      try {
        rmSync(modulePath);
      } catch {
        /* ignore */
      }
    }
  });

  it("reports orphan file (present but not in _index.md) as warning", () => {
    const modulePath = join(knowledgeDirPath, "modules", "orphan.md");
    try {
      writeFileSync(
        modulePath,
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
      expect(result.warnings.some((w) => w.rule === "orphan-file")).toBeTruthy();
    } finally {
      try {
        rmSync(modulePath);
      } catch {
        /* ignore */
      }
    }
  });
});
