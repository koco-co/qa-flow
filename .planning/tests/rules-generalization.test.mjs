/**
 * rules-generalization.test.mjs
 * Smoke test: verify that .claude/rules/*.md files contain no hardcoded DTStack terms
 * outside of conditional guard blocks.
 *
 * Run: node --test .planning/tests/rules-generalization.test.mjs
 *
 * TDD Note: These tests will FAIL (RED) until Plan 03 generalizes the rules files.
 * That is expected behavior per the Wave 0 test scaffold design.
 *
 * Conditional guard block detection:
 * Lines between a line matching /以下规则仅/ or /以下内容仅/ and the next `---` or `##` heading
 * are considered "conditional" and excluded from the DTStack term check.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, "../..");
const RULES_DIR = join(WORKSPACE_ROOT, ".claude/rules");

/**
 * Extract lines from text that are OUTSIDE conditional guard blocks.
 * A conditional block starts at a line containing /以下规则仅|以下内容仅|> 以下/
 * and ends at the next `---` or `## ` heading line.
 */
function extractNonConditionalText(content) {
  const lines = content.split("\n");
  const nonConditionalLines = [];
  let inConditionalBlock = false;

  for (const line of lines) {
    // Detect start of conditional guard
    if (/以下规则仅|以下内容仅|> 以下|仅在.*config.*时适用|仅适用于|仅当.*config/.test(line)) {
      inConditionalBlock = true;
      continue;
    }
    // Detect end of conditional block (section separator or new heading)
    if (inConditionalBlock && (/^---\s*$/.test(line) || /^## /.test(line))) {
      inConditionalBlock = false;
    }
    if (!inConditionalBlock) {
      nonConditionalLines.push(line);
    }
  }

  return nonConditionalLines.join("\n");
}

describe("GEN-03: Rules files contain no hardcoded DTStack terms outside conditional blocks", () => {
  let rulesFiles;

  try {
    rulesFiles = readdirSync(RULES_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({ name: f, path: join(RULES_DIR, f) }));
  } catch {
    rulesFiles = [];
  }

  it("rules directory exists and contains .md files", () => {
    assert.ok(rulesFiles.length > 0, `Expected .md files in ${RULES_DIR}`);
  });

  for (const { name, path } of rulesFiles) {
    it(`${name}: no literal 'DTStack' outside conditional blocks`, () => {
      const content = readFileSync(path, "utf8");
      const nonConditional = extractNonConditionalText(content);
      const matches = nonConditional.match(/\bDTStack\b/g);
      assert.equal(
        matches,
        null,
        `Found ${matches?.length ?? 0} occurrence(s) of 'DTStack' in non-conditional text of ${name}. ` +
          `Wrap DTStack-specific content in a conditional guard block.`
      );
    });

    it(`${name}: no literal 'Doris' outside conditional blocks`, () => {
      const content = readFileSync(path, "utf8");
      const nonConditional = extractNonConditionalText(content);
      const matches = nonConditional.match(/\bDoris\b/g);
      assert.equal(
        matches,
        null,
        `Found ${matches?.length ?? 0} occurrence(s) of 'Doris' in non-conditional text of ${name}. ` +
          `Replace with \${datasource_type} or wrap in conditional guard.`
      );
    });

    it(`${name}: no literal 'Hive' outside conditional blocks`, () => {
      const content = readFileSync(path, "utf8");
      const nonConditional = extractNonConditionalText(content);
      // Exclude 'Hive' from lines that are part of code comments explaining what to use instead
      const matches = nonConditional.match(/\bHive\b/g);
      assert.equal(
        matches,
        null,
        `Found ${matches?.length ?? 0} occurrence(s) of 'Hive' in non-conditional text of ${name}. ` +
          `Replace with \${datasource_type} or wrap in conditional guard.`
      );
    });

    it(`${name}: no literal 'SparkThrift' outside conditional blocks`, () => {
      const content = readFileSync(path, "utf8");
      const nonConditional = extractNonConditionalText(content);
      const matches = nonConditional.match(/\bSparkThrift\b/g);
      assert.equal(
        matches,
        null,
        `Found ${matches?.length ?? 0} occurrence(s) of 'SparkThrift' in non-conditional text of ${name}. ` +
          `Replace with \${datasource_type} or wrap in conditional guard.`
      );
    });
  }
});
