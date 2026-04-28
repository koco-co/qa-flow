import { describe, it, expect } from "bun:test";

describe("edge cases", () => {
  it("backtick msg", () => {
    expect(code).toBe(0);
  });
  it("single-quote msg", () => {
    expect(x).toBe(1);
    expect(y).toBe(2);
  });
  it("nested calls", () => {
    expect(existsSync(join(tmp, "prds"))).toBeTruthy();
  });
  it("multi-line assert", () => {
    expect(r.status).toBe(0);
  });
  it("assert with regex match", () => {
    expect(output).toMatch(/pattern with, comma/);
    expect(output).not.toMatch(/no, comma/);
  });
  it("assert.ok with msg", () => {
    expect(result).toBeTruthy();
  });
});
