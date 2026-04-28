import { describe, it, expect } from "bun:test";

describe("regex in matcher", () => {
  it("toMatch with regex", () => {
    expect(html).toMatch(/data:image\/png;base64,/, "should contain base64");
  });
  it("single quote msg", () => {
    expect(text).toMatch(/hello/, "should match hello");
  });
  it("no msg untouched", () => {
    expect(str).toMatch(/pattern/);
  });
});
