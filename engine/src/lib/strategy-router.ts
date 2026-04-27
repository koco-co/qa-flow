// Pure functions for 5-strategy selection and override composition.
// No I/O — zero imports of node:fs or any side-effectful module.
// All functions are deterministic: same input → same output.

import type { SignalLevel, SignalProfile } from "./signal-probe.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StrategyId = "S1" | "S2" | "S3" | "S4" | "S5";

export interface StrategyOverrides {
  transform?: Record<string, unknown>;
  analyze?: Record<string, unknown>;
  writer?: Record<string, unknown>;
  review?: Record<string, unknown>;
  thresholds?: Record<string, unknown>;
}

export interface StrategyResolution {
  strategy_id: StrategyId;
  strategy_name: string;
  signal_profile: SignalProfile;
  overrides: StrategyOverrides;
  resolved_at: string;
}

// ---------------------------------------------------------------------------
// Step 5: STRATEGY_NAMES
// ---------------------------------------------------------------------------

export const STRATEGY_NAMES: Record<StrategyId, string> = {
  S1: "完整型",
  S2: "源码为主",
  S3: "历史回归",
  S4: "保守兜底",
  S5: "路由外转",
};

// ---------------------------------------------------------------------------
// Step 2: selectStrategy
// ---------------------------------------------------------------------------

/**
 * Select the best-fit strategy ID from a signal profile.
 * Matching order (spec §4.3.1): S5 → S2 → S3 → S1 → S4 (default)
 *
 * S5 has highest priority: PRD missing + source strong always routes to S5,
 * even when other conditions for S1/S2 would also match.
 */
export function selectStrategy(profile: SignalProfile): StrategyId {
  const src = profile.source.level;
  const prd = profile.prd.level;
  const hist = profile.history.level;

  // 1. S5: PRD missing + source strong → external redirect
  if (prd === "missing" && src === "strong") {
    return "S5";
  }

  // 2. S2: source strong + PRD weak or missing
  if (src === "strong" && (prd === "weak" || prd === "missing")) {
    return "S2";
  }

  // 3. S3: PRD strong + history strong + source weak
  if (prd === "strong" && hist === "strong" && src === "weak") {
    return "S3";
  }

  // 4. S1: all three dimensions strong
  if (src === "strong" && prd === "strong" && hist === "strong") {
    return "S1";
  }

  // 5. S4: default fallback
  return "S4";
}

// ---------------------------------------------------------------------------
// Step 3: buildOverrides
// ---------------------------------------------------------------------------

/**
 * Map knowledge signal level to knowledge_injection string.
 * spec §4.3.3
 */
function resolveKnowledgeInjection(knowledgeLevel: SignalLevel): string {
  if (knowledgeLevel === "strong") return "read-module";
  if (knowledgeLevel === "weak") return "read-core";
  return "none";
}

/**
 * Build the full overrides object for the given strategy and knowledge level.
 * Always returns all 5 keys: transform / analyze / writer / review / thresholds.
 * writer.knowledge_injection is always present.
 * spec §4.3 + §4.3.3
 */
export function buildOverrides(
  strategyId: StrategyId,
  knowledgeLevel: SignalLevel,
): StrategyOverrides {
  const knowledgeInjection = resolveKnowledgeInjection(knowledgeLevel);

  switch (strategyId) {
    case "S1":
      return {
        transform: { prd_fill_priority: "balanced" },
        analyze: {
          dimensions: [
            "functional_positive",
            "functional_negative",
            "boundary",
            "exception",
            "compatibility",
            "security",
            "performance",
          ],
        },
        writer: {
          prompt_variant: "standard",
          knowledge_injection: knowledgeInjection,
        },
        review: { problem_rate_block: 0.4 },
        thresholds: { clarify_default_severity: "defaultable_unknown" },
      };

    case "S2":
      return {
        transform: {
          prd_fill_priority: "source_first",
          skip_field_table_healthcheck: false,
        },
        analyze: {
          dimensions: [
            "functional_positive",
            "functional_negative",
            "boundary",
            "exception",
          ],
        },
        writer: {
          prompt_variant: "source_first",
          knowledge_injection: knowledgeInjection,
        },
        review: { problem_rate_block: 0.4 },
        thresholds: { clarify_default_severity: "defaultable_unknown" },
      };

    case "S3":
      return {
        transform: { prd_fill_priority: "history_first" },
        analyze: {
          dimensions: [
            "functional_positive",
            "functional_negative",
            "boundary",
            "regression",
          ],
          regression_baseline: true,
        },
        writer: {
          prompt_variant: "regression_focused",
          reuse_history_ratio: 0.5,
          knowledge_injection: knowledgeInjection,
        },
        review: { problem_rate_block: 0.4 },
        thresholds: { clarify_default_severity: "defaultable_unknown" },
      };

    case "S4":
      return {
        transform: { prd_fill_priority: "balanced", yellow_threshold: 0.5 },
        analyze: {
          dimensions: [
            "functional_positive",
            "functional_negative",
            "boundary",
            "exception",
          ],
        },
        writer: {
          prompt_variant: "conservative",
          knowledge_injection: knowledgeInjection,
        },
        review: { problem_rate_block: 0.3 },
        thresholds: { clarify_default_severity: "blocking_unknown" },
      };

    case "S5":
      return {
        transform: { skip: true },
        analyze: { skip: true },
        writer: {
          prompt_variant: "blocked",
          knowledge_injection: knowledgeInjection,
        },
        review: { problem_rate_block: 0.4 },
        thresholds: { clarify_default_severity: "defaultable_unknown" },
      };
  }
}

// ---------------------------------------------------------------------------
// Step 4: composeResolution
// ---------------------------------------------------------------------------

/**
 * Compose a complete StrategyResolution from a signal profile and a timestamp.
 * No side effects — now is passed in to keep the function pure.
 */
export function composeResolution(
  profile: SignalProfile,
  now: Date,
): StrategyResolution {
  const id = selectStrategy(profile);
  const overrides = buildOverrides(id, profile.knowledge.level);
  return {
    strategy_id: id,
    strategy_name: STRATEGY_NAMES[id],
    signal_profile: profile,
    overrides,
    resolved_at: now.toISOString(),
  };
}
