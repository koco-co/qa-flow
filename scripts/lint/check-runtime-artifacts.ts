#!/usr/bin/env bun
/**
 * F6 lint: forbid runtime artifact directories at repo root.
 */
import { existsSync, statSync } from "node:fs";

const FORBIDDEN_DIRS = [
  "test-results",
  "allure-results",
  "allure-report",
  "playwright-report",
  "monocart-report",
];

const violations: string[] = [];
for (const dir of FORBIDDEN_DIRS) {
  if (existsSync(dir) && statSync(dir).isDirectory()) {
    violations.push(dir);
  }
}

if (violations.length > 0) {
  console.error("✖ F6 violation: runtime artifact directories at repo root:");
  for (const v of violations) console.error("  -", v);
  console.error(
    "These should live under workspace/{project}/.runs/ " +
      "(set KATA_ACTIVE_PROJECT before running tests).",
  );
  process.exit(1);
}
console.log("✓ F6: no runtime artifact directories at repo root");
