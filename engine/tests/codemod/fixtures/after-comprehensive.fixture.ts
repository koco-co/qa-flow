import { describe, it, expect } from "bun:test";

describe("comprehensive", () => {
  it("all asserts", () => {
    expect(1).toBe(1);
    expect(1).not.toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toMatch(/h/);
    expect("hello").not.toMatch(/z/);
    expect(true).toBeTruthy();
    expect(() => { throw new Error("x"); }).toThrow();
    expect(() => { throw new Error("x"); }).toThrow(/x/);
    expect(() => {}).not.toThrow();
  });
});
