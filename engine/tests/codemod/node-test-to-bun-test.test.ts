import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { transformNodeTestToBunTest } from "../../src/codemod/node-test-to-bun-test.ts";

const FIX = join(import.meta.dirname, "fixtures");

function pair(name: string): [string, string] {
  return [
    readFileSync(join(FIX, `before-${name}.fixture.ts`), "utf8"),
    readFileSync(join(FIX, `after-${name}.fixture.ts`), "utf8"),
  ];
}

describe("transformNodeTestToBunTest", () => {
  it("converts equal / deepEqual / notEqual", () => {
    const [before, after] = pair("equal");
    expect(transformNodeTestToBunTest(before)).toBe(after);
  });

  it("converts match / doesNotMatch", () => {
    const [b, a] = pair("match");
    expect(transformNodeTestToBunTest(b)).toBe(a);
  });

  it("converts throws / doesNotThrow", () => {
    const [b, a] = pair("throws");
    expect(transformNodeTestToBunTest(b)).toBe(a);
  });

  it("converts ok", () => {
    const [b, a] = pair("ok");
    expect(transformNodeTestToBunTest(b)).toBe(a);
  });

  it("comprehensive — all assert types", () => {
    const [b, a] = pair("comprehensive");
    expect(transformNodeTestToBunTest(b)).toBe(a);
  });

  it("handles edge cases — backtick msg, nested calls, multi-line, regex", () => {
    const [b, a] = pair("edge-cases");
    expect(transformNodeTestToBunTest(b)).toBe(a);
  });
});
