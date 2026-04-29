import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const MERGE_PATH = resolve(REPO_ROOT, "engine/src/ui-autotest/merge-site-knowledge.ts");
const TMP_DIR = join(tmpdir(), `kata-merge-sk-test-${process.pid}`);

describe("mergeSiteKnowledge", () => {
  const sitesDir = join(TMP_DIR, "knowledge/sites");

  beforeEach(() => {
    mkdirSync(join(sitesDir, "example.com"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("should create new file for high confidence suggestion", async () => {
    const { mergeSiteKnowledge } = await import(`file://${MERGE_PATH}`);
    const result = mergeSiteKnowledge(
      {
        type: "site-selectors",
        domain: "example.com",
        content: "- button: `#submit`\n",
        confidence: "high",
      },
      TMP_DIR,
    );
    expect(result).toBe(true);
    const filePath = join(sitesDir, "example.com", "selectors.md");
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("#submit");
    expect(content).toContain("confidence: high");
  });

  it("should skip low confidence without confirm flag", async () => {
    const { mergeSiteKnowledge } = await import(`file://${MERGE_PATH}`);
    const result = mergeSiteKnowledge(
      {
        type: "site-selectors",
        domain: "example.com",
        content: "- risky: `.class`\n",
        confidence: "low",
      },
      TMP_DIR,
    );
    expect(result).toBe(false);
  });

  it("should append to existing file", async () => {
    const { mergeSiteKnowledge } = await import(`file://${MERGE_PATH}`);
    // First write
    mergeSiteKnowledge(
      { type: "site-traps", domain: "example.com", content: "- trap 1\n", confidence: "high" },
      TMP_DIR,
    );
    // Second write (same type)
    mergeSiteKnowledge(
      { type: "site-traps", domain: "example.com", content: "- trap 2\n", confidence: "high" },
      TMP_DIR,
    );
    const content = readFileSync(join(sitesDir, "example.com", "traps.md"), "utf-8");
    expect(content).toContain("trap 1");
    expect(content).toContain("trap 2");
  });

  it("should deduplicate identical suggestions", async () => {
    const { mergeSiteKnowledge } = await import(`file://${MERGE_PATH}`);
    mergeSiteKnowledge(
      { type: "site-selectors", domain: "example.com", content: "- btn: `#ok`\n", confidence: "high" },
      TMP_DIR,
    );
    // Duplicate
    mergeSiteKnowledge(
      { type: "site-selectors", domain: "example.com", content: "- btn: `#ok`\n", confidence: "high" },
      TMP_DIR,
    );
    const content = readFileSync(join(sitesDir, "example.com", "selectors.md"), "utf-8");
    // Content should only appear once
    expect(content.match(/#ok/g)?.length).toBe(1);
  });

  it("should write medium confidence with confirm flag", async () => {
    const { mergeSiteKnowledge } = await import(`file://${MERGE_PATH}`);
    const result = mergeSiteKnowledge(
      {
        type: "site-api",
        domain: "example.com",
        content: "- endpoint: `/api/v1`\n",
        confidence: "medium",
      },
      TMP_DIR,
      true,
    );
    expect(result).toBe(true);
    const filePath = join(sitesDir, "example.com", "api.md");
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("/api/v1");
  });

  it("should handle multiple file types for same domain", async () => {
    const { mergeSiteKnowledge } = await import(`file://${MERGE_PATH}`);
    mergeSiteKnowledge(
      { type: "site-selectors", domain: "example.com", content: "- login: `#login-btn`\n", confidence: "high" },
      TMP_DIR,
    );
    mergeSiteKnowledge(
      { type: "site-overview", domain: "example.com", content: "## Domain\n- URL: https://example.com\n", confidence: "high" },
      TMP_DIR,
    );
    expect(existsSync(join(sitesDir, "example.com", "selectors.md"))).toBe(true);
    expect(existsSync(join(sitesDir, "example.com", "overview.md"))).toBe(true);
  });
});

describe("mergeKnowledgeBatch", () => {
  const sitesDir = join(TMP_DIR, "knowledge/sites");

  beforeEach(() => {
    mkdirSync(join(sitesDir, "example.com"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("should process multiple suggestions and return counts", async () => {
    const { mergeKnowledgeBatch } = await import(`file://${MERGE_PATH}`);
    const result = mergeKnowledgeBatch(
      [
        { type: "site-selectors", domain: "example.com", content: "- btn: `#ok`\n", confidence: "high" },
        { type: "site-traps", domain: "example.com", content: "- trap: slow modal\n", confidence: "high" },
        { type: "site-selectors", domain: "example.com", content: "- btn: `#cancel`\n", confidence: "low" },
      ],
      TMP_DIR,
    );
    expect(result.written).toBe(2);
    expect(result.skipped).toBe(1);
  });
});
