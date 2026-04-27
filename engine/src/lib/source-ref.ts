/**
 * source-ref.ts — 解析 Phase B 定义的 source_ref 锚点语法
 *
 * 完整规范见 `.claude/skills/test-case-gen/references/source-refs-schema.md`。
 *
 * Syntax:
 *   source_ref ::= <scheme>#<anchor>
 *   scheme     ::= prd | knowledge | repo | enhanced
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isValidSectionAnchor, isValidQAnchor } from "./enhanced-doc-anchors.ts";

export type SourceRefScheme = "prd" | "knowledge" | "repo" | "enhanced";

export interface ParsedSourceRef {
  scheme: SourceRefScheme;
  anchor: string;
}

const SCHEMES: readonly SourceRefScheme[] = ["prd", "knowledge", "repo", "enhanced"];

export function parseSourceRef(raw: string): ParsedSourceRef | null {
  if (typeof raw !== "string") return null;
  const idx = raw.indexOf("#");
  if (idx <= 0 || idx === raw.length - 1) return null;

  const scheme = raw.slice(0, idx);
  const anchor = raw.slice(idx + 1);
  if (!SCHEMES.includes(scheme as SourceRefScheme)) return null;
  return { scheme: scheme as SourceRefScheme, anchor };
}

export interface ResolveContext {
  prdPath?: string;
  enhancedDocPath?: string;
  workspaceDir?: string;
  projectName?: string;
  /** Mapping of repo-short-name → absolute path. If repo scheme anchor's
   *  first path segment matches a key, its file lookup is rooted there. */
  repos?: Record<string, string>;
}

export interface ResolveResult {
  ok: boolean;
  reason?: string;
}

export function resolveSourceRef(raw: string, ctx: ResolveContext): ResolveResult {
  const parsed = parseSourceRef(raw);
  if (parsed === null) {
    return { ok: false, reason: `锚点格式非法: ${raw}` };
  }
  switch (parsed.scheme) {
    case "prd":
      return resolvePrd(parsed.anchor, ctx);
    case "knowledge":
      return resolveKnowledge(parsed.anchor, ctx);
    case "repo":
      return resolveRepo(parsed.anchor, ctx);
    case "enhanced":
      return resolveEnhanced(parsed.anchor, ctx);
  }
}

function resolveEnhanced(anchor: string, ctx: ResolveContext): ResolveResult {
  if (ctx.enhancedDocPath === undefined) {
    return { ok: false, reason: "enhanced scheme 需要 ctx.enhancedDocPath" };
  }
  if (!existsSync(ctx.enhancedDocPath)) {
    return { ok: false, reason: `enhanced.md 不存在: ${ctx.enhancedDocPath}` };
  }
  if (!isValidSectionAnchor(anchor) && !isValidQAnchor(anchor)) {
    return { ok: false, reason: `enhanced 锚点格式非法: ${anchor}` };
  }
  const text = readFileSync(ctx.enhancedDocPath, "utf8");
  if (text.includes(`<a id="${anchor}"></a>`)) {
    return { ok: true };
  }
  return { ok: false, reason: `enhanced.md 未找到锚点: ${anchor}` };
}

function resolvePrd(anchor: string, ctx: ResolveContext): ResolveResult {
  if (ctx.prdPath === undefined) {
    return { ok: false, reason: "prd scheme 需要 ctx.prdPath" };
  }
  if (!existsSync(ctx.prdPath)) {
    return { ok: false, reason: `prd 文件不存在: ${ctx.prdPath}` };
  }
  const text = readFileSync(ctx.prdPath, "utf8");
  const headings = Array.from(text.matchAll(/^#{1,6}\s+(.+)$/gm)).map((m) =>
    slugifyHeading(m[1].trim()),
  );
  if (headings.includes(slugifyHeading(anchor))) {
    return { ok: true };
  }
  const looseMatch = headings.some((h) => h.includes(anchor.toLowerCase()));
  return looseMatch
    ? { ok: true }
    : { ok: false, reason: `prd 未找到匹配锚点: ${anchor}` };
}

function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^0-9a-z一-龥\-.]/g, "");
}

function resolveKnowledge(anchor: string, ctx: ResolveContext): ResolveResult {
  if (ctx.workspaceDir === undefined || ctx.projectName === undefined) {
    return {
      ok: false,
      reason: "knowledge scheme 需要 ctx.workspaceDir + ctx.projectName",
    };
  }
  const dot = anchor.indexOf(".");
  if (dot <= 0) {
    return { ok: false, reason: `knowledge 锚点需形如 <type>.<name>: ${anchor}` };
  }
  const type = anchor.slice(0, dot);
  const ALLOWED = new Set(["overview", "term", "module", "pitfall"]);
  if (!ALLOWED.has(type)) {
    return { ok: false, reason: `knowledge 锚点 type 非法: ${type}` };
  }
  const kdir = join(ctx.workspaceDir, ctx.projectName, "knowledge");
  if (!existsSync(kdir)) {
    return { ok: false, reason: `knowledge 目录不存在: ${kdir}` };
  }
  const candidates = [
    join(kdir, `${type}.md`),
    join(kdir, type),
    join(kdir, `${type}s.md`),
    join(kdir, `${type}s`),
  ];
  if (candidates.some((p) => existsSync(p))) {
    return { ok: true };
  }
  return { ok: false, reason: `knowledge 未找到 type=${type} 的入口文件或目录` };
}

function resolveRepo(anchor: string, ctx: ResolveContext): ResolveResult {
  const m = anchor.match(/^([^:]+)(?::L(\d+)(?:-L(\d+))?)?$/);
  if (m === null) {
    return {
      ok: false,
      reason: `repo 锚点需形如 <path>(:L<start>(-L<end>)?): ${anchor}`,
    };
  }
  const relPath = m[1];
  const firstSeg = relPath.split("/")[0];

  if (ctx.repos !== undefined && ctx.repos[firstSeg] !== undefined) {
    const abs = join(ctx.repos[firstSeg], relPath.slice(firstSeg.length + 1));
    return existsSync(abs)
      ? { ok: true }
      : { ok: false, reason: `repo 文件不存在: ${abs}` };
  }

  if (ctx.workspaceDir !== undefined && ctx.projectName !== undefined) {
    const reposDir = join(ctx.workspaceDir, ctx.projectName, ".repos");
    const tryAbs = join(reposDir, relPath);
    if (existsSync(tryAbs)) return { ok: true };
  }

  return {
    ok: false,
    reason: `repo 未在 ctx.repos 或 workspace/.repos 中找到: ${firstSeg}`,
  };
}
