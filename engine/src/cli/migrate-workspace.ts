#!/usr/bin/env bun
/**
 * migrate-workspace.ts — CLI handler for v3 workspace migration.
 *
 * Usage:
 *   kata-cli migrate-workspace --project <name> [--mode dry|real] [--log <path>]
 *
 * Default mode is "dry" (no filesystem writes except the log file).
 */
import { Command } from "commander";
import { join } from "node:path";
import { discoverFeatures, planMigration, applyMigration } from "../migration/v3-workspace.ts";
import { repoRoot, projectDir } from "../lib/paths.ts";

export const program = new Command("migrate-workspace")
  .description("Migrate workspace to v3 layout (dry-run by default)")
  .requiredOption("--project <name>", "Project name (directory under workspace/)")
  .option("--mode <mode>", "Execution mode: dry or real", "dry")
  .option("--log <path>", "Path for the migration log JSON")
  .action(async (options: { project: string; mode: string; log?: string }) => {
    const root = repoRoot();
    const projectDirectory = projectDir(options.project);
    const kataRoot = join(root, ".kata");
    const { features, skipped } = discoverFeatures(projectDirectory, kataRoot);
    const ops = planMigration(features, projectDirectory);
    const logPath = options.log ?? join(root, `refactor-v3-P3-${options.project}-${options.mode}.log.json`);
    const log = applyMigration(ops, {
      mode: options.mode as "dry" | "real",
      project: options.project,
      logPath,
      skipped,
    });

    console.log(`[migrate-workspace] mode=${options.mode} project=${options.project}`);
    console.log(`[migrate-workspace] features=${features.length} ops=${ops.length} warnings=${log.warnings.length}`);
    console.log(`[migrate-workspace] log written to ${logPath}`);
    if (log.warnings.length > 0) {
      console.warn("[migrate-workspace] warnings:");
      for (const w of log.warnings) console.warn(`  - ${w}`);
    }
    if (skipped.length > 0) {
      console.warn(`[migrate-workspace] skipped non-yyyymm dirs: ${skipped.length}`);
      for (const s of skipped) console.warn(`  - ${s}`);
    }
  });
