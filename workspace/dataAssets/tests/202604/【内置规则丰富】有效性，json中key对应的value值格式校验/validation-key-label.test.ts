import { describe, expect, test } from "bun:test";

import { buildValidationKeyLabelPattern } from "./validation-key-label";

describe("buildValidationKeyLabelPattern", () => {
  test("supports both dash and dot notation for nested json keys", () => {
    const pattern = buildValidationKeyLabelPattern("person-name");

    expect(pattern.test("person-name")).toBe(true);
    expect(pattern.test("person.name")).toBe(true);
  });

  test("does not match unrelated key paths", () => {
    const pattern = buildValidationKeyLabelPattern("person-age");

    expect(pattern.test("person-name")).toBe(false);
  });
});
