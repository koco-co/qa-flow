import { describe, expect, test } from "bun:test";

import { isFailLikeValidationStatus } from "./validation-result-status";

describe("isFailLikeValidationStatus", () => {
  test("accepts explicit failed validation labels", () => {
    expect(isFailLikeValidationStatus("校验未通过")).toBe(true);
    expect(isFailLikeValidationStatus("校验不通过")).toBe(true);
  });

  test("accepts row labels rendered as 校验异常 when detail drawer still reports failed validation", () => {
    expect(isFailLikeValidationStatus("校验异常")).toBe(true);
  });

  test("rejects success labels", () => {
    expect(isFailLikeValidationStatus("校验通过")).toBe(false);
  });
});
