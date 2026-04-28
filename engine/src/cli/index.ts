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
 * Each module is an existing script in engine/src/ that exports a
 * commander `program`. Registered below via addCommand().
 */

import { Command } from "commander";
import { initEnv } from "../lib/env.ts";
import { program as archiveGen } from "../archive-gen.ts";
import { program as autoFixer } from "../auto-fixer.ts";
import { program as caseSignalAnalyzer } from "../case-signal-analyzer.ts";
import { program as caseStrategyResolver } from "../case-strategy-resolver.ts";
import { program as config } from "../config.ts";
import { program as createProject } from "../create-project.ts";
import { program as discuss } from "../discuss.ts";
import { program as formatCheckScript } from "../format-check-script.ts";
import { program as formatReportLocator } from "../format-report-locator.ts";
import { program as historyConvert } from "../history-convert.ts";
import { program as imageCompress } from "../image-compress.ts";
import { program as knowledgeKeeper } from "../knowledge-keeper.ts";
import { program as plan } from "../plan.ts";
import { program as pluginLoader } from "../plugin-loader.ts";
import { program as prdFrontmatter } from "../prd-frontmatter.ts";
import { program as progress } from "../progress.ts";
import { program as repoProfile } from "../repo-profile.ts";
import { program as repoSync } from "../repo-sync.ts";
import { program as reportToPdf } from "../report-to-pdf.ts";
import { program as ruleLoader } from "../rule-loader.ts";
import { program as dbCli } from "../db-cli.ts";
import { program as migrateWorkspace } from "./migrate-workspace.ts";
import { program as runTestsNotify } from "../run-tests-notify.ts";
import { program as searchFilter } from "../search-filter.ts";
import { program as sourceAnalyze } from "../source-analyze.ts";
import { program as sourceRef } from "../source-ref.ts";
import { program as writerContextBuilder } from "../writer-context-builder.ts";
import { program as xmindGen } from "../xmind-gen.ts";
import { program as xmindPatch } from "../xmind-patch.ts";

const kata = new Command()
  .name("kata-cli")
  .description("kata unified CLI — dispatches to scripts under engine/src/")
  .showHelpAfterError();

kata.addCommand(archiveGen);
kata.addCommand(autoFixer);
kata.addCommand(caseSignalAnalyzer);
kata.addCommand(caseStrategyResolver);
kata.addCommand(config);
kata.addCommand(createProject);
kata.addCommand(discuss);
kata.addCommand(formatCheckScript);
kata.addCommand(formatReportLocator);
kata.addCommand(historyConvert);
kata.addCommand(imageCompress);
kata.addCommand(knowledgeKeeper);
kata.addCommand(plan);
kata.addCommand(pluginLoader);
kata.addCommand(prdFrontmatter);
kata.addCommand(progress);
kata.addCommand(repoProfile);
kata.addCommand(repoSync);
kata.addCommand(reportToPdf);
kata.addCommand(ruleLoader);
kata.addCommand(dbCli);
kata.addCommand(migrateWorkspace);
kata.addCommand(runTestsNotify);
kata.addCommand(searchFilter);
kata.addCommand(sourceAnalyze);
kata.addCommand(sourceRef);
kata.addCommand(writerContextBuilder);
kata.addCommand(xmindGen);
kata.addCommand(xmindPatch);

// ── Features commands (§4.5 tooling) ──────────────────────────
import { registerImportFix } from "./features-import-fix.ts";
import { registerLintTests } from "./features-lint-tests.ts";
import { registerReorgTests } from "./features-reorg-tests.ts";
registerImportFix(kata);
registerLintTests(kata);
registerReorgTests(kata);

// ── Skill audit (P4 §5.4 + §5.5) ────────────────────────────
import { registerSkillAudit } from "./skill-audit.ts";
registerSkillAudit(kata);

// ── Path audit (P5 §10.3) ───────────────────────────────────
import { registerPathsAudit } from "./paths-audit.ts";
registerPathsAudit(kata);

// ── Agent audit (P6 §10.2/§10.4) ───────────────────────────
import { registerAgentsAudit } from "./agents-audit.ts";
registerAgentsAudit(kata);

// ── Case lint (P7 §10.7) ───────────────────────────────────
import { registerCasesLint } from "./cases-lint.ts";
registerCasesLint(kata);

// ── Codemod (P7.5) ─────────────────────────────────────────
import { registerCodemodApply } from "./codemod-apply.ts";
registerCodemodApply(kata);

initEnv();

kata.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`[kata-cli] Unexpected error: ${err}\n`);
  process.exit(1);
});

export { kata };
