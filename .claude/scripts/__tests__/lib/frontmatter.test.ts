import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseFrontMatter,
  serializeFrontMatter,
  buildMarkdown,
  countCases,
  todayString,
} from "../../lib/frontmatter.ts";

describe("parseFrontMatter", () => {
  it("returns empty frontmatter and full body if no --- delimiters", () => {
    const content = "## Title\n\nSome body text.";
    const { frontMatter, body } = parseFrontMatter(content);
    assert.deepEqual(frontMatter, {});
    assert.equal(body, content);
  });

  it("parses a simple string field", () => {
    const content = `---\nsuite_name: "My Test Suite"\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    assert.equal(frontMatter["suite_name"], "My Test Suite");
  });

  it("parses a number field", () => {
    const content = `---\nprd_id: 12345\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    assert.equal(frontMatter["prd_id"], 12345);
    assert.equal(typeof frontMatter["prd_id"], "number");
  });

  it("parses boolean true", () => {
    const content = `---\nenabled: true\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    assert.equal(frontMatter["enabled"], true);
    assert.equal(typeof frontMatter["enabled"], "boolean");
  });

  it("parses boolean false", () => {
    const content = `---\narchived: false\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    assert.equal(frontMatter["archived"], false);
    assert.equal(typeof frontMatter["archived"], "boolean");
  });

  it("parses a string array", () => {
    const content = `---\ntags:\n  - 测试\n  - 自动化\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    assert.ok(Array.isArray(frontMatter["tags"]));
    assert.deepEqual(frontMatter["tags"], ["测试", "自动化"]);
  });

  it("parses an empty array", () => {
    const content = `---\nhealth_warnings: []\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    assert.ok(Array.isArray(frontMatter["health_warnings"]));
    assert.deepEqual(frontMatter["health_warnings"], []);
  });

  it("extracts body after front-matter block", () => {
    const content = `---\nkey: value\n---\n\n## Section\n\nBody text here.`;
    const { body } = parseFrontMatter(content);
    assert.ok(body.includes("## Section"));
    assert.ok(body.includes("Body text here."));
  });

  it("handles multiple fields of different types", () => {
    const content = [
      "---",
      'suite_name: "质量问题台账"',
      "prd_id: 100",
      "enabled: true",
      "tags:",
      "  - 台账",
      "  - 数据质量",
      "health_warnings: []",
      "---",
      "",
      "## Body",
    ].join("\n");
    const { frontMatter } = parseFrontMatter(content);
    assert.equal(frontMatter["suite_name"], "质量问题台账");
    assert.equal(frontMatter["prd_id"], 100);
    assert.equal(frontMatter["enabled"], true);
    assert.deepEqual(frontMatter["tags"], ["台账", "数据质量"]);
    assert.deepEqual(frontMatter["health_warnings"], []);
  });

  it("ignores comment lines in front-matter block", () => {
    const content = `---\n# this is a comment\nkey: value\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    assert.equal(frontMatter["key"], "value");
    assert.equal(Object.keys(frontMatter).length, 1);
  });
});

describe("serializeFrontMatter", () => {
  it("wraps output with --- delimiters", () => {
    const result = serializeFrontMatter({ name: "test" });
    assert.ok(result.startsWith("---\n"));
    assert.ok(result.endsWith("\n---"));
  });

  it("serializes string values in double quotes", () => {
    const result = serializeFrontMatter({ suite_name: "My Suite" });
    assert.ok(result.includes('suite_name: "My Suite"'));
  });

  it("serializes number values without quotes", () => {
    const result = serializeFrontMatter({ prd_id: 42 });
    assert.ok(result.includes("prd_id: 42"));
    assert.ok(!result.includes('"42"'));
  });

  it("serializes boolean values without quotes", () => {
    const result = serializeFrontMatter({ enabled: true, archived: false });
    assert.ok(result.includes("enabled: true"));
    assert.ok(result.includes("archived: false"));
  });

  it("serializes non-empty string arrays with - items", () => {
    const result = serializeFrontMatter({ tags: ["a", "b", "c"] });
    assert.ok(result.includes("tags:"));
    assert.ok(result.includes('  - "a"'));
    assert.ok(result.includes('  - "b"'));
    assert.ok(result.includes('  - "c"'));
  });

  it("serializes empty arrays as []", () => {
    const result = serializeFrontMatter({ health_warnings: [] });
    assert.ok(result.includes("health_warnings: []"));
  });

  it("skips undefined values", () => {
    const result = serializeFrontMatter({ key: "value", missing: undefined });
    assert.ok(!result.includes("missing"));
  });
});

describe("parseFrontMatter + serializeFrontMatter round-trip", () => {
  it("round-trips a complete front-matter block without data loss", () => {
    const original = {
      suite_name: "测试套件",
      prd_id: 999,
      enabled: true,
      tags: ["标签1", "标签2"],
      health_warnings: [] as string[],
    };
    const serialized = serializeFrontMatter(original);
    const content = `${serialized}\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);

    assert.equal(frontMatter["suite_name"], original.suite_name);
    assert.equal(frontMatter["prd_id"], original.prd_id);
    assert.equal(frontMatter["enabled"], original.enabled);
    assert.deepEqual(frontMatter["tags"], original.tags);
    assert.deepEqual(frontMatter["health_warnings"], original.health_warnings);
  });
});

describe("buildMarkdown", () => {
  it("combines serialized front-matter and body", () => {
    const fm = { key: "val" };
    const body = "## Section\n\nContent.";
    const result = buildMarkdown(fm, body);
    assert.ok(result.includes("---"));
    assert.ok(result.includes('key: "val"'));
    assert.ok(result.includes("## Section"));
    assert.ok(result.includes("Content."));
  });

  it("separates front-matter and body with a blank line", () => {
    const fm = { key: "val" };
    const body = "## Body";
    const result = buildMarkdown(fm, body);
    assert.ok(result.includes("---\n\n##"), `Expected blank line between --- and body, got:\n${result}`);
  });
});

describe("countCases", () => {
  it("returns 0 for empty body", () => {
    assert.equal(countCases(""), 0);
  });

  it("returns 0 when no ##### headings", () => {
    assert.equal(countCases("## Module\n### Page\n#### Group\n"), 0);
  });

  it("counts each ##### heading as one case", () => {
    const body = [
      "## Module",
      "### Page",
      "##### 【P0】验证列表默认加载",
      "##### 【P1】验证搜索功能",
      "##### 【P2】验证导出",
    ].join("\n");
    assert.equal(countCases(body), 3);
  });

  it("does not count ###### (6 hashes) as cases", () => {
    const body = "##### Case 1\n###### Not a case\n##### Case 2\n";
    assert.equal(countCases(body), 2);
  });

  it("does not count ##### not at start of line", () => {
    const body = "##### Case 1\n  ##### indented\n##### Case 2\n";
    // Only unindented ##### count
    assert.equal(countCases(body), 2);
  });
});

describe("todayString", () => {
  it("returns a string matching YYYY-MM-DD format", () => {
    const result = todayString();
    assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches today's date components", () => {
    const result = todayString();
    const now = new Date();
    const year = now.getFullYear().toString();
    assert.ok(result.startsWith(year), `Expected result to start with ${year}, got ${result}`);
  });

  it("returns a 10-character string", () => {
    assert.equal(todayString().length, 10);
  });
});
