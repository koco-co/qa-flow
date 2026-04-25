import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { DtStackCliConfig } from "./schema";

const VAR_RE = /\$\{([A-Z0-9_]+)\}/g;

function interpolate(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(VAR_RE, (_, name: string) => process.env[name] ?? "");
  }
  if (Array.isArray(value)) return value.map(interpolate);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = interpolate(v);
    return out;
  }
  return value;
}

export function loadConfig(path: string): DtStackCliConfig {
  const raw = parse(readFileSync(path, "utf-8")) as DtStackCliConfig;
  return interpolate(raw) as DtStackCliConfig;
}
