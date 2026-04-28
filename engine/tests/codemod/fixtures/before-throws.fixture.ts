import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("throws", () => {
  it("without error", () => {
    assert.throws(() => { throw new Error("x"); });
  });
  it("with error match", () => {
    assert.throws(() => { throw new Error("x"); }, /x/);
  });
  it("does not throw", () => {
    assert.doesNotThrow(() => {});
  });
});
