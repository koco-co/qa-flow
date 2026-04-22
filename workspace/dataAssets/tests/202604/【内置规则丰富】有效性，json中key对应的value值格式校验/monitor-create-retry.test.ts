import { describe, expect, test } from "bun:test";

import { createMonitorWithDuplicateRetry } from "./monitor-create-retry";

describe("createMonitorWithDuplicateRetry", () => {
  test("deletes the stale monitor and retries once when add returns duplicate error", async () => {
    const calls: string[] = [];
    let attempt = 0;

    await createMonitorWithDuplicateRetry(
      async () => {
        attempt += 1;
        calls.push(`create:${attempt}`);
        return attempt === 1
          ? { success: false, message: "监控对象已存在" }
          : { success: true };
      },
      async () => {
        calls.push("cleanup");
      },
      "json格式校验任务_P0不通过",
    );

    expect(calls).toEqual(["create:1", "cleanup", "create:2"]);
  });

  test("throws the original failure when the add error is not duplicate-related", async () => {
    await expect(
      createMonitorWithDuplicateRetry(
        async () => ({ success: false, message: "规则包不存在" }),
        async () => undefined,
        "json格式校验任务_P0不通过",
      ),
    ).rejects.toThrow("创建任务失败: 规则包不存在");
  });
});
