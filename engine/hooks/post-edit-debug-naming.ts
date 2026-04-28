#!/usr/bin/env bun
const stdin = await Bun.stdin.text();
let payload: { tool_name?: string; tool_input?: { file_path?: string } };
try {
  payload = JSON.parse(stdin);
} catch {
  process.exit(0);
}

const filePath = payload.tool_input?.file_path;
if (!filePath) process.exit(0);

const name = filePath.split("/").pop() || "";
const isDebug = /(.+)-(debug|repro)\.spec\.ts$/.test(name) || /^diag_.+\.spec\.ts$/.test(name);
const inDebug = filePath.includes("/.debug/");

if (isDebug && !inDebug) {
  console.error(`[post-edit-debug-naming] WARNING: ${name} should be in a .debug/ directory`);
}

process.exit(0);
