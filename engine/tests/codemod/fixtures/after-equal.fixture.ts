import { describe, it, expect } from "bun:test";

describe("equal cases", () => {
  it("primitive", () => {
    expect(1).toBe(1);
    expect("a").toBe("a");
    expect(1).not.toBe(2);
  });
  it("deep", () => {
    expect({ a: 1 }).toEqual({ a: 1 });
  });
});
