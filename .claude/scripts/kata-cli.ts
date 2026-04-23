#!/usr/bin/env bun
/**
 * kata-cli.ts — Unified entry point for kata scripts.
 *
 * Usage:
 *   kata-cli <module> <command> [options]
 *   kata-cli --help                       # list all modules
 *   kata-cli <module> --help              # list module's subcommands
 *   kata-cli <module> <command> --help    # show command options (incl. choices)
 *
 * Setup (one-time, from repo root):
 *   bun install && bun link
 *   # afterwards, `kata-cli` is available globally via ~/.bun/bin/
 *
 * Each module is an existing script in .claude/scripts/ that exports a
 * commander `program`. Registered below via addCommand().
 */

import { Command } from "commander";
// NOTE: 27 subprogram imports added in Task 3

const kata = new Command()
  .name("kata-cli")
  .description("kata unified CLI — dispatches to scripts under .claude/scripts/")
  .showHelpAfterError();

// NOTE: 27 addCommand calls added in Task 3

kata.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`[kata-cli] Unexpected error: ${err}\n`);
  process.exit(1);
});

export { kata };
