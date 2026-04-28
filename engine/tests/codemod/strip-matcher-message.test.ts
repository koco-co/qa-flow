import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripMatcherMessage } from "../../src/codemod/strip-matcher-message.ts";

const FIX = join(import.meta.dirname, "fixtures");

function pair(name: string): [string, string] {
  return [
    readFileSync(join(FIX, `before-strip-${name}.fixture.ts`), "utf8"),
    readFileSync(join(FIX, `after-strip-${name}.fixture.ts`), "utf8"),
  ];
}

describe("stripMatcherMessage", () => {
  it("strips msg from toBe", () => {
    const [b, a] = pair("toBe");
    expect(stripMatcherMessage(b)).toBe(a);
  });
  it("strips msg from toEqual", () => {
    const [b, a] = pair("toEqual");
    expect(stripMatcherMessage(b)).toBe(a);
  });
  it("strips msg from not.toBe / not.toEqual", () => {
    const [b, a] = pair("not");
    expect(stripMatcherMessage(b)).toBe(a);
  });
  it("strips msg from toMatch / toThrow", () => {
    const [b, a] = pair("toMatch");
    expect(stripMatcherMessage(b)).toBe(a);
  });
  it("preserves regex literals with comma", () => {
    const [b, a] = pair("regex");
    expect(stripMatcherMessage(b)).toBe(a);
  });
});
