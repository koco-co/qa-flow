import { describe, expect, test } from "bun:test";

import { runRetriablePreconditions } from "./json-suite-preconditions";

describe("runRetriablePreconditions", () => {
  test("retries transient setup errors across candidate projects", async () => {
    const calls: string[] = [];
    const waits: number[] = [];

    await runRetriablePreconditions({
      reportName: "sparkthrift2.x",
      projectNames: ["pw_test", "pw"],
      wait: async (ms) => {
        waits.push(ms);
      },
      runForProject: async (projectName) => {
        calls.push(projectName);
        if (calls.length < 3) {
          throw new Error("Timeout 30000ms exceeded.");
        }
      },
    });

    expect(calls).toEqual(["pw_test", "pw", "pw_test"]);
    expect(waits).toEqual([3000]);
  });

  test("treats metadata sync timeout as a usable existing state", async () => {
    let callCount = 0;

    await runRetriablePreconditions({
      reportName: "sparkthrift2.x",
      projectNames: ["pw_test"],
      wait: async () => undefined,
      runForProject: async () => {
        callCount += 1;
        throw new Error(
          "Metadata sync timed out after 90000ms while waiting for quality_test_json_main_fail.",
        );
      },
    });

    expect(callCount).toBe(1);
  });
});
