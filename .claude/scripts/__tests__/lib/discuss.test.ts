import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendClarificationToPlan,
  buildInitialPlan,
  Clarification,
  completePlanText,
  KnowledgeDropped,
  parsePlan,
  PLAN_VERSION,
  setRepoConsentInPlan,
  setStrategyInPlan,
  shouldObsolete,
  validatePlanSchema,
  __internal,
} from "../../lib/discuss.ts";
import type { StrategyResolution } from "../../lib/strategy-router.ts";

const FIXED_NOW = new Date("2026-04-18T10:30:00+08:00");
const LATER_NOW = new Date("2026-04-18T11:00:00+08:00");

const baseInput = {
  project: "dataAssets",
  prdPath: "workspace/dataAssets/prds/202604/15695.md",
  prdSlug: "15695-quality",
  requirementId: "15695",
  requirementName: "质量项目检查",
  now: FIXED_NOW,
};

function blockingClarification(overrides: Partial<Clarification> = {}): Clarification {
  return {
    id: "Q1",
    severity: "blocking_unknown",
    question: "审批状态字段是否包含已驳回？",
    location: "审批列表页 → 字段定义 → 审批状态",
    recommended_option: "B",
    options: [
      { id: "A", description: "仅保留待审批/已通过" },
      { id: "B", description: "包含 待审批/审批中/已通过/已驳回", reason: "归档与 UI 均出现" },
    ],
    ...overrides,
  };
}

function defaultableClarification(overrides: Partial<Clarification> = {}): Clarification {
  return {
    id: "Q2",
    severity: "defaultable_unknown",
    question: "列表默认排序字段是否为创建时间倒序？",
    location: "列表页 → 交互逻辑 → 默认排序",
    recommended_option: "A",
    options: [{ id: "A", description: "创建时间倒序" }],
    default_policy: "采用 source 接口默认 + 同模块归档",
    ...overrides,
  };
}

// ============================================================================
// buildInitialPlan
// ============================================================================

describe("buildInitialPlan", () => {
  it("includes all required frontmatter fields", () => {
    const plan = buildInitialPlan(baseInput);
    const parsed = parsePlan(plan);
    assert.equal(parsed.frontmatter.plan_version, PLAN_VERSION);
    assert.equal(parsed.frontmatter.prd_slug, "15695-quality");
    assert.equal(parsed.frontmatter.prd_path, "workspace/dataAssets/prds/202604/15695.md");
    assert.equal(parsed.frontmatter.project, "dataAssets");
    assert.equal(parsed.frontmatter.requirement_id, "15695");
    assert.equal(parsed.frontmatter.requirement_name, "质量项目检查");
    assert.equal(parsed.frontmatter.status, "discussing");
    assert.equal(parsed.frontmatter.resume_anchor, "discuss-in-progress");
    assert.equal(parsed.frontmatter.discussion_rounds, 0);
    assert.equal(parsed.frontmatter.clarify_count, 0);
    assert.equal(parsed.frontmatter.auto_defaulted_count, 0);
    assert.deepEqual(parsed.frontmatter.knowledge_dropped, []);
  });

  it("uses ISO8601 +08:00 timestamps for created_at and updated_at", () => {
    const plan = buildInitialPlan(baseInput);
    const parsed = parsePlan(plan);
    assert.match(parsed.frontmatter.created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/);
    assert.equal(parsed.frontmatter.created_at, parsed.frontmatter.updated_at);
  });

  it("renders title with requirement name and id", () => {
    const plan = buildInitialPlan(baseInput);
    assert.match(plan, /# 需求讨论 Plan：质量项目检查（#15695）/);
  });

  it("includes all 7 sections", () => {
    const plan = buildInitialPlan(baseInput);
    assert.match(plan, /## 1\. 需求摘要/);
    assert.match(plan, /## 2\. 10 维度自检结果/);
    assert.match(plan, /## 3\. 澄清记录/);
    assert.match(plan, /## 4\. 自动默认项汇总/);
    assert.match(plan, /## 5\. 沉淀的 knowledge/);
    assert.match(plan, /## 6\. 待定清单（pending_for_pm）/);
    assert.match(plan, /## 7\. 下游节点 hint/);
  });

  it("includes summary marker block with 4 subsection placeholders", () => {
    const plan = buildInitialPlan(baseInput);
    assert.ok(plan.includes(__internal.SUMMARY_MARKER_OPEN));
    assert.ok(plan.includes(__internal.SUMMARY_MARKER_CLOSE));
    assert.match(plan, /### 背景/);
    assert.match(plan, /### 痛点/);
    assert.match(plan, /### 目标/);
    assert.match(plan, /### 成功标准/);
    assert.match(plan, /_TODO 主 agent 摘录业务背景/);
    assert.match(plan, /_TODO 主 agent 摘录目标/);
  });

  it("includes empty clarifications JSON fence", () => {
    const plan = buildInitialPlan(baseInput);
    assert.ok(plan.includes(__internal.CLARIFY_FENCE_OPEN));
    assert.ok(plan.includes(__internal.CLARIFY_FENCE_CLOSE));
    assert.ok(plan.includes("```json\n[]\n```"));
  });
});

// ============================================================================
// parsePlan
// ============================================================================

describe("parsePlan", () => {
  it("parses freshly built plan with empty clarifications", () => {
    const plan = buildInitialPlan(baseInput);
    const parsed = parsePlan(plan);
    assert.equal(parsed.clarifications.length, 0);
    assert.match(parsed.summary, /### 背景/);
    assert.match(parsed.summary, /### 痛点/);
    assert.match(parsed.summary, /### 目标/);
    assert.match(parsed.summary, /### 成功标准/);
    assert.match(parsed.summary, /_TODO 主 agent 摘录业务背景/);
    assert.match(parsed.summary, /_TODO 主 agent 摘录可衡量的成功标准_/);
  });

  it("parses plan with single blocking clarification", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: next } = appendClarificationToPlan(plan, blockingClarification(), LATER_NOW);
    const parsed = parsePlan(next);
    assert.equal(parsed.clarifications.length, 1);
    assert.equal(parsed.clarifications[0].id, "Q1");
    assert.equal(parsed.clarifications[0].severity, "blocking_unknown");
  });

  it("parses plan with knowledge_dropped list-of-objects", () => {
    const plan = buildInitialPlan(baseInput);
    const knowledge: KnowledgeDropped[] = [
      { type: "term", name: "质量项" },
      { type: "pitfall", name: "ui-redirect" },
    ];
    const { plan: completed } = completePlanText(plan, LATER_NOW, knowledge);
    const parsed = parsePlan(completed);
    assert.equal(parsed.frontmatter.knowledge_dropped.length, 2);
    assert.deepEqual(parsed.frontmatter.knowledge_dropped[0], { type: "term", name: "质量项" });
    assert.deepEqual(parsed.frontmatter.knowledge_dropped[1], { type: "pitfall", name: "ui-redirect" });
  });

  it("returns empty knowledge_dropped when frontmatter has explicit []", () => {
    const plan = buildInitialPlan(baseInput);
    const parsed = parsePlan(plan);
    assert.deepEqual(parsed.frontmatter.knowledge_dropped, []);
  });

  it("returns empty clarifications when no fence present", () => {
    const raw = "---\nplan_version: 1\nstatus: discussing\n---\n\n# Title\n\nNo fence.\n";
    const parsed = parsePlan(raw);
    assert.equal(parsed.clarifications.length, 0);
  });
});

// ============================================================================
// appendClarificationToPlan
// ============================================================================

describe("appendClarificationToPlan", () => {
  it("adds a new blocking clarification and increments discussion_rounds", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: next, isNew } = appendClarificationToPlan(
      plan,
      blockingClarification({
        user_answer: { selected_option: "B", value: "包含已驳回", answered_at: "2026-04-18T11:00:00+08:00" },
      }),
      LATER_NOW,
    );
    assert.equal(isNew, true);
    const parsed = parsePlan(next);
    assert.equal(parsed.clarifications.length, 1);
    assert.equal(parsed.frontmatter.discussion_rounds, 1);
    assert.equal(parsed.frontmatter.clarify_count, 1);
    assert.equal(parsed.frontmatter.auto_defaulted_count, 0);
  });

  it("replaces existing clarification with same id and recomputes counts", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: afterFirst } = appendClarificationToPlan(plan, blockingClarification(), FIXED_NOW);
    const { plan: afterSecond, isNew } = appendClarificationToPlan(
      afterFirst,
      blockingClarification({
        user_answer: { selected_option: "A", value: "仅保留", answered_at: "2026-04-18T11:00:00+08:00" },
      }),
      LATER_NOW,
    );
    assert.equal(isNew, false);
    const parsed = parsePlan(afterSecond);
    assert.equal(parsed.clarifications.length, 1);
    assert.equal(parsed.clarifications[0].user_answer?.selected_option, "A");
    assert.equal(parsed.frontmatter.clarify_count, 1);
  });

  it("counts defaultable as auto_defaulted, not as clarify", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: next } = appendClarificationToPlan(plan, defaultableClarification(), LATER_NOW);
    const parsed = parsePlan(next);
    assert.equal(parsed.frontmatter.clarify_count, 0);
    assert.equal(parsed.frontmatter.auto_defaulted_count, 1);
  });

  it("does not count blocking without user_answer as clarified", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: next } = appendClarificationToPlan(plan, blockingClarification(), LATER_NOW);
    const parsed = parsePlan(next);
    assert.equal(parsed.frontmatter.clarify_count, 0);
  });

  it("updates updated_at on each append", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: next } = appendClarificationToPlan(plan, blockingClarification(), LATER_NOW);
    const parsed = parsePlan(next);
    assert.equal(parsed.frontmatter.updated_at, "2026-04-18T11:00:00+08:00");
    assert.notEqual(parsed.frontmatter.updated_at, parsed.frontmatter.created_at);
  });
});

// ============================================================================
// completePlanText
// ============================================================================

describe("completePlanText", () => {
  it("sets status=ready when all blocking are answered", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: afterQ1 } = appendClarificationToPlan(
      plan,
      blockingClarification({
        user_answer: { selected_option: "B", value: "x", answered_at: "2026-04-18T11:00:00+08:00" },
      }),
      LATER_NOW,
    );
    const { plan: completed, remainingBlocking } = completePlanText(afterQ1, LATER_NOW);
    assert.equal(remainingBlocking, 0);
    const parsed = parsePlan(completed);
    assert.equal(parsed.frontmatter.status, "ready");
    assert.equal(parsed.frontmatter.resume_anchor, "discuss-completed");
  });

  it("keeps status=discussing when blocking remains unanswered", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: afterQ1 } = appendClarificationToPlan(plan, blockingClarification(), LATER_NOW);
    const { plan: completed, remainingBlocking } = completePlanText(afterQ1, LATER_NOW);
    assert.equal(remainingBlocking, 1);
    const parsed = parsePlan(completed);
    assert.equal(parsed.frontmatter.status, "discussing");
    assert.equal(parsed.frontmatter.resume_anchor, "discuss-in-progress");
  });

  it("writes knowledge_summary into frontmatter", () => {
    const plan = buildInitialPlan(baseInput);
    const knowledge: KnowledgeDropped[] = [{ type: "term", name: "smoke-term" }];
    const { plan: completed } = completePlanText(plan, LATER_NOW, knowledge);
    const parsed = parsePlan(completed);
    assert.equal(parsed.frontmatter.knowledge_dropped.length, 1);
    assert.deepEqual(parsed.frontmatter.knowledge_dropped[0], { type: "term", name: "smoke-term" });
  });

  it("ignores knowledge_summary when undefined (preserves existing)", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: withK } = completePlanText(plan, LATER_NOW, [{ type: "term", name: "k1" }]);
    const { plan: again } = completePlanText(withK, LATER_NOW);
    const parsed = parsePlan(again);
    assert.equal(parsed.frontmatter.knowledge_dropped.length, 1);
    assert.equal(parsed.frontmatter.knowledge_dropped[0].name, "k1");
  });
});

// ============================================================================
// validatePlanSchema
// ============================================================================

describe("validatePlanSchema", () => {
  it("returns valid for fresh plan frontmatter", () => {
    const plan = buildInitialPlan(baseInput);
    const parsed = parsePlan(plan);
    const result = validatePlanSchema(parsed.frontmatter);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("flags missing required fields", () => {
    const result = validatePlanSchema({ plan_version: 1, status: "discussing" });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("prd_slug")));
    assert.ok(result.errors.some((e) => e.includes("project")));
  });

  it("flags unsupported plan_version", () => {
    const plan = buildInitialPlan(baseInput);
    const parsed = parsePlan(plan);
    const result = validatePlanSchema({ ...parsed.frontmatter, plan_version: 99 });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("plan_version")));
  });

  it("flags invalid status enum", () => {
    const plan = buildInitialPlan(baseInput);
    const parsed = parsePlan(plan);
    const result = validatePlanSchema({ ...parsed.frontmatter, status: "bogus" as never });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("status")));
  });

  it("flags invalid resume_anchor enum", () => {
    const plan = buildInitialPlan(baseInput);
    const parsed = parsePlan(plan);
    const result = validatePlanSchema({
      ...parsed.frontmatter,
      resume_anchor: "transform-completed" as never,
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("resume_anchor")));
  });
});

// ============================================================================
// shouldObsolete
// ============================================================================

describe("shouldObsolete", () => {
  it("returns false when prd is older than plan", () => {
    const plan = new Date("2026-04-18T12:00:00+08:00");
    const prd = new Date("2026-04-18T11:00:00+08:00");
    assert.equal(shouldObsolete(plan, prd), false);
  });

  it("returns false within 5-minute tolerance", () => {
    const plan = new Date("2026-04-18T12:00:00+08:00");
    const prd = new Date("2026-04-18T12:04:00+08:00");
    assert.equal(shouldObsolete(plan, prd), false);
  });

  it("returns true when prd is more than 5 minutes newer", () => {
    const plan = new Date("2026-04-18T12:00:00+08:00");
    const prd = new Date("2026-04-18T12:06:00+08:00");
    assert.equal(shouldObsolete(plan, prd), true);
  });
});

// ============================================================================
// setStrategyInPlan
// ============================================================================

const sampleResolution: StrategyResolution = {
  strategy_id: "S3",
  strategy_name: "历史回归",
  signal_profile: {
    prd_richness: "rich",
    source_availability: "full",
    history_coverage: "strong",
    testability: "high",
  },
  overrides: {},
  resolved_at: "2026-04-18T10:00:00+08:00",
};

describe("setStrategyInPlan", () => {
  it("writes strategy into frontmatter on a fresh plan (no strategy)", () => {
    const plan = buildInitialPlan(baseInput);
    const updated = setStrategyInPlan(plan, sampleResolution, FIXED_NOW);
    const parsed = parsePlan(updated);
    assert.ok(parsed.frontmatter.strategy !== undefined, "strategy should be set");
    const resolution = JSON.parse(parsed.frontmatter.strategy!);
    assert.equal(resolution.strategy_id, "S3");
    assert.equal(resolution.strategy_name, "历史回归");
  });

  it("overwrites existing strategy on subsequent call", () => {
    const plan = buildInitialPlan(baseInput);
    const firstResolution: StrategyResolution = { ...sampleResolution, strategy_id: "S1", strategy_name: "完整型" };
    const firstUpdated = setStrategyInPlan(plan, firstResolution, FIXED_NOW);
    const secondResolution: StrategyResolution = { ...sampleResolution, strategy_id: "S3", strategy_name: "历史回归" };
    const secondUpdated = setStrategyInPlan(firstUpdated, secondResolution, LATER_NOW);
    const parsed = parsePlan(secondUpdated);
    const resolution = JSON.parse(parsed.frontmatter.strategy!);
    assert.equal(resolution.strategy_id, "S3", "strategy should be replaced, not appended");
  });

  it("updates updated_at when strategy is set", () => {
    const plan = buildInitialPlan(baseInput);
    const updated = setStrategyInPlan(plan, sampleResolution, LATER_NOW);
    const parsed = parsePlan(updated);
    assert.equal(parsed.frontmatter.updated_at, "2026-04-18T11:00:00+08:00");
    assert.notEqual(parsed.frontmatter.updated_at, parsed.frontmatter.created_at);
  });

  it("preserves clarifications and summary through strategy write", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: withClarify } = appendClarificationToPlan(
      plan,
      blockingClarification(),
      FIXED_NOW,
    );
    const updated = setStrategyInPlan(withClarify, sampleResolution, LATER_NOW);
    const parsed = parsePlan(updated);
    assert.equal(parsed.clarifications.length, 1);
    assert.equal(parsed.clarifications[0].id, "Q1");
    assert.ok(parsed.frontmatter.strategy !== undefined);
  });
});

// ============================================================================
// Roundtrip + edge cases
// ============================================================================

describe("roundtrip", () => {
  it("preserves clarification structure after parse + render cycle", () => {
    const plan = buildInitialPlan(baseInput);
    const incoming = blockingClarification({
      context: { lanhu: "x", source: "y", archive: "z" },
      user_answer: { selected_option: "B", value: "包含", answered_at: "2026-04-18T11:00:00+08:00" },
    });
    const { plan: next } = appendClarificationToPlan(plan, incoming, LATER_NOW);
    const parsed = parsePlan(next);
    assert.equal(parsed.clarifications[0].id, incoming.id);
    assert.equal(parsed.clarifications[0].context?.lanhu, "x");
    assert.equal(parsed.clarifications[0].user_answer?.value, "包含");
  });

  it("maintains stable counts after appending two blocking + one defaultable", () => {
    let plan = buildInitialPlan(baseInput);
    plan = appendClarificationToPlan(
      plan,
      blockingClarification({
        id: "Q1",
        user_answer: { selected_option: "A", value: "v1", answered_at: "2026-04-18T11:00:00+08:00" },
      }),
      LATER_NOW,
    ).plan;
    plan = appendClarificationToPlan(
      plan,
      blockingClarification({
        id: "Q2",
        user_answer: { selected_option: "B", value: "v2", answered_at: "2026-04-18T11:01:00+08:00" },
      }),
      LATER_NOW,
    ).plan;
    plan = appendClarificationToPlan(plan, defaultableClarification({ id: "Q3" }), LATER_NOW).plan;
    const parsed = parsePlan(plan);
    assert.equal(parsed.clarifications.length, 3);
    assert.equal(parsed.frontmatter.clarify_count, 2);
    assert.equal(parsed.frontmatter.auto_defaulted_count, 1);
    assert.equal(parsed.frontmatter.discussion_rounds, 3);
  });
});

// ============================================================================
// Dimension matching (longest-first)
// ============================================================================

describe("dimension matching (longest-first)", () => {
  const baseFm = {
    plan_version: 2 as const,
    prd_slug: "x",
    prd_path: "x",
    project: "p",
    requirement_id: "1",
    requirement_name: "n",
    created_at: "2026-04-24T10:00:00+08:00",
    updated_at: "2026-04-24T10:00:00+08:00",
    status: "discussing" as const,
    discussion_rounds: 1,
    clarify_count: 1,
    auto_defaulted_count: 0,
    pending_count: 0,
    resume_anchor: "discuss-in-progress" as const,
    knowledge_dropped: [],
    handoff_mode: null,
    repo_consent: null,
  };

  it("classifies '历史数据迁移到数据源' as 历史数据 not 数据源", () => {
    const clars: Clarification[] = [
      {
        id: "Q1",
        severity: "blocking_unknown",
        question: "?",
        location: "历史数据迁移到数据源的字段",
        recommended_option: "A",
        options: [],
        user_answer: {
          selected_option: "A",
          value: "x",
          answered_at: "2026-04-24T00:00:00+08:00",
        },
      },
    ];
    const plan = __internal.renderPlan(baseFm, clars, "");
    // 历史数据 row: 1 total / 1 clarified / 0 auto / 0 pending
    assert.match(plan, /\| 历史数据 \| 1 \| 1 \| 0 \| 0 \|/);
    // 数据源 row: all zeros
    assert.match(plan, /\| 数据源 \| 0 \| 0 \| 0 \| 0 \|/);
  });

  it("classifies pending 'PRD 合理性审查 → 数据源' as PRD 合理性 (longer key wins)", () => {
    const clars: Clarification[] = [
      {
        id: "Q2",
        severity: "pending_for_pm",
        question: "?",
        location: "PRD 合理性审查 → 数据源边界",
        recommended_option: "否",
        options: [],
      },
    ];
    const pendingFm = {
      ...baseFm,
      clarify_count: 0,
      pending_count: 1,
    };
    const plan = __internal.renderPlan(pendingFm, clars, "");
    // PRD 合理性 row: 1 total / 0 clarified / 0 auto / 1 pending
    assert.match(plan, /\| PRD 合理性 \| 1 \| 0 \| 0 \| 1 \|/);
    // 数据源 row: all zeros
    assert.match(plan, /\| 数据源 \| 0 \| 0 \| 0 \| 0 \|/);
    // §6 pending list label should read [PRD 合理性] not [数据源]
    assert.match(plan, /- \[ \] \*\*\[PRD 合理性\]\*\* Q2:/);
  });
});

// ============================================================================
// completePlanText handoff mode guard
// ============================================================================

describe("completePlanText handoff mode guard", () => {
  it("accepts null to clear handoff_mode", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: next } = completePlanText(plan, LATER_NOW, undefined, null);
    const parsed = parsePlan(next);
    assert.equal(parsed.frontmatter.handoff_mode, null);
  });

  it("accepts 'current' and 'new' literals", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: after1 } = completePlanText(plan, LATER_NOW, undefined, "current");
    assert.equal(parsePlan(after1).frontmatter.handoff_mode, "current");
    const { plan: after2 } = completePlanText(plan, LATER_NOW, undefined, "new");
    assert.equal(parsePlan(after2).frontmatter.handoff_mode, "new");
  });

  it("throws on invalid handoffMode string", () => {
    const plan = buildInitialPlan(baseInput);
    assert.throws(
      () => completePlanText(plan, LATER_NOW, undefined, "bogus" as unknown as null),
      /invalid handoffMode: bogus/,
    );
  });

  it("undefined leaves existing handoff_mode unchanged", () => {
    const plan = buildInitialPlan(baseInput);
    const { plan: set } = completePlanText(plan, LATER_NOW, undefined, "current");
    const { plan: again } = completePlanText(set, LATER_NOW, undefined, undefined);
    assert.equal(parsePlan(again).frontmatter.handoff_mode, "current");
  });
});

// ============================================================================
// setRepoConsentInPlan lib-layer guard
// ============================================================================

describe("setRepoConsentInPlan lib-layer guard", () => {
  it("accepts null (clears consent)", () => {
    const plan = buildInitialPlan(baseInput);
    const updated = setRepoConsentInPlan(plan, null, LATER_NOW);
    const parsed = parsePlan(updated);
    assert.equal(parsed.frontmatter.repo_consent, null);
  });

  it("accepts valid non-empty consent", () => {
    const plan = buildInitialPlan(baseInput);
    const consent = {
      repos: [{ path: "workspace/p/.repos/studio", branch: "master", sha: "abc" }],
      granted_at: "2026-04-24T10:00:00+08:00",
    };
    const updated = setRepoConsentInPlan(plan, consent, LATER_NOW);
    const parsed = parsePlan(updated);
    assert.deepEqual(parsed.frontmatter.repo_consent, consent);
  });

  it("throws when granted_at missing", () => {
    const plan = buildInitialPlan(baseInput);
    assert.throws(
      () => setRepoConsentInPlan(plan, { repos: [], granted_at: "" }, LATER_NOW),
      /granted_at must be a non-empty ISO string/,
    );
  });

  it("throws when repos is not an array", () => {
    const plan = buildInitialPlan(baseInput);
    assert.throws(
      () =>
        setRepoConsentInPlan(
          plan,
          { repos: "not-array" as unknown as never, granted_at: "2026-04-24T10:00:00+08:00" },
          LATER_NOW,
        ),
      /repos must be an array/,
    );
  });

  it("throws when repo has empty path", () => {
    const plan = buildInitialPlan(baseInput);
    assert.throws(
      () =>
        setRepoConsentInPlan(
          plan,
          { repos: [{ path: "", branch: "main" }], granted_at: "2026-04-24T10:00:00+08:00" },
          LATER_NOW,
        ),
      /path must be a non-empty string/,
    );
  });
});
