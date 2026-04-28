import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("ok", () => {
  it("truthy", () => {
    assert.ok(true);
    assert.ok(1, "expected truthy");
  });
});
