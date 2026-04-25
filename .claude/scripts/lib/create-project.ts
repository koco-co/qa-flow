// lib/create-project.ts

import { existsSync, renameSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SKELETON_SPEC = {
  dirs: [
    "prds",
    "xmind",
    "archive",
    "issues",
    "history",
    "reports",
    "tests",
    "rules",
    "knowledge",
    "knowledge/modules",
    "knowledge/pitfalls",
    ".repos",
  ],
  gitkeep_dirs: [
    "prds",
    "xmind",
    "archive",
    "issues",
    "history",
    "reports",
    "tests",
    "knowledge/modules",
    "knowledge/pitfalls",
    ".repos",
  ],
  template_files: {
    "rules/README.md": "rules/README.md",
    "knowledge/overview.md": "knowledge/overview.md",
    "knowledge/terms.md": "knowledge/terms.md",
  } as Record<string, string>,
} as const;

export const RESERVED_NAMES = [
  "workspace",
  "repos",
  ".repos",
  "knowledge",
  "rules",
  "archive",
  "xmind",
  "prds",
  "issues",
  "reports",
  "history",
  "tests",
  "templates",
  "scripts",
  "plugins",
  "skills",
] as const;

/**
 * Legacy directory name used before phase 6. Kept as a constant for the
 * one-shot migration routine; not part of the active skeleton spec.
 */
const LEGACY_HISTORYS_DIR = "historys";
const CURRENT_HISTORY_DIR = "history";

export interface LegacyMigrationResult {
  renamed: boolean;
  from?: string;
  to?: string;
}

/**
 * Renames the legacy `historys/` directory to `history/` when present and the
 * new name is still free. Idempotent: returns `{ renamed: false }` when there
 * is nothing to do or when both names coexist (caller must resolve manually).
 */
export function migrateLegacyHistorys(
  projectDirAbs: string,
): LegacyMigrationResult {
  const legacy = join(projectDirAbs, LEGACY_HISTORYS_DIR);
  const current = join(projectDirAbs, CURRENT_HISTORY_DIR);
  if (!existsSync(legacy)) return { renamed: false };
  if (existsSync(current)) {
    return { renamed: false, from: legacy, to: current };
  }
  renameSync(legacy, current);
  return { renamed: true, from: legacy, to: current };
}

export const TEMPLATE_ROOT_REL = "templates/project-skeleton";

const NAME_REGEX = /^[A-Za-z][A-Za-z0-9-]*$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateProjectName(name: string): ValidationResult {
  if (name.length < 2 || name.length > 32) {
    return { valid: false, error: `length must be 2-32 (got ${name.length})` };
  }
  if (!NAME_REGEX.test(name)) {
    return {
      valid: false,
      error:
        "invalid character set (allowed: ^[A-Za-z][A-Za-z0-9-]*$)",
    };
  }
  if ((RESERVED_NAMES as readonly string[]).includes(name)) {
    return { valid: false, error: `"${name}" is a reserved system name` };
  }
  return { valid: true };
}

function repoRootFromLib(): string {
  return resolve(fileURLToPath(import.meta.url), "../../../..");
}

export function configJsonPath(): string {
  const override = process.env.CONFIG_JSON_PATH;
  if (override && override.length > 0) return override;
  return join(repoRootFromLib(), "config.json");
}

export interface SkeletonDiff {
  exists: boolean;
  missing_dirs: string[];
  missing_files: string[];
  missing_gitkeeps: string[];
  skeleton_complete: boolean;
}

export function resolveSkeletonPaths(projectDirAbs: string): {
  dirs: string[];
  gitkeeps: string[];
  templates: { src_rel: string; dst_abs: string }[];
} {
  return {
    dirs: SKELETON_SPEC.dirs.map((d) => join(projectDirAbs, d)),
    gitkeeps: SKELETON_SPEC.gitkeep_dirs.map((d) =>
      join(projectDirAbs, d, ".gitkeep"),
    ),
    templates: Object.entries(SKELETON_SPEC.template_files).map(
      ([dst_rel, src_rel]) => ({
        src_rel,
        dst_abs: join(projectDirAbs, dst_rel),
      }),
    ),
  };
}

/**
 * Computes which skeleton entries (dirs/gitkeeps/template dst files) are
 * missing from a project directory.
 *
 * @param projectDirAbs Absolute path to the target project directory.
 * @param templateRootAbs Absolute path to the template source root.
 *   Reserved for future consumers (Task 8 `applyCreate` reads templates
 *   from this root; diff itself does not require it). Keeping it in the
 *   signature locks API shape across the plan's shared symbol table.
 */
export function diffProjectSkeleton(
  projectDirAbs: string,
  templateRootAbs: string,
): SkeletonDiff {
  const exists = existsSync(projectDirAbs);
  const spec = resolveSkeletonPaths(projectDirAbs);

  const missing_dirs: string[] = [];
  for (let i = 0; i < spec.dirs.length; i++) {
    if (!existsSync(spec.dirs[i])) {
      missing_dirs.push(SKELETON_SPEC.dirs[i]);
    }
  }

  const missing_gitkeeps: string[] = [];
  for (let i = 0; i < spec.gitkeeps.length; i++) {
    if (!existsSync(spec.gitkeeps[i])) {
      missing_gitkeeps.push(`${SKELETON_SPEC.gitkeep_dirs[i]}/.gitkeep`);
    }
  }

  const missing_files: string[] = [];
  for (const t of spec.templates) {
    if (!existsSync(t.dst_abs)) {
      const rel = Object.keys(SKELETON_SPEC.template_files).find(
        (k) => join(projectDirAbs, k) === t.dst_abs,
      );
      if (rel) missing_files.push(rel);
    }
  }

  void templateRootAbs;

  const skeleton_complete =
    exists &&
    missing_dirs.length === 0 &&
    missing_gitkeeps.length === 0 &&
    missing_files.length === 0;

  return {
    exists,
    missing_dirs,
    missing_files,
    missing_gitkeeps,
    skeleton_complete,
  };
}

export interface ConfigMergeResult {
  merged: Record<string, unknown>;
  added: boolean;
}

export function mergeProjectConfig(
  existing: Record<string, unknown>,
  projectName: string,
): ConfigMergeResult {
  const projects = (existing.projects as Record<string, unknown> | undefined) ?? {};
  if (Object.prototype.hasOwnProperty.call(projects, projectName)) {
    return {
      merged: {
        ...existing,
        projects: { ...projects },
      },
      added: false,
    };
  }
  return {
    merged: {
      ...existing,
      projects: {
        ...projects,
        [projectName]: { repo_profiles: {} },
      },
    },
    added: true,
  };
}

export function renderTemplate(raw: string, vars: { project: string }): string {
  return raw.split("{{project}}").join(vars.project);
}
