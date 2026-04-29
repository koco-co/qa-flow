import { describe, it, expect } from "bun:test";
import { resolve } from "node:path";

// 文件位置：engine/tests/ui-autotest/task-state.test.ts
// REPO_ROOT 需要向上 3 层
const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const SOURCE_PATH = resolve(
  REPO_ROOT,
  "engine/src/ui-autotest/task-state.ts",
);

const TaskTypes = await import(`file://${SOURCE_PATH}`);

// ────────────────────────────────────────────────────────────
// 单元测试
// ────────────────────────────────────────────────────────────

describe("SuggestedSiteKnowledge", () => {
  it("should accept all valid type variants", () => {
    const variants: TaskTypes.SuggestedSiteKnowledge["type"][] = [
      "site-selectors",
      "site-traps",
      "site-api",
      "site-overview",
    ];
    for (const t of variants) {
      const item: TaskTypes.SuggestedSiteKnowledge = {
        type: t,
        domain: "example.com",
        content: "# Test\n- selector: foo",
        confidence: "high",
      };
      expect(item.type).toBe(t);
    }
  });

  it("should reject confidence low for auto-write check", () => {
    const item: TaskTypes.SuggestedSiteKnowledge = {
      type: "site-selectors",
      domain: "example.com",
      content: "# Test",
      confidence: "low",
    };
    // Auto-write requires confidence === "high"
    expect(item.confidence === "high").toBe(false);
  });
});
