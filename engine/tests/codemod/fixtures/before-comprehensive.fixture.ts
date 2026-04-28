import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("comprehensive", () => {
  it("all asserts", () => {
    assert.equal(1, 1);
    assert.notEqual(1, 2);
    assert.deepEqual({ a: 1 }, { a: 1 });
    assert.match("hello", /h/);
    assert.doesNotMatch("hello", /z/);
    assert.ok(true);
    assert.throws(() => { throw new Error("x"); });
    assert.throws(() => { throw new Error("x"); }, /x/);
    assert.doesNotThrow(() => {});
  });
});
