import { describe, it, expect } from "bun:test";

describe("match", () => {
  it("regex", () => {
    expect("hello").toMatch(/h/);
    expect("hello").not.toMatch(/z/);
  });
});
