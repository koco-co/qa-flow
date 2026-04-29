import { describe, it, expect } from "bun:test";
import {
  selectStrategy,
  buildOverrides,
  composeResolution,
  STRATEGY_NAMES,
} from "../../lib/strategy-router.ts";
import type {
  StrategyId,
  StrategyOverrides,
  StrategyResolution,
} from "../../lib/strategy-router.ts";
import type { SignalLevel, SignalProfile, SignalEntry } from "../../lib/signal-probe.ts";

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

function makeProfile(input: {
  source: SignalLevel;
  prd: SignalLevel;
  history: SignalLevel;
  knowledge: SignalLevel;
}): SignalProfile {
  const entry = (level: SignalLevel): SignalEntry => ({ level, evidence: {} });
  return {
    source: entry(input.source),
    prd: entry(input.prd),
    history: entry(input.history),
    knowledge: entry(input.knowledge),
    probed_at: "2026-04-18T00:00:00.000Z",
    project: "fixture-project",
    prd_path: "/fake/prd.md",
  };
}

// ---------------------------------------------------------------------------
// selectStrategy
// ---------------------------------------------------------------------------

describe("selectStrategy", () => {
  it("1. all-strong → S1", () => {
    const profile = makeProfile({
      source: "strong",
      prd: "strong",
      history: "strong",
      knowledge: "strong",
    });
    expect(selectStrategy(profile)).toBe("S1");
  });

  it("2. source=strong, prd=weak, history=strong, knowledge=weak → S2", () => {
    const profile = makeProfile({
      source: "strong",
      prd: "weak",
      history: "strong",
      knowledge: "weak",
    });
    expect(selectStrategy(profile)).toBe("S2");
  });

  it("3. prd=strong, source=weak, history=strong, knowledge=strong → S3", () => {
    const profile = makeProfile({
      source: "weak",
      prd: "strong",
      history: "strong",
      knowledge: "strong",
    });
    expect(selectStrategy(profile)).toBe("S3");
  });

  it("4. prd=weak, source=weak, history=weak, knowledge=missing → S4 (fallback)", () => {
    const profile = makeProfile({
      source: "weak",
      prd: "weak",
      history: "weak",
      knowledge: "missing",
    });
    expect(selectStrategy(profile)).toBe("S4");
  });

  it("5. prd=missing, source=strong, history=weak, knowledge=missing → S5 (external redirect beats S2)", () => {
    const profile = makeProfile({
      source: "strong",
      prd: "missing",
      history: "weak",
      knowledge: "missing",
    });
    expect(selectStrategy(profile)).toBe("S5");
  });

  it("6. boundary: prd=missing, source=weak → S4 (S5 requires source strong)", () => {
    const profile = makeProfile({
      source: "weak",
      prd: "missing",
      history: "weak",
      knowledge: "missing",
    });
    expect(selectStrategy(profile)).toBe("S4");
  });

  it("7. boundary: prd=strong, source=strong, history=weak → S4 (S1 requires history strong)", () => {
    const profile = makeProfile({
      source: "strong",
      prd: "strong",
      history: "weak",
      knowledge: "strong",
    });
    expect(selectStrategy(profile)).toBe("S4");
  });
});

// ---------------------------------------------------------------------------
// buildOverrides — knowledge injection
// ---------------------------------------------------------------------------

describe("buildOverrides", () => {
  it("8. S1 + knowledge=strong → writer.knowledge_injection === 'read-module'", () => {
    const overrides = buildOverrides("S1", "strong");
    expect(overrides.writer?.knowledge_injection).toBe("read-module");
  });

  it("9. S1 + knowledge=weak → writer.knowledge_injection === 'read-core'", () => {
    const overrides = buildOverrides("S1", "weak");
    expect(overrides.writer?.knowledge_injection).toBe("read-core");
  });

  it("10. S1 + knowledge=missing → writer.knowledge_injection === 'none'", () => {
    const overrides = buildOverrides("S1", "missing");
    expect(overrides.writer?.knowledge_injection).toBe("none");
  });

  it("11. S3 + knowledge=strong → reuse_history_ratio === 0.5 and knowledge_injection === 'read-module'", () => {
    const overrides = buildOverrides("S3", "strong");
    expect(overrides.writer?.reuse_history_ratio).toBe(0.5);
    expect(overrides.writer?.knowledge_injection).toBe("read-module");
  });

  it("12. S5 + knowledge=strong → writer.prompt_variant === 'blocked' and knowledge_injection === 'read-module'", () => {
    const overrides = buildOverrides("S5", "strong");
    expect(overrides.writer?.prompt_variant).toBe("blocked");
    expect(overrides.writer?.knowledge_injection).toBe("read-module");
  });

  it("buildOverrides always returns all 5 keys for every strategy", () => {
    const ids: StrategyId[] = ["S1", "S2", "S3", "S4", "S5"];
    for (const id of ids) {
      const overrides = buildOverrides(id, "weak");
      expect("transform" in overrides, `${id} missing transform`).toBeTruthy();
      expect("analyze" in overrides, `${id} missing analyze`).toBeTruthy();
      expect("writer" in overrides, `${id} missing writer`).toBeTruthy();
      expect("review" in overrides, `${id} missing review`).toBeTruthy();
      expect("thresholds" in overrides, `${id} missing thresholds`).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// composeResolution
// ---------------------------------------------------------------------------

describe("composeResolution", () => {
  it("13. resolved_at is correct ISO UTC string for +08:00 local time", () => {
    const profile = makeProfile({
      source: "strong",
      prd: "strong",
      history: "strong",
      knowledge: "strong",
    });
    const now = new Date("2026-04-18T10:30:00+08:00");
    const resolution = composeResolution(profile, now);
    expect(resolution.resolved_at).toBe("2026-04-18T02:30:00.000Z");
    expect(resolution.strategy_id).toBe("S1");
    expect(resolution.strategy_name).toBe(STRATEGY_NAMES["S1"]);
    expect(resolution.signal_profile).toBe(profile);
  });

  it("14. all required fields are present and non-empty", () => {
    const profile = makeProfile({
      source: "weak",
      prd: "strong",
      history: "strong",
      knowledge: "weak",
    });
    const now = new Date("2026-04-18T00:00:00.000Z");
    const resolution = composeResolution(profile, now);

    expect(resolution.strategy_id).toBeTruthy();
    expect(resolution.strategy_name).toBeTruthy();
    expect(resolution.signal_profile).toBeTruthy();
    expect(resolution.overrides).toBeTruthy();
    expect(resolution.resolved_at).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// STRATEGY_NAMES
// ---------------------------------------------------------------------------

describe("STRATEGY_NAMES", () => {
  it("contains entries for all 5 strategy IDs", () => {
    const ids: StrategyId[] = ["S1", "S2", "S3", "S4", "S5"];
    for (const id of ids) {
      expect(STRATEGY_NAMES[id], `STRATEGY_NAMES missing entry for ${id}`).toBeTruthy();
    }
  });

  it("S1 name is '完整型'", () => {
    expect(STRATEGY_NAMES["S1"]).toBe("完整型");
  });

  it("S5 name is '路由外转'", () => {
    expect(STRATEGY_NAMES["S5"]).toBe("路由外转");
  });
});
