#!/usr/bin/env bun
/**
 * F2 lint: forbid references to docs/refactor/ (deleted in P0.5).
 */
import { execSync } from "node:child_process";

let output = "";
try {
  output = execSync(
    "git grep -n -E 'docs/refactor/' -- " +
      "':!docs/superpowers/' ':!REFACTOR_STATUS.md' ':!scripts/lint/'",
    { encoding: "utf8" },
  );
} catch (e: unknown) {
  // git grep exits 1 when no match (success for us)
  if ((e as { status?: number }).status === 1) {
    console.log("✓ F2: no dangling references to docs/refactor/");
    process.exit(0);
  }
  throw e;
}

if (output.trim()) {
  console.error("✖ F2 violation: stale references to docs/refactor/:");
  console.error(output);
  process.exit(1);
}
