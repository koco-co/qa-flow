import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("edge cases", () => {
  it("backtick msg", () => {
    assert.equal(code, 0, `expected exit 0, got: ${stderr}`);
  });
  it("single-quote msg", () => {
    assert.equal(x, 1, "should be 1");
    assert.equal(y, 2, "should be 2");
  });
  it("nested calls", () => {
    assert.ok(existsSync(join(tmp, "prds")));
  });
  it("multi-line assert", () => {
    assert.equal(
      r.status,
      0,
      `stderr=${r.stderr}
stdout=${r.stdout}`,
    );
  });
  it("assert with regex match", () => {
    assert.match(output, /pattern with, comma/);
    assert.doesNotMatch(output, /no, comma/, "should not match");
  });
  it("assert.ok with msg", () => {
    assert.ok(result, "result should be truthy");
  });
});
