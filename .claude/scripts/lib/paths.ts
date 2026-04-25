import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv } from "./env.ts";

export function repoRoot(): string {
  return resolve(fileURLToPath(import.meta.url), "../../../..");
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

export function prdDir(project: string, yyyymm: string, slug: string): string {
  return join(prdsDir(project), yyyymm, slug);
}

export function enhancedMd(project: string, yyyymm: string, slug: string): string {
  return join(prdDir(project, yyyymm, slug), "enhanced.md");
}

export function sourceFactsJson(project: string, yyyymm: string, slug: string): string {
  return join(prdDir(project, yyyymm, slug), "source-facts.json");
}

export function resolvedMd(project: string, yyyymm: string, slug: string): string {
  return join(prdDir(project, yyyymm, slug), "resolved.md");
}

export function prdImagesDir(project: string, yyyymm: string, slug: string): string {
  return join(prdDir(project, yyyymm, slug), "images");
}

export function originalPrdMd(project: string, yyyymm: string, slug: string): string {
  return join(prdDir(project, yyyymm, slug), "original.md");
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
  return resolve(repoRoot(), ".claude/scripts");
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
