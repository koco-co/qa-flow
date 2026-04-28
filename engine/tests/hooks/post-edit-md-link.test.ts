import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const HOOK = join(import.meta.dirname, "../../hooks/post-edit-md-link.ts");

describe("post-edit-md-link hook (H4)", () => {
  test("warns on broken relative link", () => {
    const input = JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: join(import.meta.dirname, "fixtures/md-broken-link.fixture.md") },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.stderr).toContain("broken");
    expect(r.status).toBe(0);
  });

  test("silent when all links resolve", () => {
    const input = JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: join(import.meta.dirname, "fixtures/md-good-link.fixture.md") },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });
});
