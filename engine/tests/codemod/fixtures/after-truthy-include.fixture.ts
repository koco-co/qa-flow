import { describe, it, expect } from "bun:test";

describe("includes", () => {
  it("string", () => {
    const s = "hello world";
    expect(s.includes("hello")).toBeTruthy();
  });
});
