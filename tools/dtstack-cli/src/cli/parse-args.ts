import { parseArgs } from "node:util";

export interface ParsedFlags {
  readonly values: Record<string, string | boolean | undefined>;
  readonly positionals: ReadonlyArray<string>;
}

const SCHEMA = {
  env:        { type: "string" as const, short: "e" },
  config:     { type: "string" as const, short: "c" },
  mode:       { type: "string" as const },
  project:    { type: "string" as const },
  datasource: { type: "string" as const },
  source:     { type: "string" as const, short: "s" },
  sql:        { type: "string" as const },
  file:       { type: "string" as const, short: "f" },
  name:       { type: "string" as const },
  "owner-id": { type: "string" as const },
  engines:    { type: "string" as const },
  "tables-from":  { type: "string" as const },
  "sync-timeout": { type: "string" as const },
  "skip-sync":    { type: "boolean" as const },
  "auto-create":  { type: "boolean" as const },
  username:   { type: "string" as const },
  password:   { type: "string" as const },
  "on-exists":  { type: "string" as const },
  "on-missing": { type: "string" as const },
  json:       { type: "boolean" as const },
  verbose:    { type: "boolean" as const },
} satisfies Parameters<typeof parseArgs>[0]["options"];

export function parseFlags(args: ReadonlyArray<string>): ParsedFlags {
  const { values, positionals } = parseArgs({
    args: [...args],
    options: SCHEMA,
    allowPositionals: true,
    strict: true,
  });
  return { values: values as ParsedFlags["values"], positionals };
}
