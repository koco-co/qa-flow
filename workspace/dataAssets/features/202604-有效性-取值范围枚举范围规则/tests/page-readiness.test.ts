import { describe, expect, test } from "bun:test";

import { pollReadiness } from "./page-readiness";

describe("pollReadiness", () => {
  test("accepts a page that becomes ready after a few delayed checks", async () => {
    let checks = 0;
    const waits: number[] = [];

    const ready = await pollReadiness({
      timeoutMs: 5_000,
      intervalMs: 1_000,
      wait: async (ms) => {
        waits.push(ms);
      },
      isReady: async () => {
        checks += 1;
        return checks >= 3;
      },
    });

    expect(ready).toBe(true);
    expect(checks).toBe(3);
    expect(waits).toEqual([1_000, 1_000]);
  });

  test("returns false when the page never becomes ready within the timeout", async () => {
    const waits: number[] = [];

    const ready = await pollReadiness({
      timeoutMs: 2_500,
      intervalMs: 1_000,
      wait: async (ms) => {
        waits.push(ms);
      },
      isReady: async () => false,
    });

    expect(ready).toBe(false);
    expect(waits).toEqual([1_000, 1_000, 500]);
  });
});
