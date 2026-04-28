#!/usr/bin/env bun
import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const stdin = await Bun.stdin.text();
let payload: { tool_name?: string; tool_input?: { file_path?: string } };
try {
  payload = JSON.parse(stdin);
} catch {
  process.exit(0);
}

const filePath = payload.tool_input?.file_path;
if (!filePath || !filePath.endsWith(".md")) process.exit(0);

const content = await readFile(filePath, "utf8");
const linkRe = /\[.+?\]\(([^)]+)\)/g;
const baseDir = dirname(filePath);
let match: RegExpExecArray | null;

while ((match = linkRe.exec(content)) !== null) {
  const target = match[1]!;
  if (!target.startsWith("./") && !target.startsWith("../")) continue;
  const resolved = resolve(join(baseDir, target));
  try {
    statSync(resolved);
  } catch {
    console.error(`[post-edit-md-link] WARNING: broken relative link '${target}' in ${filePath}`);
  }
}

process.exit(0);
