import { describe, test, expect } from "bun:test";
import {
  generateSectionAnchor,
  generateQAnchor,
  isValidSectionAnchor,
  isValidQAnchor,
  parseAnchor,
} from "../lib/enhanced-doc-anchors.ts";

describe("enhanced-doc-anchors", () => {
  test("generateSectionAnchor top-level", () => {
    expect(generateSectionAnchor(1)).toBe("s-1");
    expect(generateSectionAnchor(2)).toBe("s-2");
  });

  test("generateSectionAnchor sub-section has 4-hex uuid", () => {
    const a = generateSectionAnchor(2, 1);
    expect(a).toMatch(/^s-2-1-[0-9a-f]{4}$/);
  });

  test("generateSectionAnchor sub-sections are unique", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) seen.add(generateSectionAnchor(2, 1));
    expect(seen.size).toBeGreaterThan(40);
  });

  test("generateQAnchor from counter", () => {
    expect(generateQAnchor(1)).toBe("q1");
    expect(generateQAnchor(42)).toBe("q42");
  });

  test("isValidSectionAnchor accepts spec formats", () => {
    expect(isValidSectionAnchor("s-1")).toBe(true);
    expect(isValidSectionAnchor("s-2-1-a1b2")).toBe(true);
    expect(isValidSectionAnchor("source-facts")).toBe(true);
  });

  test("isValidSectionAnchor rejects malformed", () => {
    expect(isValidSectionAnchor("s-1-1")).toBe(false);
    expect(isValidSectionAnchor("s-2-1-xyz")).toBe(false);
    expect(isValidSectionAnchor("section-1")).toBe(false);
    expect(isValidSectionAnchor("q1")).toBe(false);
  });

  test("isValidQAnchor accepts q{n}", () => {
    expect(isValidQAnchor("q1")).toBe(true);
    expect(isValidQAnchor("q42")).toBe(true);
    expect(isValidQAnchor("Q1")).toBe(false);
    expect(isValidQAnchor("q")).toBe(false);
  });

  test("parseAnchor decomposes section anchor", () => {
    expect(parseAnchor("s-2-1-a1b2")).toEqual({
      kind: "section",
      level: 2,
      index: 1,
      uuid: "a1b2",
    });
  });

  test("parseAnchor decomposes top-level section", () => {
    expect(parseAnchor("s-1")).toEqual({ kind: "section", level: 1 });
  });

  test("parseAnchor decomposes Q anchor", () => {
    expect(parseAnchor("q7")).toEqual({ kind: "pending", counter: 7 });
  });

  test("parseAnchor recognizes appendix", () => {
    expect(parseAnchor("source-facts")).toEqual({ kind: "appendix" });
  });

  test("parseAnchor returns null for invalid", () => {
    expect(parseAnchor("garbage")).toBeNull();
  });
});
