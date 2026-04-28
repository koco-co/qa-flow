import { describe, it, expect } from "bun:test";

describe("regex match", () => {
  it("pattern", () => {
    expect(output.match(/pattern/).toBeTruthy());
  });
});
