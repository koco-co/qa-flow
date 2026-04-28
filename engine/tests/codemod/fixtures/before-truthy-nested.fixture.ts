import { describe, it, expect } from "bun:test";

describe("nested", () => {
  it("double method", () => {
    expect(result.tasks[0].preconditions.includes("admin").toBeTruthy());
  });
});
