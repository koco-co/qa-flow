#!/usr/bin/env bun
/**
 * qa.ts — Unified entry point for qa-flow scripts.
 *
 * Usage:
 *   bun run qa <module> <command> [options]
 *   bun run qa --help                      # list all modules
 *   bun run qa <module> --help             # list module's subcommands
 *   bun run qa <module> <command> --help   # show command options (incl. choices)
 *
 * Each module is an existing script in .claude/scripts/ that exports a
 * commander `program`. The subprograms are attached verbatim, so existing
 * `bun run .claude/scripts/<script>.ts` invocations keep working in parallel.
 */

import { Command } from "commander";
import { program as knowledgeKeeper } from "./knowledge-keeper.ts";
import { program as repoSync } from "./repo-sync.ts";
import { program as ruleLoader } from "./rule-loader.ts";

const qa = new Command()
  .name("qa")
  .description("qa-flow unified CLI — dispatches to scripts under .claude/scripts/")
  .showHelpAfterError();

qa.addCommand(ruleLoader);
qa.addCommand(knowledgeKeeper);
qa.addCommand(repoSync);

if (import.meta.main) {
  qa.parseAsync(process.argv).catch((err) => {
    process.stderr.write(`[qa] Unexpected error: ${err}\n`);
    process.exit(1);
  });
}

export { qa };
