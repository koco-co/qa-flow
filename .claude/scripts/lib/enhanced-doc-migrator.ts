import { readFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { plansDir, repoRoot, enhancedMd } from "./paths.ts";
import { initDoc, addPending, resolvePending, setSection } from "./enhanced-doc-store.ts";
import type { PendingSeverity } from "./enhanced-doc-types.ts";

export interface MigrateReport {
  qCount: number;
  migratedFromPlan: boolean;
  overviewPreserved: boolean;
  pendingBreakdown: { waiting: number; resolved: number; defaulted: number };
}

export interface MigrateOpts {
  dryRun?: boolean;
}

interface LegacyClarify {
  id: string;
  dimension: string;
  location: string;
  question: string;
  severity: string;
  recommended_option: { description: string } | string;
  user_answer?: string;
}

interface PendingCheckbox {
  location: string;
  question: string;
  recommended: string;
}

export function migratePlanToEnhanced(
  project: string,
  yyyymm: string,
  slug: string,
  opts: MigrateOpts = {},
): MigrateReport {
  const planPath = join(plansDir(project, yyyymm), `${slug}.plan.md`);
  if (!existsSync(planPath)) throw new Error(`plan not found: ${planPath}`);
  const raw = readFileSync(planPath, "utf8");
  const parsed = matter(raw);

  const summaryBlock = extractSummary(parsed.content);
  const clarifies = extractClarifies(parsed.content);
  const pending = extractPendingCheckboxes(parsed.content);

  const report: MigrateReport = {
    qCount: clarifies.length + pending.length,
    migratedFromPlan: true,
    overviewPreserved: Boolean(summaryBlock),
    pendingBreakdown: {
      waiting: pending.length,
      resolved: clarifies.filter(c => c.user_answer).length,
      defaulted: 0,
    },
  };

  if (opts.dryRun) return report;

  initDoc(project, yyyymm, slug, { migratedFromPlan: true });

  if (summaryBlock) {
    setSection(project, yyyymm, slug, findFirstAnchor(project, yyyymm, slug, 1, 1), summaryBlock.background);
    setSection(project, yyyymm, slug, findFirstAnchor(project, yyyymm, slug, 1, 2), summaryBlock.painpoint);
    setSection(project, yyyymm, slug, findFirstAnchor(project, yyyymm, slug, 1, 3), summaryBlock.goal);
    setSection(project, yyyymm, slug, findFirstAnchor(project, yyyymm, slug, 1, 4), summaryBlock.criteria);
  }

  for (const c of clarifies) {
    const qid = addPending(project, yyyymm, slug, {
      locationAnchor: "s-1",
      locationLabel: `（迁入自 plan.md §3）${c.dimension} — ${c.location}`,
      question: c.question,
      recommended: typeof c.recommended_option === "string"
        ? c.recommended_option
        : c.recommended_option.description,
      expected: "—（迁入前未记录）",
      severity: c.severity as PendingSeverity,
    });
    if (c.user_answer) {
      resolvePending(project, yyyymm, slug, qid, { answer: c.user_answer });
    }
  }

  for (const p of pending) {
    addPending(project, yyyymm, slug, {
      locationAnchor: "s-1",
      locationLabel: `（迁入自 plan.md §6）${p.location}`,
      question: p.question,
      recommended: p.recommended,
      expected: "—（迁入前未记录）",
      severity: "pending_for_pm",
    });
  }

  // Move legacy plan to backup
  const backupDir = join(repoRoot(), "workspace", project, ".temp", "legacy-plan");
  mkdirSync(backupDir, { recursive: true });
  renameSync(planPath, join(backupDir, `${slug}.plan.md`));

  return report;
}

function extractSummary(
  body: string,
): { background: string; painpoint: string; goal: string; criteria: string } | null {
  const m = body.match(/<!-- summary:begin -->([\s\S]+?)<!-- summary:end -->/);
  if (!m) return null;
  const block = m[1];
  const pick = (label: string): string => {
    const re = new RegExp(`###\\s+${label}\\s*\\n+([\\s\\S]*?)(?=\\n###\\s|$)`, "m");
    const mm = block.match(re);
    return mm ? mm[1].trim() : "";
  };
  return {
    background: pick("背景"),
    painpoint: pick("痛点"),
    goal: pick("目标"),
    criteria: pick("成功标准"),
  };
}

function extractClarifies(body: string): LegacyClarify[] {
  const m = body.match(/##\s+§3[^\n]*\n+```json\s*\n([\s\S]+?)\n```/);
  if (!m) return [];
  try {
    return JSON.parse(m[1]) as LegacyClarify[];
  } catch {
    return [];
  }
}

function extractPendingCheckboxes(body: string): PendingCheckbox[] {
  const m = body.match(/##\s+§6[^\n]*\n([\s\S]*?)(?=\n##\s|$)/);
  if (!m) return [];
  const lines = m[1].split("\n").filter(l => /^- \[ \]/.test(l));
  return lines.map(l => {
    const parts = l.match(/\*\*(.+?)\*\*:?\s*(.+?)(?:\s+—\s+AI 推荐[：:]\s*(.+))?$/);
    if (!parts) return { location: "", question: l, recommended: "" };
    return {
      location: parts[1],
      question: parts[2],
      recommended: parts[3] ?? "",
    };
  });
}

function findFirstAnchor(
  project: string,
  yyyymm: string,
  slug: string,
  level: number,
  index: number,
): string {
  const raw = readFileSync(enhancedMd(project, yyyymm, slug), "utf8");
  const re = new RegExp(`<a id="(s-${level}-${index}-[0-9a-f]{4})">`);
  const m = raw.match(re);
  if (!m) throw new Error(`anchor s-${level}-${index}-* not found`);
  return m[1];
}
