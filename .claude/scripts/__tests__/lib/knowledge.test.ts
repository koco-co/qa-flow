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
