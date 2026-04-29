import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { uiAutotestSteps } from "../../lib/ui-autotest.ts";
import { repoRoot } from "../../lib/paths.ts";

describe("uiAutotestSteps", () => {
  test("every dependsOn id refers to a real prior step", () => {
    const ids = new Set<string>();
    for (const step of uiAutotestSteps) {
      for (const dep of step.dependsOn) {
        expect(ids.has(dep)).toBe(true);
      }
      ids.add(step.id);
    }
  });

  test("every agentRef points to an existing agent file", () => {
    for (const step of uiAutotestSteps) {
      const ref = step.subagentConfig?.agentRef;
      if (!ref) continue;
      const agentFile = join(repoRoot(), ".claude/agents", `${ref}.md`);
      expect(existsSync(agentFile)).toBe(true);
    }
  });
});
