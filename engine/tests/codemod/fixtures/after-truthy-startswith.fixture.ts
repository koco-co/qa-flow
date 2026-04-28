import { describe, it, expect } from "bun:test";

describe("startsWith", () => {
  it("prefix", () => {
    expect(result.id.startsWith("tcg-")).toBeTruthy();
  });
});
