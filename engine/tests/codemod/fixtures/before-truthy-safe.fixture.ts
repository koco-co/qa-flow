import { describe, it, expect } from "bun:test";

describe("safe", () => {
  it("legit usage", () => {
    expect(arr.length).toBeGreaterThan(0);
    expect(obj.foo()).toBeTruthy();
    const x = arr.includes("a");
    expect(x).toBeTruthy();
  });
});
