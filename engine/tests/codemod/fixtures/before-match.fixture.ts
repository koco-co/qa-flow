import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("match", () => {
  it("regex", () => {
    assert.match("hello", /h/);
    assert.doesNotMatch("hello", /z/);
  });
});
