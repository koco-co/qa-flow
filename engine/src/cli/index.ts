#!/usr/bin/env bun
/**
 * kata-cli main entrypoint.
 * Subcommands are mounted by domain in P1 Task 13.
 * Currently delegates to the legacy entry until physical migration completes.
 */
await import("../../../.claude/scripts/kata-cli.ts");
