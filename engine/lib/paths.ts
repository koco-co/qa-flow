import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv } from "./env.ts";

export function repoRoot(): string {
  return resolve(fileURLToPath(import.meta.url), "../../..");
}

export function workspaceDir(): string {
  const dir = getEnv("WORKSPACE_DIR") ?? "workspace";
  return resolve(repoRoot(), dir);
}

export function projectDir(project: string): string {
  return join(workspaceDir(), project);
}

export function projectPath(project: string, ...segments: string[]): string {
  return join(projectDir(project), ...segments);
}

// ── v3 path functions (spec §4.3) ────────────────────────────────────────────

/**
 * Feature directory: workspace/{project}/features/{yyyymm}-{slug}/.
 * The unit of a PRD's derived artifacts (prd.md, archive.md, cases.xmind, tests/, ...).
 */
export function featureDir(project: string, yyyymm: string, slug: string): string {
  return join(projectDir(project), "features", `${yyyymm}-${slug}`);
}

/**
 * File or subdir inside a feature directory.
 */
export function featureFile(
  project: string,
  yyyymm: string,
  slug: string,
  ...segments: string[]
): string {
  return join(featureDir(project, yyyymm, slug), ...segments);
}

/**
 * Project-level shared resources: workspace/{project}/shared/{kind}/...
 * kind ∈ {"helpers", "fixtures", "pages"}.
 */
export function projectShared(
  project: string,
  kind: "helpers" | "fixtures" | "pages",
  ...segments: string[]
): string {
  return join(projectDir(project), "shared", kind, ...segments);
}

/**
 * Non-PRD-derived bucket for ad-hoc bug reports / console errors.
 * workspace/{project}/incidents/{yyyymmdd}-{slug}/.
 */
export function incidentDir(project: string, yyyymmdd: string, slug: string): string {
  return join(projectDir(project), "incidents", `${yyyymmdd}-${slug}`);
}

/**
 * Periodic regression / smoke test batches.
 * workspace/{project}/regressions/{yyyymmdd}-{batch}/.
 */
export function regressionDir(project: string, yyyymmdd: string, batch: string): string {
  return join(projectDir(project), "regressions", `${yyyymmdd}-${batch}`);
}

/**
 * Static scan audit bucket. Diff-based scan reports for a given branch pair.
 * workspace/{project}/audits/{yyyymm}-{slug}/.
 */
export function auditDir(project: string, yyyymm: string, slug: string): string {
  return join(projectDir(project), "audits", `${yyyymm}-${slug}`);
}

export function auditFile(
  project: string,
  yyyymm: string,
  slug: string,
  ...segments: string[]
): string {
  return join(auditDir(project, yyyymm, slug), ...segments);
}

export function xmindDir(project: string): string {
  return join(projectDir(project), "xmind");
}

export function xmindPath(project: string, ...segments: string[]): string {
  return join(xmindDir(project), ...segments);
}

export function archiveDir(project: string): string {
  return join(projectDir(project), "archive");
}

export function prdsDir(project: string): string {
  return join(projectDir(project), "prds");
}

let warnedPrdDir = false;
/** @deprecated since v3 — use featureDir(project, yyyymm, slug). Returns features/{ym}-{slug}/. */
export function prdDir(project: string, yyyymm: string, slug: string): string {
  if (!warnedPrdDir) {
    console.warn("[paths] prdDir() is deprecated; use featureDir() (spec §6.3)");
    warnedPrdDir = true;
  }
  return featureDir(project, yyyymm, slug);
}

let warnedEnhancedMd = false;
/** @deprecated since v3 — use featureFile(..., "enhanced.md"). */
export function enhancedMd(project: string, yyyymm: string, slug: string): string {
  if (!warnedEnhancedMd) {
    console.warn("[paths] enhancedMd() is deprecated; use featureFile(..., 'enhanced.md') (spec §6.3)");
    warnedEnhancedMd = true;
  }
  return featureFile(project, yyyymm, slug, "enhanced.md");
}

let warnedSourceFactsJson = false;
/** @deprecated since v3 — use featureFile(..., "source-facts.json"). */
export function sourceFactsJson(project: string, yyyymm: string, slug: string): string {
  if (!warnedSourceFactsJson) {
    console.warn("[paths] sourceFactsJson() is deprecated; use featureFile(..., 'source-facts.json') (spec §6.3)");
    warnedSourceFactsJson = true;
  }
  return featureFile(project, yyyymm, slug, "source-facts.json");
}

let warnedResolvedMd = false;
/** @deprecated since v3 — use featureFile(..., "resolved.md"). */
export function resolvedMd(project: string, yyyymm: string, slug: string): string {
  if (!warnedResolvedMd) {
    console.warn("[paths] resolvedMd() is deprecated; use featureFile(..., 'resolved.md') (spec §6.3)");
    warnedResolvedMd = true;
  }
  return featureFile(project, yyyymm, slug, "resolved.md");
}

let warnedPrdImagesDir = false;
/** @deprecated since v3 — use featureFile(..., "images"). */
export function prdImagesDir(project: string, yyyymm: string, slug: string): string {
  if (!warnedPrdImagesDir) {
    console.warn("[paths] prdImagesDir() is deprecated; use featureFile(..., 'images') (spec §6.3)");
    warnedPrdImagesDir = true;
  }
  return featureFile(project, yyyymm, slug, "images");
}

let warnedOriginalPrdMd = false;
/** @deprecated since v3 — use featureFile(..., "prd.md"). Note rename: original.md → prd.md. */
export function originalPrdMd(project: string, yyyymm: string, slug: string): string {
  if (!warnedOriginalPrdMd) {
    console.warn("[paths] originalPrdMd() is deprecated; use featureFile(..., 'prd.md') (spec §6.3)");
    warnedOriginalPrdMd = true;
  }
  return featureFile(project, yyyymm, slug, "prd.md");
}

export function issuesDir(project: string): string {
  return join(projectDir(project), "issues");
}

export function reportsDir(project: string): string {
  return join(projectDir(project), "reports");
}

export function testsDir(project: string): string {
  return join(projectDir(project), "tests");
}

export function reposDir(project: string): string {
  return join(projectDir(project), ".repos");
}

export function tempDir(project: string): string {
  return join(kataRoot(), project);
}

export function probeCacheDir(project: string): string {
  return join(tempDir(project), "probe-cache");
}

export function probeCachePath(project: string, prdSlug: string): string {
  return join(probeCacheDir(project), `${prdSlug}.json`);
}

export function projectRulesDir(project: string): string {
  return join(projectDir(project), "rules");
}

export function knowledgeDir(project: string): string {
  return join(projectDir(project), "knowledge");
}

export function knowledgePath(project: string, ...segments: string[]): string {
  return join(knowledgeDir(project), ...segments);
}

export function knowledgeModulesDir(project: string): string {
  return join(knowledgeDir(project), "modules");
}

export function knowledgePitfallsDir(project: string): string {
  return join(knowledgeDir(project), "pitfalls");
}

export function scriptsDir(): string {
  return resolve(repoRoot(), "engine/src");
}

export function pluginsDir(): string {
  return resolve(repoRoot(), "plugins");
}

export function templatesDir(): string {
  return resolve(repoRoot(), "templates");
}

export function skillsDir(): string {
  return resolve(repoRoot(), ".claude/skills");
}

export function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function validateFilePath(filePath: string, allowedRoots: string[]): string {
  const resolved = resolve(filePath);
  const isAbsolute = filePath.startsWith("/");
  if (!isAbsolute) {
    const isAllowed = allowedRoots.some((root) =>
      resolved.startsWith(resolve(root)),
    );
    if (!isAllowed) {
      throw new Error(
        `Relative path "${filePath}" resolves outside allowed directories`,
      );
    }
  }
  return resolved;
}

export function parseGitUrl(url: string): { group: string; repo: string } {
  const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
  const parts = cleaned.split("/");
  const repo = parts.pop() ?? "";
  const group = parts.pop() ?? "";
  return { group, repo };
}

// ── kata 进度引擎路径 ───────────────────────────────────

/**
 * Resolve the `.kata/` root directory for the progress engine.
 *
 * KATA_ROOT_OVERRIDE (if set) must be a PARENT directory — the `.kata` segment
 * is appended internally. Pass a temp root like `/tmp/kata-test-123`, not
 * `/tmp/kata-test-123/.kata`. Used by tests to isolate progress state.
 */
function kataRoot(): string {
  const override = getEnv("KATA_ROOT_OVERRIDE");
  return override ? join(override, ".kata") : join(repoRoot(), ".kata");
}

export function kataDir(project: string): string {
  return join(kataRoot(), project);
}

export function sessionsDir(project: string, workflow: string): string {
  return join(kataDir(project), "sessions", workflow);
}

export function sessionFilePath(
  project: string,
  workflow: string,
  sessionSlug: string,
): string {
  return join(sessionsDir(project, workflow), `${sessionSlug}.json`);
}

export function locksDir(project: string): string {
  return join(kataDir(project), "locks");
}

export function blocksDir(
  project: string,
  workflow: string,
  sessionSlug: string,
): string {
  return join(kataDir(project), "blocks", workflow, sessionSlug);
}

export function legacyBackupDir(project: string): string {
  return join(kataDir(project), "legacy-backup");
}

export function listProjects(): string[] {
  const wsDir = workspaceDir();
  try {
    return readdirSync(wsDir)
      .filter((name) => {
        if (name.startsWith(".")) return false;
        try {
          return statSync(join(wsDir, name)).isDirectory();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}
