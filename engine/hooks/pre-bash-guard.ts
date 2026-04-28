#!/usr/bin/env bun
const stdin = await Bun.stdin.text();
let payload: { tool_name?: string; tool_input?: { command?: string } };
try {
  payload = JSON.parse(stdin);
} catch {
  process.exit(0);
}

if (process.env["KATA_BYPASS_HOOK"] === "1") process.exit(0);

const command = payload.tool_input?.command || "";
if (!command) process.exit(0);

type Pattern = { regex: RegExp; reason: string };
const PATTERNS: Pattern[] = [
  { regex: /\brm\s+-rf?\s+workspace\b/, reason: "rm -rf workspace/ would destroy all features" },
  { regex: /\brm\s+-rf?\s+\//, reason: "rm -rf / variant detected" },
  { regex: /\.repos\/.*git\s+push|git\s+push.*\.repos\//, reason: ".repos/ is read-only — never push" },
];

for (const p of PATTERNS) {
  if (p.regex.test(command)) {
    console.error(`[pre-bash-guard] BLOCKED: ${p.reason}\nCommand: ${command}`);
    process.exit(2);
  }
}

process.exit(0);
