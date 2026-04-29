#!/usr/bin/env bun
/**
 * scan-report.ts — kata-cli module for static-scan reports.
 *
 * Subcommands:
 *   create / add-bug / update-bug / update-bug-steps / remove-bug / set-meta / show / render
 *
 * Spec: docs/superpowers/specs/2026-04-29-static-scan-skill-design.md
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createCli } from "../lib/cli-runner.ts";
import { auditDir, currentYYYYMM, projectDir } from "../lib/paths.ts";
import { fetchAndDiff } from "../lib/scan-report-diff.ts";
import { addBug, initAudit, nextBugId, removeBug } from "../lib/scan-report-store.ts";
import {
  type AuditMeta,
  type Bug,
  SCAN_REPORT_SCHEMA_VERSION,
} from "../lib/scan-report-types.ts";

function ensureParent(p: string): void {
  const d = dirname(p);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

interface CreateOpts {
  project: string;
  repo: string;
  baseBranch: string;
  headBranch: string;
  slug?: string;
  yyyymm?: string;
  relatedFeature?: string;
  skipFetch?: boolean;
}

function defaultSlug(repo: string, base: string, head: string): string {
  const norm = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${norm(repo)}_${norm(base)}__${norm(head)}`;
}

function fail(code: number, msg: string): never {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

function loadBugJson(path: string): Bug {
  if (!existsSync(path)) fail(1, `[scan-report] json not found: ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Bug;
  } catch (e) {
    fail(1, `[scan-report] invalid JSON: ${(e as Error).message}`);
  }
}

async function actionCreate(opts: CreateOpts): Promise<void> {
  const repoPath = join(projectDir(opts.project), ".repos", opts.repo);
  if (!existsSync(repoPath)) {
    fail(1, `[scan-report] repo not found at ${repoPath} — run 'kata-cli repo-sync sync ...' first`);
  }
  const yyyymm = opts.yyyymm ?? currentYYYYMM();
  const slug = opts.slug ?? defaultSlug(opts.repo, opts.baseBranch, opts.headBranch);

  let diffOut;
  try {
    diffOut = fetchAndDiff(repoPath, opts.baseBranch, opts.headBranch, {
      skipFetch: opts.skipFetch,
    });
  } catch (e) {
    fail(3, `[scan-report] git diff failed: ${(e as Error).message}`);
  }

  const meta: AuditMeta = {
    schema_version: SCAN_REPORT_SCHEMA_VERSION,
    project: opts.project,
    repo: opts.repo,
    base_branch: opts.baseBranch,
    head_branch: opts.headBranch,
    base_commit: diffOut.base_commit,
    head_commit: diffOut.head_commit,
    scan_time: new Date().toISOString(),
    reviewer: null,
    related_feature: opts.relatedFeature ?? null,
    diff_stats: diffOut.stats,
    summary: "",
  };

  initAudit(opts.project, yyyymm, slug, meta);

  const dir = auditDir(opts.project, yyyymm, slug);
  const diffPath = join(dir, "diff.patch");
  ensureParent(diffPath);
  writeFileSync(diffPath, diffOut.diff, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        slug,
        yyyymm,
        audit_dir: dir,
        diff_files: diffOut.stats.files,
        diff_lines: diffOut.stats.additions + diffOut.stats.deletions,
      },
      null,
      0,
    )}\n`,
  );
}

export const program = createCli({
  name: "scan-report",
  description: "Static-scan report CRUD + render (spec §4.1)",
  commands: [
    {
      name: "create",
      description: "Init audit, compute diff, write meta.json/report.json/diff.patch",
      options: [
        { flag: "--project <name>", description: "project name", required: true },
        { flag: "--repo <name>", description: "repo dir under workspace/{project}/.repos/", required: true },
        { flag: "--base-branch <ref>", description: "baseline branch (e.g. release_6.3.x)", required: true },
        { flag: "--head-branch <ref>", description: "head branch (the testing branch)", required: true },
        { flag: "--slug <slug>", description: "override default slug" },
        { flag: "--yyyymm <ym>", description: "override default current YYYYMM" },
        { flag: "--related-feature <ym-slug>", description: "associate with a feature (injects PRD into agent context)" },
        { flag: "--skip-fetch", description: "skip 'git fetch' (for tests/local repos)" },
      ],
      action: actionCreate,
    },
    {
      name: "add-bug",
      description: "Append a bug from a JSON file (strict-validated)",
      options: [
        { flag: "--project <name>", description: "project", required: true },
        { flag: "--yyyymm <ym>", description: "yyyymm", required: true },
        { flag: "--slug <slug>", description: "audit slug", required: true },
        { flag: "--json <path>", description: "path to bug JSON", required: true },
        { flag: "--auto-id", description: "ignore bug.id and assign next id" },
      ],
      action: (opts: {
        project: string; yyyymm: string; slug: string; json: string; autoId?: boolean;
      }) => {
        const bug = loadBugJson(opts.json);
        if (opts.autoId) bug.id = nextBugId(opts.project, opts.yyyymm, opts.slug);
        try {
          addBug(opts.project, opts.yyyymm, opts.slug, bug);
        } catch (e) {
          const msg = (e as Error).message;
          if (msg.startsWith("invalid bug:")) fail(2, `[scan-report] ${msg}`);
          fail(1, `[scan-report] ${msg}`);
        }
        process.stdout.write(`${JSON.stringify({ ok: true, id: bug.id })}\n`);
      },
    },
    {
      name: "remove-bug",
      description: "Remove a bug by id",
      options: [
        { flag: "--project <name>", description: "project", required: true },
        { flag: "--yyyymm <ym>", description: "yyyymm", required: true },
        { flag: "--slug <slug>", description: "audit slug", required: true },
        { flag: "--bug-id <id>", description: "bug id (e.g. b-001)", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; slug: string; bugId: string }) => {
        removeBug(opts.project, opts.yyyymm, opts.slug, opts.bugId);
        process.stdout.write(`${JSON.stringify({ ok: true, removed: opts.bugId })}\n`);
      },
    },
  ],
});

if (import.meta.main) {
  program.parseAsync(process.argv);
}
