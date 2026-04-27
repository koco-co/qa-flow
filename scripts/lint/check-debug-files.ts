#!/usr/bin/env bun
/**
 * F1 lint: forbid debug spec files at repo root.
 * Patterns: t*-debug.spec.ts, *-repro.spec.ts, diag_*.spec.ts
 */
import { readdirSync } from "node:fs";

const FORBIDDEN_PATTERNS = [/^t.+-debug\.spec\.ts$/, /^.+-repro\.spec\.ts$/, /^diag_.+\.spec\.ts$/];

const repoRoot = process.cwd();
const violations: string[] = [];

for (const name of readdirSync(repoRoot)) {
  if (FORBIDDEN_PATTERNS.some((re) => re.test(name))) {
    violations.push(name);
  }
}

if (violations.length > 0) {
  console.error("✖ F1 violation: debug spec files at repo root:");
  for (const v of violations) console.error("  -", v);
  console.error(
    "Move them to workspace/{project}/features/{slug}/tests/.debug/ " +
      "or delete after debugging.",
  );
  process.exit(1);
}
console.log("✓ F1: no debug spec files at repo root");
