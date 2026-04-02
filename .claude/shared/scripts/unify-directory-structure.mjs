#!/usr/bin/env node
/**
 * unify-directory-structure.mjs
 *
 * Generic directory scaffold: ensures all module directories exist based on config.
 * Creates cases/{type}/{moduleKey}/ (and versioned subdirs if configured).
 * Replaces the former DTStack-specific migration logic.
 *
 * Usage:
 *   node .claude/shared/scripts/unify-directory-structure.mjs --dry-run  # preview
 *   node .claude/shared/scripts/unify-directory-structure.mjs            # execute
 */
import { existsSync, mkdirSync } from "fs";
import { join, relative } from "path";
import { loadConfig, getWorkspaceRoot, resolveModulePath } from "./load-config.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const BASE = getWorkspaceRoot();

function ensureDir(dir) {
  if (!existsSync(dir)) {
    if (!DRY_RUN) mkdirSync(dir, { recursive: true });
    console.log(`  CREATE ${relative(BASE, dir)}/`);
    return true;
  }
  return false;
}

function scaffoldFromConfig() {
  const config = loadConfig();
  const casesRoot = config.casesRoot ?? 'cases/';
  // New flat YYYYMM structure types; also keep legacy types for backward compatibility
  const newTypes = config.casesTypes ?? ['prds', 'archive', 'xmind', 'issues', 'history'];
  const legacyTypes = ['requirements', 'xmind', 'archive', 'history'];
  const allTopLevelTypes = [...new Set([...newTypes, ...legacyTypes])];
  let created = 0;

  // Ensure top-level type directories
  for (const type of allTopLevelTypes) {
    if (ensureDir(join(BASE, casesRoot, type))) created++;
  }

  // Ensure per-module directories (legacy module-based structure)
  for (const [moduleKey] of Object.entries(config.modules || {})) {
    for (const type of legacyTypes) {
      const relPath = resolveModulePath(moduleKey, type, config);
      if (ensureDir(join(BASE, relPath))) created++;
    }
  }

  return created;
}

console.log("=".repeat(60));
console.log(`unify-directory-structure.mjs  ${DRY_RUN ? "[DRY RUN]" : "[EXECUTE]"}`);
console.log("=".repeat(60));

const created = scaffoldFromConfig();

console.log(`\n${"=".repeat(60)}`);
console.log(`Directories ${DRY_RUN ? "that would be created" : "created"}: ${created}`);
console.log("=".repeat(60));
