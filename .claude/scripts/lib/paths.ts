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

/** @deprecated Use project-scoped functions instead. Will be removed once all callers are migrated. */
export function workspacePath(...segments: string[]): string {
  return join(workspaceDir(), ...segments);
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
  return join(projectDir(project), ".temp");
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
