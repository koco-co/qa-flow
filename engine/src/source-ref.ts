#!/usr/bin/env bun
/**
 * source-ref.ts — CLI 入口，封装 lib/source-ref.ts 的 parse + resolve。
 *
 * Usage:
 *   kata-cli source-ref resolve --ref <ref> [--prd <p>] [--project <n>] [--workspace-dir <d>] [--yyyymm <ym>] [--prd-slug <slug>]
 *   kata-cli source-ref batch   --refs-json <p>  [同上]
 *
 * Exit codes:
 *   resolve: 0 OK, 1 fail
 *   batch:   0 all OK, 2 any fail
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createCli } from "./lib/cli-runner.ts";
import { getEnv } from "./lib/env.ts";
import { resolveSourceRef, type ResolveContext } from "./lib/source-ref.ts";

function buildCtx(opts: Record<string, unknown>): ResolveContext {
  const projectName = (opts.project as string | undefined) ?? undefined;
  const workspaceDir =
    (opts.workspaceDir as string | undefined) ?? getEnv("WORKSPACE_DIR");
  const yyyymm = opts.yyyymm as string | undefined;
  const prdSlug = opts.prdSlug as string | undefined;

  const ctx: ResolveContext = {
    prdPath: (opts.prd as string | undefined) ?? undefined,
    projectName,
    workspaceDir,
  };
  if (projectName && yyyymm && prdSlug && workspaceDir) {
    ctx.enhancedDocPath = join(
      workspaceDir,
      projectName,
      "prds",
      yyyymm,
      prdSlug,
      "enhanced.md",
    );
  }
  return ctx;
}

export const program = createCli({
  name: "source-ref",
  description: "Parse and resolve source_ref anchors (prd / knowledge / repo / enhanced).",
  commands: [
    {
      name: "resolve",
      description: "Resolve a single source_ref. Exit 0 if OK, 1 if unresolvable.",
      options: [
        { flag: "--ref <ref>", description: "source_ref string", required: true },
        { flag: "--prd <path>", description: "prd file path (for prd scheme)" },
        { flag: "--project <name>", description: "project name" },
        { flag: "--workspace-dir <dir>", description: "workspace dir override" },
        { flag: "--yyyymm <ym>", description: "PRD 月份目录（与 --prd-slug 配套，定位 enhanced.md）" },
        { flag: "--prd-slug <slug>", description: "PRD slug（同上）" },
      ],
      action: (opts) => {
        const o = opts as Record<string, unknown>;
        const res = resolveSourceRef(o.ref as string, buildCtx(o));
        process.stdout.write(
          JSON.stringify({ ref: o.ref, ...res }, null, 2) + "\n",
        );
        if (!res.ok) process.exit(1);
      },
    },
    {
      name: "batch",
      description:
        "Resolve a JSON array of {ref} entries. Exit 0 if all OK, 2 if any fails.",
      options: [
        {
          flag: "--refs-json <path>",
          description: "JSON file: [{ref: string, ...}]",
          required: true,
        },
        { flag: "--prd <path>", description: "prd path" },
        { flag: "--project <name>", description: "project name" },
        { flag: "--workspace-dir <dir>", description: "workspace dir override" },
        { flag: "--yyyymm <ym>", description: "PRD 月份目录（与 --prd-slug 配套，定位 enhanced.md）" },
        { flag: "--prd-slug <slug>", description: "PRD slug（同上）" },
      ],
      action: (opts) => {
        const o = opts as Record<string, unknown>;
        const raw = readFileSync(o.refsJson as string, "utf8");
        const items = JSON.parse(raw) as Array<{ ref: string }>;
        const resolveCtx = buildCtx(o);
        const results = items.map((it) => ({
          ref: it.ref,
          ...resolveSourceRef(it.ref, resolveCtx),
        }));
        process.stdout.write(
          JSON.stringify(
            {
              total: results.length,
              fails: results.filter((r) => !r.ok),
              results,
            },
            null,
            2,
          ) + "\n",
        );
        if (results.some((r) => !r.ok)) process.exit(2);
      },
    },
  ],
});

if (import.meta.main) {
  program.parseAsync(process.argv);
}
