import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let _cached: Record<string, string> | null = null;

export function loadDotEnv(envPath?: string): Record<string, string> {
  const target = envPath ?? resolve(process.cwd(), ".env");
  const parsed: Record<string, string> = {};
  if (!existsSync(target)) return parsed;

  const content = readFileSync(target, "utf8");
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  _cached = { ..._cached, ...parsed };
  return parsed;
}

export function getEnv(key: string): string | undefined {
  return process.env[key] ?? _cached?.[key];
}

export function getEnvOrThrow(key: string): string {
  const val = getEnv(key);
  if (val === undefined || val === "") {
    throw new Error(`Required environment variable "${key}" is not set. Check .env file.`);
  }
  return val;
}

export interface InitEnvOpts {
  cwd?: string;
}

/**
 * Initialize environment variables.
 *
 * Two modes:
 *  - Legacy single-file: `initEnv(path)` loads just that file (backward compatible).
 *  - Three-layer: `initEnv()` or `initEnv({ cwd })` loads `.env.local` > `.env.envs` > `.env` in priority order.
 *
 * `process.env` always wins — pre-existing keys are never overwritten (allows `ACTIVE_ENV=ci63 bun run ...`).
 *
 * All files are permissive: missing files do not throw.
 */
export function initEnv(arg?: string | InitEnvOpts): Record<string, string> {
  if (typeof arg === "string") {
    const parsed = loadDotEnv(arg);
    applyToProcessEnv(parsed);
    return parsed;
  }

  const baseDir = arg?.cwd ?? process.cwd();
  const envFile = loadDotEnv(resolve(baseDir, ".env"));
  const envsFile = loadDotEnv(resolve(baseDir, ".env.envs"));
  const envLocalFile = loadDotEnv(resolve(baseDir, ".env.local"));

  const merged = { ...envFile, ...envsFile, ...envLocalFile };
  applyToProcessEnv(merged);
  return merged;
}

function applyToProcessEnv(parsed: Record<string, string>): void {
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
