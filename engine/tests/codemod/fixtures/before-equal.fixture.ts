import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("equal cases", () => {
  it("primitive", () => {
    assert.equal(1, 1);
    assert.equal("a", "a", "string equal");
    assert.notEqual(1, 2);
  });
  it("deep", () => {
    assert.deepEqual({ a: 1 }, { a: 1 });
  });
});
