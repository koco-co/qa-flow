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
  // 仅根目录 workspace（带可选尾斜线 + 终止符），不拦截子目录
  { regex: /(?<!["'`])\brm\s+-rf?\s+workspace\/?(?:\s|$|;|&|\|)/, reason: "rm -rf workspace/ would destroy all features (use rm -rf workspace/{project}/{subdir} instead)" },
  // 仅孤立的 rm -rf /（终止符 / 行尾），不拦截 /tmp/ /home/ 或 echo 字符串内的
  { regex: /(?<!["'`])\brm\s+-rf?\s+\/(?:\s|$|;|&|\|)/, reason: "rm -rf / variant detected" },
  { regex: /\.repos\/.*git\s+push|git\s+push.*\.repos\//, reason: ".repos/ is read-only — never push" },
];

for (const p of PATTERNS) {
  if (p.regex.test(command)) {
    console.error(`[pre-bash-guard] BLOCKED: ${p.reason}\nCommand: ${command}`);
    process.exit(2);
  }
}

process.exit(0);
