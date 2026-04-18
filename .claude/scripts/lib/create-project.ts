// lib/create-project.ts

import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SKELETON_SPEC = {
  dirs: [
    "prds",
    "xmind",
    "archive",
    "issues",
    "historys",
    "reports",
    "tests",
    "rules",
    "knowledge",
    "knowledge/modules",
    "knowledge/pitfalls",
    ".repos",
    ".temp",
  ],
  gitkeep_dirs: [
    "prds",
    "xmind",
    "archive",
    "issues",
    "historys",
    "reports",
    "tests",
    "knowledge/modules",
    "knowledge/pitfalls",
    ".repos",
    ".temp",
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
  ".temp",
  "knowledge",
  "rules",
  "archive",
  "xmind",
  "prds",
  "issues",
  "reports",
  "historys",
  "tests",
  "templates",
  "scripts",
  "plugins",
  "skills",
] as const;

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
