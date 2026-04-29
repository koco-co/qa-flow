import Handlebars from "handlebars";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./paths.ts";
import type { AuditMeta, Bug, ScanReport, Severity } from "./scan-report-types.ts";

interface ModuleGroup {
  module: string;
  bugs: Pick<Bug, "id" | "title" | "severity">[];
}

interface RenderContext {
  meta: AuditMeta;
  bugs: Bug[];
  modulesGrouped: ModuleGroup[];
  counts: Record<Severity | "total", number>;
  percentages: Record<Severity, number>;
  avgConfidence: string;
}

function registerHelpers(): void {
  Handlebars.registerHelper("shortCommit", (sha: string) =>
    typeof sha === "string" ? sha.slice(0, 8) : "",
  );
  Handlebars.registerHelper("percentage", (n: number) =>
    typeof n === "number" ? `${Math.round(n * 100)}%` : "",
  );
  Handlebars.registerHelper("stripStepNumber", (s: string) =>
    typeof s === "string" ? s.replace(/^\s*\d+[.、\)]\s*/, "") : s,
  );
}

function buildContext(meta: AuditMeta, report: ScanReport): RenderContext {
  const counts: Record<Severity | "total", number> = {
    total: report.bugs.length,
    critical: 0,
    major: 0,
    normal: 0,
    minor: 0,
  };
  for (const b of report.bugs) counts[b.severity] += 1;

  const total = counts.total || 1;
  const percentages: Record<Severity, number> = {
    critical: Math.round((counts.critical / total) * 100),
    major: Math.round((counts.major / total) * 100),
    normal: Math.round((counts.normal / total) * 100),
    minor: Math.round((counts.minor / total) * 100),
  };

  const moduleMap = new Map<string, ModuleGroup>();
  for (const b of report.bugs) {
    if (!moduleMap.has(b.module)) {
      moduleMap.set(b.module, { module: b.module, bugs: [] });
    }
    moduleMap.get(b.module)!.bugs.push({
      id: b.id,
      title: b.title,
      severity: b.severity,
    });
  }

  const avg =
    report.bugs.length === 0
      ? "—"
      : `${Math.round(
          (report.bugs.reduce((s, b) => s + b.confidence, 0) / report.bugs.length) * 100,
        )}%`;

  return {
    meta,
    bugs: report.bugs,
    modulesGrouped: Array.from(moduleMap.values()),
    counts,
    percentages,
    avgConfidence: avg,
  };
}

let cachedTemplate: HandlebarsTemplateDelegate | null = null;

function getTemplate(): HandlebarsTemplateDelegate {
  if (cachedTemplate) return cachedTemplate;
  registerHelpers();
  const path = join(repoRoot(), "templates", "scan-report.html.hbs");
  const src = readFileSync(path, "utf8");
  cachedTemplate = Handlebars.compile(src);
  return cachedTemplate;
}

export function renderScanReport(meta: AuditMeta, report: ScanReport): string {
  const tpl = getTemplate();
  return tpl(buildContext(meta, report));
}
