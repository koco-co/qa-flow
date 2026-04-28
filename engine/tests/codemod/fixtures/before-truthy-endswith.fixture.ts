import { describe, it, expect } from "bun:test";

describe("endsWith", () => {
  it("suffix", () => {
    expect(filePath.endsWith(".md").toBeTruthy());
  });
});
