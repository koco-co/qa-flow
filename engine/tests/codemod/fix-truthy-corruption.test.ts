import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fixTruthyCorruption } from "../../src/codemod/fix-truthy-corruption.ts";

const FIX = join(import.meta.dirname, "fixtures");

function pair(name: string): [string, string] {
  return [
    readFileSync(join(FIX, `before-truthy-${name}.fixture.ts`), "utf8"),
    readFileSync(join(FIX, `after-truthy-${name}.fixture.ts`), "utf8"),
  ];
}

describe("fixTruthyCorruption", () => {
  for (const name of ["include", "startswith", "endswith", "regex", "nested", "safe"]) {
    it(`fixes ${name}`, () => {
      const [b, a] = pair(name);
      expect(fixTruthyCorruption(b)).toBe(a);
    });
  }
});
