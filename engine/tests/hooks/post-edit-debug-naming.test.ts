import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const HOOK = join(import.meta.dirname, "../../hooks/post-edit-debug-naming.ts");

describe("post-edit-debug-naming hook (H3)", () => {
  test("warns on t99-debug.spec.ts in cases/", () => {
    const input = JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: "/path/to/cases/t99-debug.spec.ts" },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.stderr).toContain("should be in a .debug/");
    expect(r.status).toBe(0); // warning, not block
  });

  test("silent on t99-debug.spec.ts in .debug/", () => {
    const input = JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: "/path/to/.debug/t99-debug.spec.ts" },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });
});
