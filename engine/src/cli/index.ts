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
import { initEnv } from "../../lib/env.ts";

// 大部分模块静态加载（无昂贵依赖）
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
import { program as initWizard } from "../init-wizard.ts";
import { program as knowledgeKeeper } from "../knowledge-keeper.ts";
import { program as plan } from "../plan.ts";
import { program as pluginLoader } from "../plugin-loader.ts";
import { program as prdFrontmatter } from "../prd-frontmatter.ts";
import { program as progress } from "../progress.ts";
import { program as repoProfile } from "../repo-profile.ts";
import { program as repoSync } from "../repo-sync.ts";
import { program as reportToPdf } from "../report-to-pdf.ts";
import { program as ruleLoader } from "../rule-loader.ts";
import { program as scanReport } from "../scan-report.ts";
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
  .description("kata 统一 CLI — 调度 engine/src/ 下的脚本")
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
kata.addCommand(initWizard);
kata.addCommand(knowledgeKeeper);
kata.addCommand(plan);
kata.addCommand(pluginLoader);
kata.addCommand(prdFrontmatter);
kata.addCommand(progress);
kata.addCommand(repoProfile);
kata.addCommand(repoSync);
kata.addCommand(reportToPdf);
kata.addCommand(ruleLoader);
kata.addCommand(scanReport);
// db-cli 懒加载：仅在调用 db 命令时导入（避免 better-sqlite3 缺失导致全部命令无法启动）
kata.addCommand(
  new Command("db")
    .description("数据库操作")
    .allowUnknownOption()
    .allowExcessArguments(true)
    .action(async (_opts: unknown, command: Command) => {
      const { program: dbCliModule } = await import("../db-cli.ts");
      // 用真实命令替换当前占位命令
      await dbCliModule.parseAsync(process.argv.slice(2).filter(a => a !== "db"));
    }),
);
kata.addCommand(migrateWorkspace);
kata.addCommand(runTestsNotify);
kata.addCommand(searchFilter);
kata.addCommand(sourceAnalyze);
kata.addCommand(sourceRef);
kata.addCommand(writerContextBuilder);
kata.addCommand(xmindGen);
kata.addCommand(xmindPatch);

// ── Features commands ─────────────────────────────────────────
import { registerImportFix } from "./features-import-fix.ts";
import { registerInitTests } from "./features-init-tests.ts";
import { registerLintTests } from "./features-lint-tests.ts";
import { registerReorgTests } from "./features-reorg-tests.ts";
registerImportFix(kata);
registerInitTests(kata);
registerLintTests(kata);
registerReorgTests(kata);

// ── Skill audit ──────────────────────────────────────────────
import { registerSkillAudit } from "./skill-audit.ts";
registerSkillAudit(kata);

// ── Path audit ───────────────────────────────────────────────
import { registerPathsAudit } from "./paths-audit.ts";
registerPathsAudit(kata);

// ── Agent audit ──────────────────────────────────────────────
import { registerAgentsAudit } from "./agents-audit.ts";
registerAgentsAudit(kata);

// ── Case lint ────────────────────────────────────────────────
import { registerCasesLint } from "./cases-lint.ts";
registerCasesLint(kata);

// ── Test bucket audit ────────────────────────────────────────
import { registerTestBucketAudit } from "./test-bucket-audit.ts";
registerTestBucketAudit(kata);

// ── Codemod ──────────────────────────────────────────────────
import { registerCodemodApply } from "./codemod-apply.ts";
registerCodemodApply(kata);

initEnv();

kata.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`[kata-cli] Unexpected error: ${err}\n`);
  process.exit(1);
});

export { kata };
