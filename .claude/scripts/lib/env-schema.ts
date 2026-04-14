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
