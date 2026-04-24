// lib/discuss.ts — PRD 需求讨论 plan.md 的纯函数层。
// 文件结构：frontmatter YAML 子集 + Markdown 章节 + §3 machine-readable JSON code-fence。
// parsePlan 仅消费 frontmatter + §3 JSON；其他章节（§2 §4 §5 §6）为渲染视图，写入时 regenerate。

import type { StrategyResolution } from "./strategy-router.ts";

export const PLAN_VERSION = 2;

export type PlanStatus = "discussing" | "ready" | "obsolete";
export type ResumeAnchor = "discuss-in-progress" | "discuss-completed";
export type ClarifySeverity =
  | "blocking_unknown"
  | "defaultable_unknown"
  | "pending_for_pm"
  | "invalid_input";

export interface KnowledgeDropped {
  type: "term" | "module" | "pitfall" | "overview";
  name: string;
}

export interface RepoConsentRepo {
  path: string;
  branch: string;
  sha?: string;
}

export interface RepoConsent {
  repos: RepoConsentRepo[];
  granted_at: string;
}

export type HandoffMode = "current" | "new";

export interface PlanFrontmatter {
  plan_version: number;
  prd_slug: string;
  prd_path: string;
  project: string;
  requirement_id: string;
  requirement_name: string;
  created_at: string;
  updated_at: string;
  status: PlanStatus;
  discussion_rounds: number;
  clarify_count: number;
  auto_defaulted_count: number;
  pending_count: number;
  resume_anchor: ResumeAnchor;
  knowledge_dropped: KnowledgeDropped[];
  handoff_mode: HandoffMode | null;
  repo_consent: RepoConsent | null;
  strategy?: string;  // inline JSON string
}

export interface ClarifyOption {
  id: string;
  description: string;
  reason?: string;
}

export interface ClarifyAnswer {
  selected_option: string;
  value: string;
  answered_at: string;
}

export interface Clarification {
  id: string;
  severity: ClarifySeverity;
  question: string;
  context?: { lanhu?: string; source?: string; archive?: string };
  location: string;
  recommended_option: string;
  options: ClarifyOption[];
  user_answer?: ClarifyAnswer;
  default_policy?: string;
}

export interface ParsedPlan {
  frontmatter: PlanFrontmatter;
  clarifications: Clarification[];
  summary: string;
  raw: string;
}

const CLARIFY_FENCE_OPEN = "<!-- clarifications-data:begin -->";
const CLARIFY_FENCE_CLOSE = "<!-- clarifications-data:end -->";
const SUMMARY_MARKER_OPEN = "<!-- summary:begin -->";
const SUMMARY_MARKER_CLOSE = "<!-- summary:end -->";

// ============================================================================
// Frontmatter serialization
// ============================================================================

function toIsoOffset(date: Date): string {
  // ISO8601 with +08:00 (project timezone convention)
  const offsetMinutes = 8 * 60;
  const local = new Date(date.getTime() + offsetMinutes * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = local.getUTCFullYear();
  const mo = pad(local.getUTCMonth() + 1);
  const d = pad(local.getUTCDate());
  const h = pad(local.getUTCHours());
  const mi = pad(local.getUTCMinutes());
  const s = pad(local.getUTCSeconds());
  return `${y}-${mo}-${d}T${h}:${mi}:${s}+08:00`;
}

function renderFrontmatter(fm: PlanFrontmatter): string {
  const lines: string[] = ["---"];
  lines.push(`plan_version: ${fm.plan_version}`);
  lines.push(`prd_slug: ${fm.prd_slug}`);
  lines.push(`prd_path: ${fm.prd_path}`);
  lines.push(`project: ${fm.project}`);
  lines.push(`requirement_id: ${fm.requirement_id}`);
  lines.push(`requirement_name: ${fm.requirement_name}`);
  lines.push(`created_at: ${fm.created_at}`);
  lines.push(`updated_at: ${fm.updated_at}`);
  lines.push(`status: ${fm.status}`);
  lines.push(`discussion_rounds: ${fm.discussion_rounds}`);
  lines.push(`clarify_count: ${fm.clarify_count}`);
  lines.push(`auto_defaulted_count: ${fm.auto_defaulted_count}`);
  lines.push(`pending_count: ${fm.pending_count}`);
  lines.push(`resume_anchor: ${fm.resume_anchor}`);
  if (fm.handoff_mode === null || fm.handoff_mode === undefined) {
    lines.push(`handoff_mode: null`);
  } else {
    lines.push(`handoff_mode: ${fm.handoff_mode}`);
  }
  if (fm.knowledge_dropped.length === 0) {
    lines.push("knowledge_dropped: []");
  } else {
    lines.push("knowledge_dropped:");
    for (const k of fm.knowledge_dropped) {
      lines.push(`  - type: ${k.type}`);
      lines.push(`    name: ${k.name}`);
    }
  }
  if (fm.repo_consent === null || fm.repo_consent === undefined) {
    lines.push("repo_consent: null");
  } else {
    lines.push("repo_consent:");
    lines.push(`  granted_at: ${fm.repo_consent.granted_at}`);
    if (fm.repo_consent.repos.length === 0) {
      lines.push("  repos: []");
    } else {
      lines.push("  repos:");
      for (const r of fm.repo_consent.repos) {
        lines.push(`    - path: ${r.path}`);
        lines.push(`      branch: ${r.branch}`);
        if (r.sha !== undefined) {
          lines.push(`      sha: ${r.sha}`);
        }
      }
    }
  }
  if (fm.strategy !== undefined) {
    const escaped = fm.strategy.replace(/'/g, "''");
    lines.push(`strategy: '${escaped}'`);
  }
  lines.push("---");
  return lines.join("\n");
}

function parseFrontmatter(raw: string): {
  frontmatter: Partial<PlanFrontmatter>;
  body: string;
} {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) {
    return { frontmatter: {}, body: raw };
  }
  const lines = raw.split("\n");
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return { frontmatter: {}, body: raw };

  const fmLines = lines.slice(1, endIdx);
  const body = lines.slice(endIdx + 1).join("\n");

  const fm: Partial<PlanFrontmatter> = { knowledge_dropped: [] };
  const knowledge: KnowledgeDropped[] = [];
  let i = 0;
  while (i < fmLines.length) {
    const line = fmLines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }

    if (/^knowledge_dropped:\s*\[\s*\]\s*$/.test(trimmed)) {
      fm.knowledge_dropped = [];
      i++;
      continue;
    }

    if (/^repo_consent:\s*null\s*$/.test(trimmed)) {
      fm.repo_consent = null;
      i++;
      continue;
    }
    if (/^repo_consent:\s*$/.test(trimmed)) {
      i++;
      let grantedAt = "";
      const repos: RepoConsentRepo[] = [];
      while (i < fmLines.length) {
        const sub = fmLines[i];
        const subTrim = sub.trim();
        if (!subTrim) {
          i++;
          continue;
        }
        const grantedMatch = sub.match(/^\s+granted_at:\s*(.+?)\s*$/);
        if (grantedMatch) {
          grantedAt = grantedMatch[1];
          i++;
          continue;
        }
        if (/^\s+repos:\s*\[\s*\]\s*$/.test(sub)) {
          i++;
          continue;
        }
        if (/^\s+repos:\s*$/.test(sub)) {
          i++;
          while (i < fmLines.length) {
            const rSub = fmLines[i];
            const pathMatch = rSub.match(/^\s+-\s+path:\s*(.+?)\s*$/);
            if (!pathMatch) break;
            const repo: RepoConsentRepo = { path: pathMatch[1], branch: "" };
            i++;
            while (i < fmLines.length) {
              const field = fmLines[i];
              const bm = field.match(/^\s+branch:\s*(.+?)\s*$/);
              const sm = field.match(/^\s+sha:\s*(.+?)\s*$/);
              if (bm) {
                repo.branch = bm[1];
                i++;
              } else if (sm) {
                repo.sha = sm[1];
                i++;
              } else {
                break;
              }
            }
            repos.push(repo);
          }
          continue;
        }
        break;
      }
      fm.repo_consent = { repos, granted_at: grantedAt };
      continue;
    }

    if (/^knowledge_dropped:\s*$/.test(trimmed)) {
      i++;
      while (i < fmLines.length) {
        const sub = fmLines[i];
        const subTrim = sub.trim();
        if (!subTrim) {
          i++;
          continue;
        }
        const itemMatch = sub.match(/^\s+-\s+type:\s*(\S+)\s*$/);
        if (!itemMatch) break;
        const itemType = itemMatch[1] as KnowledgeDropped["type"];
        i++;
        if (i < fmLines.length) {
          const nameLine = fmLines[i];
          const nameMatch = nameLine.match(/^\s+name:\s*(.+?)\s*$/);
          if (nameMatch) {
            knowledge.push({ type: itemType, name: nameMatch[1] });
            i++;
          }
        }
      }
      fm.knowledge_dropped = knowledge;
      continue;
    }

    const scalarMatch = trimmed.match(/^([a-z_]+):\s*(.*)$/);
    if (!scalarMatch) {
      i++;
      continue;
    }
    const key = scalarMatch[1];
    let value = scalarMatch[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    switch (key) {
      case "plan_version":
        fm.plan_version = Number.parseInt(value, 10);
        break;
      case "discussion_rounds":
        fm.discussion_rounds = Number.parseInt(value, 10);
        break;
      case "clarify_count":
        fm.clarify_count = Number.parseInt(value, 10);
        break;
      case "auto_defaulted_count":
        fm.auto_defaulted_count = Number.parseInt(value, 10);
        break;
      case "pending_count":
        fm.pending_count = Number.parseInt(value, 10);
        break;
      case "handoff_mode":
        fm.handoff_mode = value === "null" ? null : (value as HandoffMode);
        break;
      case "prd_slug":
        fm.prd_slug = value;
        break;
      case "prd_path":
        fm.prd_path = value;
        break;
      case "project":
        fm.project = value;
        break;
      case "requirement_id":
        fm.requirement_id = value;
        break;
      case "requirement_name":
        fm.requirement_name = value;
        break;
      case "created_at":
        fm.created_at = value;
        break;
      case "updated_at":
        fm.updated_at = value;
        break;
      case "status":
        fm.status = value as PlanStatus;
        break;
      case "resume_anchor":
        fm.resume_anchor = value as ResumeAnchor;
        break;
      case "strategy":
        fm.strategy = value.replace(/''/g, "'");
        break;
    }
    i++;
  }
  return { frontmatter: fm, body };
}

// ============================================================================
// Clarifications JSON fence
// ============================================================================

function extractClarificationsJson(body: string): Clarification[] {
  const openIdx = body.indexOf(CLARIFY_FENCE_OPEN);
  const closeIdx = body.indexOf(CLARIFY_FENCE_CLOSE);
  if (openIdx === -1 || closeIdx === -1 || closeIdx < openIdx) return [];
  const between = body.slice(openIdx + CLARIFY_FENCE_OPEN.length, closeIdx);
  const fenceMatch = between.match(/```json\n([\s\S]*?)\n```/);
  if (!fenceMatch) return [];
  try {
    const parsed = JSON.parse(fenceMatch[1]);
    if (!Array.isArray(parsed)) return [];
    return parsed as Clarification[];
  } catch {
    return [];
  }
}

function extractSummary(body: string): string {
  const openIdx = body.indexOf(SUMMARY_MARKER_OPEN);
  const closeIdx = body.indexOf(SUMMARY_MARKER_CLOSE);
  if (openIdx === -1 || closeIdx === -1 || closeIdx < openIdx) return "";
  return body
    .slice(openIdx + SUMMARY_MARKER_OPEN.length, closeIdx)
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

// ============================================================================
// Section rendering
// ============================================================================

function renderSelfCheckTable(clarifications: Clarification[]): string {
  // Aggregate by dimension keyword in `location` prefix (best-effort categorization).
  const dims = [
    { key: "字段定义", label: "字段定义" },
    { key: "交互逻辑", label: "交互逻辑" },
    { key: "导航路径", label: "导航路径" },
    { key: "状态流转", label: "状态流转" },
    { key: "权限控制", label: "权限控制" },
    { key: "异常处理", label: "异常处理" },
  ];
  const counts = new Map<string, { total: number; clarified: number; autoDefaulted: number }>();
  for (const dim of dims) {
    counts.set(dim.key, { total: 0, clarified: 0, autoDefaulted: 0 });
  }
  for (const c of clarifications) {
    for (const dim of dims) {
      if (c.location.includes(dim.key)) {
        const entry = counts.get(dim.key);
        if (!entry) break;
        entry.total += 1;
        if (c.severity === "blocking_unknown" && c.user_answer) entry.clarified += 1;
        if (c.severity === "defaultable_unknown") entry.autoDefaulted += 1;
        break;
      }
    }
  }

  const lines = [
    "| 维度 | 命中条数 | 已澄清 | 自动默认 |",
    "|---|---|---|---|",
  ];
  for (const dim of dims) {
    const entry = counts.get(dim.key) ?? { total: 0, clarified: 0, autoDefaulted: 0 };
    lines.push(
      `| ${dim.label} | ${entry.total} | ${entry.clarified} | ${entry.autoDefaulted} |`,
    );
  }
  return lines.join("\n");
}

function renderClarificationsMd(clarifications: Clarification[]): string {
  if (clarifications.length === 0) {
    return "_暂无澄清记录。由 discuss 节点在讨论中逐条追加。_";
  }
  const blocks: string[] = [];
  for (const c of clarifications) {
    const answerLine = c.user_answer
      ? `- **用户答案**：${c.user_answer.selected_option}（${c.user_answer.value}）\n- **答时**：${c.user_answer.answered_at}`
      : c.severity === "defaultable_unknown"
        ? `- **自动默认**：${c.default_policy ?? "采用 recommended_option"}`
        : "- **状态**：待解答";
    blocks.push(
      [
        `### ${c.id}（severity: ${c.severity}）`,
        `- **问题**：${c.question}`,
        `- **位置**：${c.location}`,
        `- **推荐答案**：${c.recommended_option}`,
        answerLine,
      ].join("\n"),
    );
  }
  return blocks.join("\n\n");
}

function renderAutoDefaultedTable(clarifications: Clarification[]): string {
  const auto = clarifications.filter((c) => c.severity === "defaultable_unknown");
  if (auto.length === 0) {
    return "_暂无自动默认项。_";
  }
  const rows = [
    "| ID | 位置 | 默认值 | 依据 |",
    "|---|---|---|---|",
  ];
  for (const c of auto) {
    const value = c.user_answer?.value ?? c.recommended_option;
    const reason =
      c.default_policy ?? c.options.find((o) => o.id === c.recommended_option)?.reason ?? "";
    rows.push(`| ${c.id} | ${c.location} | ${value} | ${reason} |`);
  }
  return rows.join("\n");
}

function renderKnowledgeSection(knowledge: KnowledgeDropped[]): string {
  if (knowledge.length === 0) {
    return "_暂无沉淀。讨论中由 knowledge-keeper write 落地。_";
  }
  return knowledge
    .map((k) => `- **${k.type}**：\`${k.name}\``)
    .join("\n");
}

function renderDownstreamHints(status: PlanStatus, clarifications: Clarification[]): string {
  if (status !== "ready") {
    return "_讨论未完成，下游 hints 将在 complete 时写入。_";
  }
  const blockingCount = clarifications.filter(
    (c) => c.severity === "blocking_unknown" && c.user_answer,
  ).length;
  const defaultCount = clarifications.filter((c) => c.severity === "defaultable_unknown").length;
  return [
    `- **transform**：本需求字段已在 discuss 阶段确认（${blockingCount} 条已澄清 + ${defaultCount} 条自动默认）。按 §3 / §4 直接落入 PRD，分别标注 🟢/🟡。不再生成 clarify_envelope。`,
    `- **analyze**：测试点必须覆盖 §3 全部 blocking_unknown 已澄清场景；§4 自动默认项不必单独出测试点。`,
    `- **write**：参考 §5 沉淀条目；Writer 若遇到 §3 未覆盖的 blocking_unknown，直接走 blocked_envelope 回到主 agent。`,
  ].join("\n");
}

function renderPlan(fm: PlanFrontmatter, clarifications: Clarification[], summary: string): string {
  const frontmatter = renderFrontmatter(fm);
  const summaryBlock = [SUMMARY_MARKER_OPEN, "", summary || "_TODO 主 agent 摘录_", "", SUMMARY_MARKER_CLOSE].join("\n");
  const clarifyJson = JSON.stringify(clarifications, null, 2);
  const fenceBlock = [
    CLARIFY_FENCE_OPEN,
    "```json",
    clarifyJson,
    "```",
    CLARIFY_FENCE_CLOSE,
  ].join("\n");

  const body = [
    "",
    `# 需求讨论 Plan：${fm.requirement_name}（#${fm.requirement_id}）`,
    "",
    "> 本文件由 test-case-gen 的 discuss 节点生成。",
    "> 下游节点从本文件恢复上下文；frontmatter 关键字段（plan_version / status / resume_anchor / *_count / *_at）由 discuss CLI 维护，请勿手工编辑。",
    "",
    "## 1. 需求摘要",
    "",
    summaryBlock,
    "",
    "## 2. 6 维度自检结果",
    "",
    renderSelfCheckTable(clarifications),
    "",
    "## 3. 澄清记录",
    "",
    renderClarificationsMd(clarifications),
    "",
    fenceBlock,
    "",
    "## 4. 自动默认项汇总",
    "",
    renderAutoDefaultedTable(clarifications),
    "",
    "## 5. 沉淀的 knowledge",
    "",
    renderKnowledgeSection(fm.knowledge_dropped),
    "",
    "## 6. 下游节点 hint",
    "",
    renderDownstreamHints(fm.status, clarifications),
    "",
  ].join("\n");

  return `${frontmatter}\n${body}`;
}

// ============================================================================
// Public API
// ============================================================================

export function buildInitialPlan(input: {
  project: string;
  prdPath: string;
  prdSlug: string;
  requirementId: string;
  requirementName: string;
  now: Date;
}): string {
  const iso = toIsoOffset(input.now);
  const fm: PlanFrontmatter = {
    plan_version: PLAN_VERSION,
    prd_slug: input.prdSlug,
    prd_path: input.prdPath,
    project: input.project,
    requirement_id: input.requirementId,
    requirement_name: input.requirementName,
    created_at: iso,
    updated_at: iso,
    status: "discussing",
    discussion_rounds: 0,
    clarify_count: 0,
    auto_defaulted_count: 0,
    pending_count: 0,
    resume_anchor: "discuss-in-progress",
    knowledge_dropped: [],
    handoff_mode: null,
    repo_consent: null,
  };
  return renderPlan(fm, [], "");
}

export function parsePlan(raw: string): ParsedPlan {
  const { frontmatter, body } = parseFrontmatter(raw);
  const fm = frontmatter as PlanFrontmatter;
  if (!fm.knowledge_dropped) fm.knowledge_dropped = [];
  if (fm.pending_count === undefined) fm.pending_count = 0;
  if (fm.handoff_mode === undefined) fm.handoff_mode = null;
  if (fm.repo_consent === undefined) fm.repo_consent = null;
  const clarifications = extractClarificationsJson(body);
  const summary = extractSummary(body);
  return { frontmatter: fm, clarifications, summary, raw };
}

export function appendClarificationToPlan(
  raw: string,
  incoming: Clarification,
  now: Date,
): { plan: string; isNew: boolean } {
  const parsed = parsePlan(raw);
  const existingIdx = parsed.clarifications.findIndex((c) => c.id === incoming.id);
  const isNew = existingIdx === -1;
  const nextList = [...parsed.clarifications];
  if (isNew) {
    nextList.push(incoming);
  } else {
    nextList[existingIdx] = incoming;
  }

  const fm = { ...parsed.frontmatter };
  fm.updated_at = toIsoOffset(now);
  fm.discussion_rounds = (fm.discussion_rounds ?? 0) + 1;

  // Recompute counts from scratch for idempotency
  fm.clarify_count = nextList.filter(
    (c) => c.severity === "blocking_unknown" && c.user_answer !== undefined,
  ).length;
  fm.auto_defaulted_count = nextList.filter(
    (c) => c.severity === "defaultable_unknown",
  ).length;

  return { plan: renderPlan(fm, nextList, parsed.summary), isNew };
}

export function completePlanText(
  raw: string,
  now: Date,
  knowledgeSummary?: KnowledgeDropped[],
): { plan: string; remainingBlocking: number } {
  const parsed = parsePlan(raw);
  const remaining = parsed.clarifications.filter(
    (c) => c.severity === "blocking_unknown" && !c.user_answer,
  ).length;

  const fm = { ...parsed.frontmatter };
  if (remaining === 0) {
    fm.status = "ready";
    fm.resume_anchor = "discuss-completed";
  }
  fm.updated_at = toIsoOffset(now);
  if (knowledgeSummary !== undefined) {
    fm.knowledge_dropped = knowledgeSummary;
  }

  return {
    plan: renderPlan(fm, parsed.clarifications, parsed.summary),
    remainingBlocking: remaining,
  };
}

export function validatePlanSchema(fm: Partial<PlanFrontmatter>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const required: Array<keyof PlanFrontmatter> = [
    "plan_version",
    "prd_slug",
    "prd_path",
    "project",
    "requirement_id",
    "requirement_name",
    "created_at",
    "updated_at",
    "status",
    "discussion_rounds",
    "clarify_count",
    "auto_defaulted_count",
    "pending_count",
    "resume_anchor",
  ];
  for (const key of required) {
    const v = fm[key];
    if (v === undefined || v === null || v === "") {
      errors.push(`missing field: ${key}`);
    }
  }
  if (fm.plan_version !== undefined && fm.plan_version !== PLAN_VERSION) {
    errors.push(`unsupported plan_version: ${fm.plan_version} (expected ${PLAN_VERSION})`);
  }
  if (
    fm.status !== undefined &&
    !["discussing", "ready", "obsolete"].includes(fm.status)
  ) {
    errors.push(`invalid status: ${fm.status}`);
  }
  if (
    fm.resume_anchor !== undefined &&
    !["discuss-in-progress", "discuss-completed"].includes(fm.resume_anchor)
  ) {
    errors.push(`invalid resume_anchor: ${fm.resume_anchor}`);
  }
  if (
    fm.handoff_mode !== undefined &&
    fm.handoff_mode !== null &&
    !["current", "new"].includes(fm.handoff_mode)
  ) {
    errors.push(`invalid handoff_mode: ${fm.handoff_mode}`);
  }
  return { valid: errors.length === 0, errors };
}

export function setStrategyInPlan(
  raw: string,
  resolution: StrategyResolution,
  now: Date,
): string {
  const parsed = parsePlan(raw);
  const fm = { ...parsed.frontmatter };
  fm.strategy = JSON.stringify(resolution);
  fm.updated_at = toIsoOffset(now);
  return renderPlan(fm, parsed.clarifications, parsed.summary);
}

export function shouldObsolete(planMtime: Date, prdMtime: Date): boolean {
  // 5 minute tolerance: only flag when PRD has been edited meaningfully after the plan.
  const tolerance = 5 * 60 * 1000;
  return prdMtime.getTime() > planMtime.getTime() + tolerance;
}

export const __internal = {
  renderPlan,
  parseFrontmatter,
  toIsoOffset,
  CLARIFY_FENCE_OPEN,
  CLARIFY_FENCE_CLOSE,
  SUMMARY_MARKER_OPEN,
  SUMMARY_MARKER_CLOSE,
};
