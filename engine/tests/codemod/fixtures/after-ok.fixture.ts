import { describe, it, expect } from "bun:test";

describe("ok", () => {
  it("truthy", () => {
    expect(true).toBeTruthy();
    expect(1).toBeTruthy();
  });
});
