import { describe, it, expect } from "bun:test";
import {
  buildMarkdown,
  countCases,
  parseFrontMatter,
  serializeFrontMatter,
  todayString,
} from "../../lib/frontmatter.ts";

describe("parseFrontMatter", () => {
  it("returns empty frontmatter and full body if no --- delimiters", () => {
    const content = "## Title\n\nSome body text.";
    const { frontMatter, body } = parseFrontMatter(content);
    expect(frontMatter).toEqual({});
    expect(body).toBe(content);
  });

  it("parses a simple string field", () => {
    const content = `---\nsuite_name: "My Test Suite"\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    expect(frontMatter["suite_name"]).toBe("My Test Suite");
  });

  it("parses a number field", () => {
    const content = `---\nprd_id: 12345\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    expect(frontMatter["prd_id"]).toBe(12345);
    expect(typeof frontMatter["prd_id"]).toBe("number");
  });

  it("parses boolean true", () => {
    const content = `---\nenabled: true\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    expect(frontMatter["enabled"]).toBe(true);
    expect(typeof frontMatter["enabled"]).toBe("boolean");
  });

  it("parses boolean false", () => {
    const content = `---\narchived: false\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    expect(frontMatter["archived"]).toBe(false);
    expect(typeof frontMatter["archived"]).toBe("boolean");
  });

  it("parses a string array", () => {
    const content = `---\ntags:\n  - 测试\n  - 自动化\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    expect(Array.isArray(frontMatter["tags"])).toBeTruthy();
    expect(frontMatter["tags"]).toEqual(["测试", "自动化"]);
  });

  it("parses an empty array", () => {
    const content = `---\nhealth_warnings: []\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    expect(Array.isArray(frontMatter["health_warnings"])).toBeTruthy();
    expect(frontMatter["health_warnings"]).toEqual([]);
  });

  it("extracts body after front-matter block", () => {
    const content = `---\nkey: value\n---\n\n## Section\n\nBody text here.`;
    const { body } = parseFrontMatter(content);
    expect(body.includes("## Section")).toBeTruthy();
    expect(body.includes("Body text here.")).toBeTruthy();
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
    expect(frontMatter["suite_name"]).toBe("质量问题台账");
    expect(frontMatter["prd_id"]).toBe(100);
    expect(frontMatter["enabled"]).toBe(true);
    expect(frontMatter["tags"]).toEqual(["台账", "数据质量"]);
    expect(frontMatter["health_warnings"]).toEqual([]);
  });

  it("ignores comment lines in front-matter block", () => {
    const content = `---\n# this is a comment\nkey: value\n---\n\n## Body`;
    const { frontMatter } = parseFrontMatter(content);
    expect(frontMatter["key"]).toBe("value");
    expect(Object.keys(frontMatter).length).toBe(1);
  });
});

describe("serializeFrontMatter", () => {
  it("wraps output with --- delimiters", () => {
    const result = serializeFrontMatter({ name: "test" });
    expect(result.startsWith("---\n")).toBeTruthy();
    expect(result.endsWith("\n---")).toBeTruthy();
  });

  it("serializes string values in double quotes", () => {
    const result = serializeFrontMatter({ suite_name: "My Suite" });
    expect(result.includes('suite_name: "My Suite"')).toBeTruthy();
  });

  it("serializes number values without quotes", () => {
    const result = serializeFrontMatter({ prd_id: 42 });
    expect(result.includes("prd_id: 42")).toBeTruthy();
    expect(!result.includes('"42"')).toBeTruthy();
  });

  it("serializes boolean values without quotes", () => {
    const result = serializeFrontMatter({ enabled: true, archived: false });
    expect(result.includes("enabled: true")).toBeTruthy();
    expect(result.includes("archived: false")).toBeTruthy();
  });

  it("serializes non-empty string arrays with - items", () => {
    const result = serializeFrontMatter({ tags: ["a", "b", "c"] });
    expect(result.includes("tags:")).toBeTruthy();
    expect(result.includes('  - "a"')).toBeTruthy();
    expect(result.includes('  - "b"')).toBeTruthy();
    expect(result.includes('  - "c"')).toBeTruthy();
  });

  it("serializes empty arrays as []", () => {
    const result = serializeFrontMatter({ health_warnings: [] });
    expect(result.includes("health_warnings: []")).toBeTruthy();
  });

  it("skips undefined values", () => {
    const result = serializeFrontMatter({ key: "value", missing: undefined });
    expect(!result.includes("missing")).toBeTruthy();
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

    expect(frontMatter["suite_name"]).toBe(original.suite_name);
    expect(frontMatter["prd_id"]).toBe(original.prd_id);
    expect(frontMatter["enabled"]).toBe(original.enabled);
    expect(frontMatter["tags"]).toEqual(original.tags);
    expect(frontMatter["health_warnings"]).toEqual(original.health_warnings);
  });
});

describe("buildMarkdown", () => {
  it("combines serialized front-matter and body", () => {
    const fm = { key: "val" };
    const body = "## Section\n\nContent.";
    const result = buildMarkdown(fm, body);
    expect(result.includes("---")).toBeTruthy();
    expect(result.includes('key: "val"')).toBeTruthy();
    expect(result.includes("## Section")).toBeTruthy();
    expect(result.includes("Content.")).toBeTruthy();
  });

  it("separates front-matter and body with a blank line", () => {
    const fm = { key: "val" };
    const body = "## Body";
    const result = buildMarkdown(fm, body);
    expect(
      result.includes("---\n\n##")).toBeTruthy();
  });
});

describe("countCases", () => {
  it("returns 0 for empty body", () => {
    expect(countCases("")).toBe(0);
  });

  it("returns 0 when no ##### headings", () => {
    expect(countCases("## Module\n### Page\n#### Group\n")).toBe(0);
  });

  it("counts each ##### heading as one case", () => {
    const body = [
      "## Module",
      "### Page",
      "##### 【P0】验证列表默认加载",
      "##### 【P1】验证搜索功能",
      "##### 【P2】验证导出",
    ].join("\n");
    expect(countCases(body)).toBe(3);
  });

  it("does not count ###### (6 hashes) as cases", () => {
    const body = "##### Case 1\n###### Not a case\n##### Case 2\n";
    expect(countCases(body)).toBe(2);
  });

  it("does not count ##### not at start of line", () => {
    const body = "##### Case 1\n  ##### indented\n##### Case 2\n";
    // Only unindented ##### count
    expect(countCases(body)).toBe(2);
  });
});

describe("todayString", () => {
  it("returns a string matching YYYY-MM-DD format", () => {
    const result = todayString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches today's date components", () => {
    const result = todayString();
    const now = new Date();
    const year = now.getFullYear().toString();
    expect(result.startsWith(year)).toBeTruthy();
  });

  it("returns a 10-character string", () => {
    expect(todayString().length).toBe(10);
  });
});
