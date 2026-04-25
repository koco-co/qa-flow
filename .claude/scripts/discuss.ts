#!/usr/bin/env bun
/**
 * discuss.ts — PRD 需求讨论 plan.md 管理。
 * Usage:
 *   kata-cli discuss <action> --project <name> --prd <prd_path> [...]
 * Actions: init | read | append-clarify | complete | reset
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { createCli } from "./lib/cli-runner.ts";
import {
  appendClarificationToPlan,
  buildInitialPlan,
  Clarification,
  completePlanText,
  HandoffMode,
  KnowledgeDropped,
  parsePlan,
  RepoConsent,
  setRepoConsentInPlan,
  setStrategyInPlan,
  validatePlanSchema,
} from "./lib/discuss.ts";
import {
  initDoc,
  readDoc,
  writeFrontmatter,
  setStatus,
  setSection,
  addSection,
  setSourceFacts,
  addPending,
  resolvePending,
  listPending,
  compactDoc,
  validateDoc,
} from "./lib/enhanced-doc-store.ts";
import { migratePlanToEnhanced } from "./lib/enhanced-doc-migrator.ts";
import { parseFrontMatter } from "./lib/frontmatter.ts";
import { planPath, plansDir, repoRoot } from "./lib/paths.ts";

function fail(message: string, code = 1): never {
  process.stderr.write(`[discuss] ${message}\n`);
  process.exit(code);
}

function info(message: string): void {
  process.stderr.write(`[discuss] ${message}\n`);
}

interface PrdMeta {
  yyyymm: string;
  slug: string;
  requirementId: string;
  requirementName: string;
}

function resolvePrdPath(prdPath: string): string {
  return isAbsolute(prdPath) ? prdPath : resolve(repoRoot(), prdPath);
}

function readPrdMeta(prdPathInput: string): PrdMeta {
  const abs = resolvePrdPath(prdPathInput);
  if (!existsSync(abs)) {
    fail(`PRD not found: ${prdPathInput}`);
  }
  const fileName = basename(abs);
  if (!fileName.endsWith(".md")) {
    fail(`PRD must be a Markdown file (.md): ${prdPathInput}`);
  }
  const slug = fileName.slice(0, -3);
  const yyyymm = basename(dirname(abs));
  if (!/^\d{6}$/.test(yyyymm)) {
    fail(
      `PRD parent directory should be YYYYMM (e.g. 202604), got: ${yyyymm}. PRD path: ${prdPathInput}`,
    );
  }

  let requirementId = "";
  let requirementName = "";
  try {
    const raw = readFileSync(abs, "utf8");
    const parsed = parseFrontMatter(raw);
    const fm = parsed.frontMatter;
    if (typeof fm.requirement_id === "string") requirementId = fm.requirement_id;
    if (typeof fm.requirement_id === "number") requirementId = String(fm.requirement_id);
    if (typeof fm.requirement_name === "string") requirementName = fm.requirement_name;
  } catch {
    // Permissive: PRD frontmatter may be malformed; main agent fills §1 later.
  }

  return { yyyymm, slug, requirementId, requirementName };
}

function resolvePlanPath(project: string, prdPathInput: string): {
  meta: PrdMeta;
  planAbs: string;
} {
  const meta = readPrdMeta(prdPathInput);
  const planAbs = planPath(project, meta.yyyymm, meta.slug);
  return { meta, planAbs };
}

function backupPlan(planAbs: string, now: Date): string {
  const ts = now.toISOString().replace(/[:.]/g, "-");
  const backup = planAbs.replace(/\.plan\.md$/, `.plan.${ts}.md`);
  renameSync(planAbs, backup);
  return backup;
}

// ============================================================================
// init
// ============================================================================

function runInit(opts: { project: string; prd: string; force: boolean }): void {
  const { meta, planAbs } = resolvePlanPath(opts.project, opts.prd);
  const now = new Date();

  if (existsSync(planAbs)) {
    const raw = readFileSync(planAbs, "utf8");
    const parsed = parsePlan(raw);
    if (parsed.frontmatter.status !== "obsolete" && !opts.force) {
      fail(
        `Plan already exists at ${planAbs} (status=${parsed.frontmatter.status}). Use 'read' to inspect or pass --force to overwrite (existing plan will be backed up).`,
      );
    }
    const backup = backupPlan(planAbs, now);
    info(`backed up existing plan to ${backup}`);
  }

  mkdirSync(plansDir(opts.project, meta.yyyymm), { recursive: true });
  const prdRel = isAbsolute(opts.prd)
    ? opts.prd.replace(repoRoot() + "/", "")
    : opts.prd;
  const plan = buildInitialPlan({
    project: opts.project,
    prdPath: prdRel,
    prdSlug: meta.slug,
    requirementId: meta.requirementId,
    requirementName: meta.requirementName || meta.slug,
    now,
  });
  writeFileSync(planAbs, plan);

  process.stdout.write(
    JSON.stringify(
      {
        plan_path: planAbs,
        status: "discussing",
        resume_anchor: "discuss-in-progress",
        prd_slug: meta.slug,
        yyyymm: meta.yyyymm,
      },
      null,
      2,
    ) + "\n",
  );
}

// ============================================================================
// read
// ============================================================================

function runRead(opts: { project: string; prd: string }): void {
  const { planAbs } = resolvePlanPath(opts.project, opts.prd);
  if (!existsSync(planAbs)) {
    fail(`Plan not found: ${planAbs}`);
  }
  const raw = readFileSync(planAbs, "utf8");
  const parsed = parsePlan(raw);
  const validation = validatePlanSchema(parsed.frontmatter);

  const payload = {
    plan_path: planAbs,
    frontmatter: parsed.frontmatter,
    summary: parsed.summary,
    clarifications: parsed.clarifications,
    schema_valid: validation.valid,
    schema_errors: validation.errors,
    pending_count: parsed.frontmatter.pending_count,
    handoff_mode: parsed.frontmatter.handoff_mode,
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  if (!validation.valid) {
    info(`schema validation failed: ${validation.errors.join("; ")}`);
    process.exit(2);
  }
}

// ============================================================================
// append-clarify
// ============================================================================

function runAppendClarify(opts: { project: string; prd: string; content: string }): void {
  const { planAbs } = resolvePlanPath(opts.project, opts.prd);
  if (!existsSync(planAbs)) {
    fail(`Plan not found: ${planAbs}. Run 'init' first.`);
  }

  let payload: Clarification;
  try {
    payload = JSON.parse(opts.content) as Clarification;
  } catch (err) {
    fail(`--content is not valid JSON: ${(err as Error).message}`);
  }

  if (!payload.id || !payload.severity || !payload.question || !payload.location) {
    fail(
      "Clarification must include id, severity, question, location at minimum.",
    );
  }
  if (!payload.options) payload.options = [];
  if (!payload.recommended_option) payload.recommended_option = "";

  const raw = readFileSync(planAbs, "utf8");
  const now = new Date();
  const { plan: next, isNew } = appendClarificationToPlan(raw, payload, now);
  writeFileSync(planAbs, next);

  const parsed = parsePlan(next);
  process.stdout.write(
    JSON.stringify(
      {
        plan_path: planAbs,
        clarification_id: payload.id,
        action: isNew ? "appended" : "replaced",
        clarify_count: parsed.frontmatter.clarify_count,
        auto_defaulted_count: parsed.frontmatter.auto_defaulted_count,
        pending_count: parsed.frontmatter.pending_count,
        discussion_rounds: parsed.frontmatter.discussion_rounds,
      },
      null,
      2,
    ) + "\n",
  );
}

// ============================================================================
// complete
// ============================================================================

function runComplete(opts: {
  project: string;
  prd: string;
  knowledgeSummary?: string;
  handoffMode?: string;
}): void {
  const { planAbs } = resolvePlanPath(opts.project, opts.prd);
  if (!existsSync(planAbs)) {
    fail(`Plan not found: ${planAbs}`);
  }

  let handoff: HandoffMode | null | undefined;
  if (opts.handoffMode !== undefined) {
    if (opts.handoffMode !== "current" && opts.handoffMode !== "new") {
      fail(`--handoff-mode must be 'current' or 'new', got: ${opts.handoffMode}`);
    }
    handoff = opts.handoffMode as HandoffMode;
  }

  let knowledge: KnowledgeDropped[] | undefined;
  if (opts.knowledgeSummary) {
    try {
      const parsed = JSON.parse(opts.knowledgeSummary);
      if (!Array.isArray(parsed)) {
        fail("--knowledge-summary must be a JSON array");
      }
      knowledge = parsed as KnowledgeDropped[];
    } catch (err) {
      fail(`--knowledge-summary is not valid JSON: ${(err as Error).message}`);
    }
  }

  const raw = readFileSync(planAbs, "utf8");
  const now = new Date();
  const { plan: next, remainingBlocking } = completePlanText(raw, now, knowledge, handoff);

  if (remainingBlocking > 0) {
    fail(
      `Cannot complete: ${remainingBlocking} blocking_unknown clarification(s) without user_answer. Use 'append-clarify' to resolve them.`,
    );
  }

  writeFileSync(planAbs, next);
  const parsed = parsePlan(next);
  process.stdout.write(
    JSON.stringify(
      {
        plan_path: planAbs,
        status: parsed.frontmatter.status,
        resume_anchor: parsed.frontmatter.resume_anchor,
        blocking_remaining: 0,
        knowledge_count: parsed.frontmatter.knowledge_dropped.length,
        handoff_mode: parsed.frontmatter.handoff_mode,
        pending_count: parsed.frontmatter.pending_count,
      },
      null,
      2,
    ) + "\n",
  );
}

// ============================================================================
// reset
// ============================================================================

function runReset(opts: { project: string; prd: string }): void {
  const { planAbs } = resolvePlanPath(opts.project, opts.prd);
  if (!existsSync(planAbs)) {
    fail(`Plan not found: ${planAbs}`);
  }
  const now = new Date();
  const backup = backupPlan(planAbs, now);
  if (existsSync(planAbs)) {
    // backup uses renameSync so original should be gone; defensive cleanup.
    unlinkSync(planAbs);
  }
  process.stdout.write(
    JSON.stringify(
      {
        plan_path: planAbs,
        backup_path: backup,
        message: "Plan archived. Run 'init' to create a fresh plan.",
      },
      null,
      2,
    ) + "\n",
  );
}

// ============================================================================
// set-strategy
// ============================================================================

function runSetStrategy(opts: {
  project: string;
  prd: string;
  strategyResolution: string;
}): void {
  let raw: string;
  if (opts.strategyResolution.startsWith("@")) {
    const filePath = opts.strategyResolution.slice(1);
    if (!existsSync(filePath)) {
      fail(`Strategy resolution file not found: ${filePath}`);
    }
    raw = readFileSync(filePath, "utf8");
  } else {
    raw = opts.strategyResolution;
  }

  let resolution;
  try {
    resolution = JSON.parse(raw);
  } catch (err) {
    fail(`invalid strategy resolution JSON: ${String(err)}`);
  }

  const { planAbs } = resolvePlanPath(opts.project, opts.prd);
  if (!existsSync(planAbs)) {
    fail(`plan not found: ${planAbs}. Run 'discuss init' first.`);
  }

  const planRaw = readFileSync(planAbs, "utf8");
  const updated = setStrategyInPlan(planRaw, resolution, new Date());
  writeFileSync(planAbs, updated);
  process.stdout.write(JSON.stringify({ ok: true, path: planAbs }) + "\n");
}

// ============================================================================
// set-repo-consent
// ============================================================================

function runSetRepoConsent(opts: {
  project: string;
  prd: string;
  content?: string;
  clear: boolean;
}): void {
  if (!opts.content && !opts.clear) {
    fail("--content or --clear is required");
  }
  if (opts.content && opts.clear) {
    fail("--content and --clear are mutually exclusive");
  }
  const { planAbs } = resolvePlanPath(opts.project, opts.prd);
  if (!existsSync(planAbs)) {
    fail(`Plan not found: ${planAbs}. Run 'init' first.`);
  }

  let consent: RepoConsent | null = null;
  if (!opts.clear) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(opts.content as string);
    } catch (err) {
      fail(`--content is not valid JSON: ${(err as Error).message}`);
    }
    const obj = parsed as Partial<RepoConsent>;
    if (!Array.isArray(obj.repos)) {
      fail("repo_consent.repos must be an array");
    }
    if (typeof obj.granted_at !== "string" || obj.granted_at.length === 0) {
      fail("repo_consent.granted_at must be a non-empty ISO string");
    }
    for (const r of obj.repos) {
      if (typeof r.path !== "string" || typeof r.branch !== "string") {
        fail("each repo must include path and branch strings");
      }
    }
    consent = { repos: obj.repos, granted_at: obj.granted_at };
  }

  const raw = readFileSync(planAbs, "utf8");
  const next = setRepoConsentInPlan(raw, consent, new Date());
  writeFileSync(planAbs, next);

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        plan_path: planAbs,
        repos_count: consent ? consent.repos.length : 0,
        cleared: opts.clear === true,
      },
      null,
      2,
    ) + "\n",
  );
}

// ============================================================================
// validate
// ============================================================================

function runValidate(opts: {
  project: string;
  prd: string;
  requireZeroBlocking: boolean;
  requireZeroPending: boolean;
}): void {
  const { planAbs } = resolvePlanPath(opts.project, opts.prd);
  if (!existsSync(planAbs)) {
    fail(`Plan not found: ${planAbs}`);
  }
  const raw = readFileSync(planAbs, "utf8");
  const parsed = parsePlan(raw);
  const validation = validatePlanSchema(parsed.frontmatter);

  const blockingUnanswered = parsed.clarifications.filter(
    (c) => c.severity === "blocking_unknown" && !c.user_answer,
  ).length;
  const pendingCount = parsed.frontmatter.pending_count ?? 0;

  const reasons: string[] = [];
  if (!validation.valid) {
    for (const e of validation.errors) reasons.push(`schema: ${e}`);
  }
  if (opts.requireZeroBlocking && blockingUnanswered > 0) {
    reasons.push(`blocking_unanswered=${blockingUnanswered}`);
  }
  if (opts.requireZeroPending && pendingCount > 0) {
    reasons.push(`pending_count=${pendingCount}`);
  }

  const ok = reasons.length === 0;
  const payload = {
    ok,
    plan_path: planAbs,
    status: parsed.frontmatter.status,
    blocking_unanswered: blockingUnanswered,
    pending_count: pendingCount,
    handoff_mode: parsed.frontmatter.handoff_mode,
    schema_valid: validation.valid,
    reasons,
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");

  if (ok) {
    return;
  }

  // Exit code precedence: schema error (1) > blocking (2) > pending (3)
  if (!validation.valid) {
    info(`validate failed: ${reasons.join("; ")}`);
    process.exit(1);
  }
  if (opts.requireZeroBlocking && blockingUnanswered > 0) {
    info(`validate failed: blocking_unanswered=${blockingUnanswered}`);
    process.exit(2);
  }
  if (opts.requireZeroPending && pendingCount > 0) {
    info(`validate failed: pending_count=${pendingCount}`);
    process.exit(3);
  }
}

// ============================================================================
// CLI wiring
// ============================================================================

export const program = createCli({
  name: "discuss",
  description: "PRD 需求讨论 enhanced.md 管理 CLI (v2)",
  commands: [
    // ── legacy (plan.md) shims ──────────────────────────────────────────────
    // Preserved for D2 regression coverage. Non-colliding commands (append-clarify,
    // complete, reset, set-strategy, set-repo-consent) are restored verbatim.
    // Colliding commands (init, read, validate) use dual-mode dispatch:
    //   --prd <path>  → legacy runXxx (plan.md)
    //   otherwise     → new enhanced-doc-store functions
    {
      name: "append-clarify",
      description: "追加或替换一条澄清记录（legacy plan.md）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "PRD 文件路径", required: true },
        { flag: "--content <json>", description: "Clarification JSON", required: true },
      ],
      action: (opts: { project: string; prd: string; content: string }) =>
        runAppendClarify(opts),
    },
    {
      name: "complete",
      description: "完成讨论，标记 status=ready（legacy plan.md）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "PRD 文件路径", required: true },
        {
          flag: "--knowledge-summary <json>",
          description: "已沉淀的 knowledge 列表 JSON",
        },
        {
          flag: "--handoff-mode <mode>",
          description: "交接模式：current（同会话继续）| new（新会话）",
        },
      ],
      action: (opts: {
        project: string;
        prd: string;
        knowledgeSummary?: string;
        handoffMode?: string;
      }) =>
        runComplete({
          project: opts.project,
          prd: opts.prd,
          knowledgeSummary: opts.knowledgeSummary,
          handoffMode: opts.handoffMode,
        }),
    },
    {
      name: "reset",
      description: "备份并清除当前 plan.md（legacy plan.md）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "PRD 文件路径", required: true },
      ],
      action: (opts: { project: string; prd: string }) => runReset(opts),
    },
    {
      name: "set-strategy",
      description: "Write strategy resolution into plan.md frontmatter（legacy plan.md）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "PRD 文件路径", required: true },
        {
          flag: "--strategy-resolution <json>",
          description: "StrategyResolution JSON or @<path>",
          required: true,
        },
      ],
      action: (opts: {
        project: string;
        prd: string;
        strategyResolution: string;
      }) => runSetStrategy(opts),
    },
    {
      name: "set-repo-consent",
      description: "写入或清空源码引用许可 frontmatter.repo_consent（legacy plan.md）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "PRD 文件路径", required: true },
        {
          flag: "--content <json>",
          description: 'RepoConsent JSON，如 \'{"repos":[{"path":"...","branch":"..."}],"granted_at":"..."}\'',
        },
        {
          flag: "--clear",
          description: "清空 repo_consent（置为 null）",
          defaultValue: false,
        },
      ],
      action: (opts: {
        project: string;
        prd: string;
        content?: string;
        clear: boolean;
      }) => runSetRepoConsent(opts),
    },
    // ── dual-mode: init (legacy --prd | new --yyyymm + --prd-slug) ──────────
    {
      name: "init",
      description: "初始化 plan.md（legacy: --prd）或创建 enhanced.md 骨架（新: --yyyymm + --prd-slug）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "[legacy] PRD 文件路径" },
        { flag: "--force", description: "[legacy] 已存在时备份并重建", defaultValue: false },
        { flag: "--yyyymm <ym>", description: "[new] 月份 YYYYMM" },
        { flag: "--prd-slug <slug>", description: "[new] PRD slug" },
        { flag: "--migrated-from-plan", description: "[new] 从 plan.md 迁移", defaultValue: false },
      ],
      action: (opts: {
        project: string;
        prd?: string;
        force: boolean;
        yyyymm?: string;
        prdSlug?: string;
        migratedFromPlan: boolean;
      }) => {
        if (opts.prd) {
          runInit({ project: opts.project, prd: opts.prd, force: opts.force });
        } else if (opts.yyyymm && opts.prdSlug) {
          initDoc(opts.project, opts.yyyymm, opts.prdSlug, { migratedFromPlan: opts.migratedFromPlan });
          process.stdout.write(JSON.stringify({ ok: true }) + "\n");
        } else {
          fail("init requires either --prd <path> (legacy) or --yyyymm + --prd-slug (new)");
        }
      },
    },
    // ── dual-mode: read (legacy --prd | new --yyyymm + --prd-slug) ──────────
    {
      name: "read",
      description: "读取 plan.md（legacy: --prd）或 enhanced.md（新: --yyyymm + --prd-slug）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "[legacy] PRD 文件路径" },
        { flag: "--yyyymm <ym>", description: "[new] 月份 YYYYMM" },
        { flag: "--prd-slug <slug>", description: "[new] PRD slug" },
      ],
      action: (opts: {
        project: string;
        prd?: string;
        yyyymm?: string;
        prdSlug?: string;
      }) => {
        if (opts.prd) {
          runRead({ project: opts.project, prd: opts.prd });
        } else if (opts.yyyymm && opts.prdSlug) {
          const doc = readDoc(opts.project, opts.yyyymm, opts.prdSlug);
          process.stdout.write(JSON.stringify(doc) + "\n");
        } else {
          fail("read requires either --prd <path> (legacy) or --yyyymm + --prd-slug (new)");
        }
      },
    },
    {
      name: "set-status",
      description: "切换 frontmatter.status",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--status <s>", description: "新状态", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string; status: string }) => {
        setStatus(opts.project, opts.yyyymm, opts.prdSlug, opts.status as any);
        process.stdout.write(JSON.stringify({ ok: true }) + "\n");
      },
    },
    {
      name: "set-section",
      description: "按锚点替换小节正文",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--anchor <a>", description: "目标锚点", required: true },
        { flag: "--content <str>", description: "Markdown 正文", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string; anchor: string; content: string }) => {
        setSection(opts.project, opts.yyyymm, opts.prdSlug, opts.anchor, opts.content);
        process.stdout.write(JSON.stringify({ ok: true }) + "\n");
      },
    },
    {
      name: "add-section",
      description: "在 §2 或 §3 下新增小节",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--parent-level <n>", description: "2 或 3", required: true },
        { flag: "--title <s>", description: "小节标题", required: true },
        { flag: "--body <s>", description: "小节正文", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string; parentLevel: string; title: string; body: string }) => {
        const anchor = addSection(opts.project, opts.yyyymm, opts.prdSlug, {
          parentLevel: Number(opts.parentLevel) as 2 | 3,
          title: opts.title,
          body: opts.body,
        });
        process.stdout.write(JSON.stringify({ anchor }) + "\n");
      },
    },
    {
      name: "set-source-facts",
      description: "写入 Appendix A 源码事实表（自动外溢 >64KB）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--content <json>", description: "SourceFacts JSON 或 @<path>", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string; content: string }) => {
        const raw = opts.content.startsWith("@")
          ? readFileSync(opts.content.slice(1), "utf8")
          : opts.content;
        setSourceFacts(opts.project, opts.yyyymm, opts.prdSlug, JSON.parse(raw));
        process.stdout.write(JSON.stringify({ ok: true }) + "\n");
      },
    },
    {
      name: "add-pending",
      description: "新增待确认项 Q",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--location <anchor>", description: "锚点", required: true },
        { flag: "--label <s>", description: "位置标签", required: true },
        { flag: "--question <s>", description: "问题文本", required: true },
        { flag: "--recommended <s>", description: "推荐方案", required: true },
        { flag: "--expected <s>", description: "预期", required: true },
        { flag: "--severity <s>", description: "blocking_unknown | defaultable_unknown | pending_for_pm", required: true },
      ],
      action: (opts: any) => {
        const id = addPending(opts.project, opts.yyyymm, opts.prdSlug, {
          locationAnchor: opts.location,
          locationLabel: opts.label,
          question: opts.question,
          recommended: opts.recommended,
          expected: opts.expected,
          severity: opts.severity,
        });
        process.stdout.write(JSON.stringify({ id }) + "\n");
      },
    },
    {
      name: "resolve",
      description: "解决一条 Q（套 <del>）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--id <qid>", description: "Q ID (q1, q2, ...)", required: true },
        { flag: "--answer <s>", description: "回答", required: true },
        { flag: "--as-default", description: "标记为默认采用", defaultValue: false },
      ],
      action: (opts: any) => {
        resolvePending(opts.project, opts.yyyymm, opts.prdSlug, opts.id, {
          answer: opts.answer,
          asDefault: !!opts.asDefault,
        });
        process.stdout.write(JSON.stringify({ ok: true }) + "\n");
      },
    },
    {
      name: "list-pending",
      description: "列出待确认项",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--format <f>", description: "json | table", defaultValue: "json" },
        { flag: "--include-resolved", description: "包含已解决", defaultValue: false },
      ],
      action: (opts: any) => {
        const items = listPending(opts.project, opts.yyyymm, opts.prdSlug, {
          includeResolved: !!opts.includeResolved,
        });
        if (opts.format === "table") {
          for (const it of items) {
            process.stdout.write(`${it.id}\t${it.status}\t${it.question}\n`);
          }
        } else {
          process.stdout.write(JSON.stringify(items) + "\n");
        }
      },
    },
    {
      name: "compact",
      description: "归档 resolved Q 到 resolved.md",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--threshold <n>", description: "阈值", defaultValue: "50" },
      ],
      action: (opts: any) => {
        const moved = compactDoc(opts.project, opts.yyyymm, opts.prdSlug, {
          threshold: Number(opts.threshold),
        });
        process.stdout.write(JSON.stringify({ moved }) + "\n");
      },
    },
    // ── dual-mode: validate (legacy --prd | new --yyyymm + --prd-slug) ───────
    {
      name: "validate",
      description: "校验 plan.md（legacy: --prd）或 enhanced.md（新: --yyyymm + --prd-slug）完整性",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "[legacy] PRD 文件路径" },
        { flag: "--require-zero-blocking", description: "[legacy] blocking_unknown > 0 则退 2", defaultValue: false },
        { flag: "--yyyymm <ym>", description: "[new] 月份" },
        { flag: "--prd-slug <slug>", description: "[new] PRD slug" },
        { flag: "--require-zero-pending", description: "pending>0 则退 3", defaultValue: false },
        { flag: "--check-source-refs <csv>", description: "[new] 逗号分隔的 source_ref 列表" },
      ],
      action: (opts: any) => {
        if (opts.prd) {
          runValidate({
            project: opts.project,
            prd: opts.prd,
            requireZeroBlocking: !!opts.requireZeroBlocking,
            requireZeroPending: !!opts.requireZeroPending,
          });
        } else if (opts.yyyymm && opts.prdSlug) {
          const r = validateDoc(opts.project, opts.yyyymm, opts.prdSlug, {
            requireZeroPending: !!opts.requireZeroPending,
            checkSourceRefs: opts.checkSourceRefs ? opts.checkSourceRefs.split(",") : undefined,
          });
          process.stdout.write(JSON.stringify(r) + "\n");
          if (!r.ok) {
            const zeroPendingIssue = r.issues.some((i: string) => i.includes("requireZeroPending"));
            process.exit(zeroPendingIssue ? 3 : 1);
          }
        } else {
          fail("validate requires either --prd <path> (legacy) or --yyyymm + --prd-slug (new)");
        }
      },
    },
    {
      name: "migrate-plan",
      description: "从 legacy plan.md 迁移到 enhanced.md",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--dry-run", description: "只输出报告不落盘", defaultValue: false },
      ],
      action: (opts: any) => {
        const report = migratePlanToEnhanced(opts.project, opts.yyyymm, opts.prdSlug, {
          dryRun: !!opts.dryRun,
        });
        process.stdout.write(JSON.stringify(report) + "\n");
      },
    },
  ],
});

if (import.meta.main) {
  program.parseAsync(process.argv);
}
