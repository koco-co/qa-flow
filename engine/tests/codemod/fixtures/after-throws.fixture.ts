import { describe, it, expect } from "bun:test";

describe("throws", () => {
  it("without error", () => {
    expect(() => { throw new Error("x"); }).toThrow();
  });
  it("with error match", () => {
    expect(() => { throw new Error("x"); }).toThrow(/x/);
  });
  it("does not throw", () => {
    expect(() => {}).not.toThrow();
  });
});
