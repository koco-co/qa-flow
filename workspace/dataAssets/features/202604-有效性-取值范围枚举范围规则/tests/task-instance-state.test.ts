import { describe, expect, test } from "bun:test";

import { canUseFinishedTaskRow } from "./task-instance-state";

describe("canUseFinishedTaskRow", () => {
  test("does not accept a visible row that still shows running status", () => {
    const ready = canUseFinishedTaskRow({
      rowVisible: true,
      rowText: "json格式校验任务_P0不通过_sparkthrift2_x 运行中",
      batchFinished: true,
      batchFinishedStableMs: 20_000,
      stableThresholdMs: 15_000,
    });

    expect(ready).toBe(false);
  });

  test("accepts a visible row once running text disappears after batch completion", () => {
    const ready = canUseFinishedTaskRow({
      rowVisible: true,
      rowText: "json格式校验任务_P0不通过_sparkthrift2_x 校验不通过",
      batchFinished: true,
      batchFinishedStableMs: 20_000,
      stableThresholdMs: 15_000,
    });

    expect(ready).toBe(true);
  });
});
