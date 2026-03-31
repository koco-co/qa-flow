/**
 * output-naming-contracts.test.mjs
 * Unit test scaffold for GEN-05: generalized output naming contracts.
 *
 * Run: node --test .claude/shared/scripts/output-naming-contracts.test.mjs
 *
 * TDD Note: Tests for getPreferredArchiveBaseName (renamed from getDtstackPreferredArchiveBaseName)
 * and deriveArchiveBaseName without source_standard check will FAIL (RED) until Plan 02 Task 1
 * updates output-naming-contracts.mjs. That is expected.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveArchiveBaseName,
  sanitizeFileName,
  stripKnownOutputSuffixes,
} from "./output-naming-contracts.mjs";

describe("GEN-05: deriveArchiveBaseName() — generalized (no DTStack source_standard check)", () => {
  it("deriveArchiveBaseName('input.json', { archive_file_name: 'My Feature' }) returns sanitized name", () => {
    // After GEN-05: should NOT require meta.source_standard === 'dtstack'
    // This test validates that archive_file_name is honored for any project
    const result = deriveArchiveBaseName("input.json", { archive_file_name: "My Feature" });
    assert.equal(typeof result, "string", "result should be a string");
    assert.ok(result.length > 0, "result should not be empty");
    // The sanitized name should derive from 'My Feature'
    assert.ok(
      result.includes("My") || result.includes("Feature") || result === "My-Feature",
      `Expected result to derive from 'My Feature', got: ${result}`
    );
  });

  it("deriveArchiveBaseName('input.json', { requirement_title: 'Feature X' }) returns sanitized name", () => {
    // After GEN-05: requirement_title should be honored for any project
    const result = deriveArchiveBaseName("input.json", { requirement_title: "Feature X" });
    assert.equal(typeof result, "string", "result should be a string");
    assert.ok(result.length > 0, "result should not be empty");
  });

  it("deriveArchiveBaseName('input.json', {}) falls through to input basename", () => {
    const result = deriveArchiveBaseName("input.json", {});
    assert.equal(typeof result, "string", "result should be a string");
    // Should derive from 'input' when no meta fields available
    assert.ok(
      result.includes("input") || result === "input",
      `Expected result to include 'input' when no meta, got: ${result}`
    );
  });
});

describe("GEN-05: getPreferredArchiveBaseName — exported with generic name", () => {
  it("getPreferredArchiveBaseName exists as exported function name (not getDtstackPreferredArchiveBaseName)", async () => {
    const mod = await import("./output-naming-contracts.mjs");
    assert.equal(
      mod.getDtstackPreferredArchiveBaseName,
      undefined,
      "getDtstackPreferredArchiveBaseName should NOT be exported (DTStack-specific name)"
    );
    // After Plan 02 Task 1, getPreferredArchiveBaseName will be exported
    // This test fails RED until then — that's expected
    assert.ok(
      typeof mod.getPreferredArchiveBaseName === "function",
      "getPreferredArchiveBaseName should be exported as a generic function"
    );
  });
});

describe("Existing contracts: sanitizeFileName and stripKnownOutputSuffixes still work", () => {
  it("sanitizeFileName converts slashes to dashes", () => {
    assert.equal(sanitizeFileName("a/b/c"), "a-b-c");
  });

  it("sanitizeFileName handles empty string", () => {
    const result = sanitizeFileName("");
    assert.equal(typeof result, "string");
    assert.ok(result.length > 0);
  });

  it("stripKnownOutputSuffixes removes -enhanced suffix", () => {
    const result = stripKnownOutputSuffixes("feature-enhanced");
    assert.equal(result, "feature");
  });

  it("stripKnownOutputSuffixes removes -final suffix", () => {
    const result = stripKnownOutputSuffixes("feature-final");
    assert.equal(result, "feature");
  });
});
