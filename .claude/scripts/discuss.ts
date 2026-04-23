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
  KnowledgeDropped,
  parsePlan,
  setStrategyInPlan,
  validatePlanSchema,
} from "./lib/discuss.ts";
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
}): void {
  const { planAbs } = resolvePlanPath(opts.project, opts.prd);
  if (!existsSync(planAbs)) {
    fail(`Plan not found: ${planAbs}`);
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
  const { plan: next, remainingBlocking } = completePlanText(raw, now, knowledge);

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
// CLI wiring
// ============================================================================

export const program = createCli({
  name: "discuss",
  description: "PRD 需求讨论 plan.md 管理 CLI",
  commands: [
    {
      name: "init",
      description: "初始化 plan.md",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "PRD 文件路径", required: true },
        { flag: "--force", description: "已存在时备份并重建", defaultValue: false },
      ],
      action: (opts: { project: string; prd: string; force: boolean }) => runInit(opts),
    },
    {
      name: "read",
      description: "读取 plan.md 完整结构",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "PRD 文件路径", required: true },
      ],
      action: (opts: { project: string; prd: string }) => runRead(opts),
    },
    {
      name: "append-clarify",
      description: "追加或替换一条澄清记录",
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
      description: "完成讨论，标记 status=ready",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "PRD 文件路径", required: true },
        {
          flag: "--knowledge-summary <json>",
          description: "已沉淀的 knowledge 列表 JSON",
        },
      ],
      action: (opts: {
        project: string;
        prd: string;
        knowledgeSummary?: string;
      }) =>
        runComplete({
          project: opts.project,
          prd: opts.prd,
          knowledgeSummary: opts.knowledgeSummary,
        }),
    },
    {
      name: "reset",
      description: "备份并清除当前 plan.md",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "PRD 文件路径", required: true },
      ],
      action: (opts: { project: string; prd: string }) => runReset(opts),
    },
    {
      name: "set-strategy",
      description: "Write strategy resolution into plan.md frontmatter",
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
  ],
});
