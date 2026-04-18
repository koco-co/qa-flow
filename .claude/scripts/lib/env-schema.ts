import { getEnv } from "./env.ts";

interface EnvRule {
  key: string;
  required: boolean;
  description: string;
}

const ENV_SCHEMA: EnvRule[] = [
  { key: "WORKSPACE_DIR", required: false, description: "Workspace directory path" },
  { key: "SOURCE_REPOS", required: false, description: "Comma-separated list of source repo URLs" },
  { key: "PROJECT_NAME", required: false, description: "Default project name (e.g. dataAssets)" },
];

export function validateEnv(requiredKeys?: string[]): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  const keysToCheck = requiredKeys ?? ENV_SCHEMA.filter((r) => r.required).map((r) => r.key);

  for (const key of keysToCheck) {
    const val = getEnv(key);
    if (val === undefined || val.trim() === "") {
      missing.push(key);
    }
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Validate the active environment selected by ACTIVE_ENV env var.
 *
 * For each required suffix (default: BASE_URL), checks that `{ACTIVE_ENV}_{suffix}` is set.
 * Example: ACTIVE_ENV=ci63 + requiredSuffixes=["BASE_URL"] → checks CI63_BASE_URL.
 *
 * Returns activeEnv=null when ACTIVE_ENV itself is unset.
 */
export function validateActiveEnv(
  requiredSuffixes: string[] = ["BASE_URL"],
): { valid: boolean; missing: string[]; activeEnv: string | null } {
  const raw = getEnv("ACTIVE_ENV");
  if (raw === undefined || raw.trim() === "") {
    return { valid: false, missing: ["ACTIVE_ENV"], activeEnv: null };
  }

  const activeEnv = raw.trim();
  const prefix = activeEnv.toUpperCase();
  const missing: string[] = [];

  for (const suffix of requiredSuffixes) {
    const key = `${prefix}_${suffix}`;
    const val = getEnv(key);
    if (val === undefined || val.trim() === "") {
      missing.push(key);
    }
  }

  return { valid: missing.length === 0, missing, activeEnv };
}
