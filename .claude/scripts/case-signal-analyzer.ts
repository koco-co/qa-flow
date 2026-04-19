#!/usr/bin/env bun
/**
 * case-signal-analyzer.ts — 4 维信号探针（源码 / PRD / 历史 / 知识库）
 * Usage: bun run .claude/scripts/case-signal-analyzer.ts probe \
 *   --project <name> --prd <path> [--no-cache] [--output json|summary]
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { createCli } from "./lib/cli-runner.ts";
import { probeCachePath, repoRoot } from "./lib/paths.ts";
import {
  buildCacheEntry,
  classifyHistory,
  classifyKnowledge,
  classifyPrd,
  classifySource,
  composeProfile,
  computeFieldFillRate,
  firstModuleKebab,
  isCacheValid,
  type ArchiveSearchHit,
  type KnowledgeReadCore,
  type ProbeCacheEntry,
  type SignalProfile,
  type SourceAnalyzeOutput,
} from "./lib/signal-probe.ts";
import { parseFrontMatter } from "./lib/frontmatter.ts";

// ---------------------------------------------------------------------------
// Sub-command invoker
// ---------------------------------------------------------------------------

function invokeJson(args: string[], stdin?: string): unknown | null {
  const result = spawnSync("bun", ["run", ...args], {
    encoding: "utf8",
    cwd: repoRoot(),
    input: stdin,
  });
  if (result.status !== 0) {
    process.stderr.write(
      `[case-signal-analyzer] delegate exit ${result.status}: ${args.join(" ")}\n`,
    );
    return null;
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

function resolveCache(cachePath: string): ProbeCacheEntry | null {
  if (!existsSync(cachePath)) return null;
  try {
    return JSON.parse(readFileSync(cachePath, "utf8")) as ProbeCacheEntry;
  } catch {
    return null;
  }
}

function saveCache(cachePath: string, entry: ProbeCacheEntry): void {
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, JSON.stringify(entry, null, 2));
}

// ---------------------------------------------------------------------------
// Source signal collection
// ---------------------------------------------------------------------------

function collectSource(
  project: string,
  frontMatter: Record<string, unknown>,
): SourceAnalyzeOutput | null {
  const repos = frontMatter.repos as
    | Array<{ path: string; branch: string; commit?: string }>
    | undefined;

  if (!repos || repos.length === 0) return null;

  const repo = repos[0];
  let repoPath: string;
  if (repo.path.startsWith("/")) {
    repoPath = repo.path;
  } else {
    repoPath = resolve(repoRoot(), "workspace", project, ".repos", repo.path);
  }

  if (!existsSync(repoPath)) return null;

  // Derive keywords from frontmatter
  const keywordsRaw = frontMatter.keywords as string | string[] | undefined;
  let keywords: string[] = [];
  if (keywordsRaw) {
    keywords = Array.isArray(keywordsRaw)
      ? keywordsRaw.map(String)
      : String(keywordsRaw)
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k.length > 0);
  }
  if (keywords.length === 0) {
    const requirementName = frontMatter.requirement_name as string | undefined;
    if (requirementName) {
      keywords = [requirementName];
    }
  }
  if (keywords.length === 0) {
    const modules = frontMatter.modules as string[] | undefined;
    if (modules && modules.length > 0) {
      keywords = [modules[0]];
    }
  }
  if (keywords.length === 0) return null;

  const result = invokeJson([
    ".claude/scripts/source-analyze.ts",
    "analyze",
    "--repo",
    repoPath,
    "--keywords",
    keywords.join(","),
  ]);

  if (result === null) return null;
  return result as SourceAnalyzeOutput;
}

// ---------------------------------------------------------------------------
// History signal collection
// ---------------------------------------------------------------------------

function collectHistory(
  project: string,
  frontMatter: Record<string, unknown>,
): ArchiveSearchHit[] {
  const requirementName = frontMatter.requirement_name as string | undefined;
  const modules = frontMatter.modules as string[] | undefined;
  const query = requirementName ?? (modules && modules[0]) ?? null;

  if (!query) return [];

  // Call archive-gen search
  const searchRaw = invokeJson([
    ".claude/scripts/archive-gen.ts",
    "search",
    "--query",
    query,
    "--project",
    project,
    "--limit",
    "5",
  ]);

  if (searchRaw === null) return [];

  // archive-gen search returns SearchResult[] directly (array)
  // Extract array from possible wrapper formats
  let searchArr: unknown[];
  if (Array.isArray(searchRaw)) {
    searchArr = searchRaw;
  } else if (typeof searchRaw === "object" && searchRaw !== null) {
    const obj = searchRaw as Record<string, unknown>;
    const wrapped = obj.results ?? obj.hits ?? obj.data;
    searchArr = Array.isArray(wrapped) ? wrapped : [];
  } else {
    searchArr = [];
  }

  if (searchArr.length === 0) return [];

  // Pass through search-filter for deduplication/sorting
  const filterRaw = invokeJson(
    [".claude/scripts/search-filter.ts", "filter", "--top", "5"],
    JSON.stringify(searchArr),
  );

  // Adapt FilteredResult[] → ArchiveSearchHit[]
  // search-filter outputs: { path, suite_name, case_count, preview }
  // ArchiveSearchHit needs: { score, path, suite_name? }
  // Normalize case_count to a score in [0, 1] range (capped at 1.0 for >= 10 cases)
  let filteredArr: unknown[];
  if (Array.isArray(filterRaw)) {
    filteredArr = filterRaw;
  } else {
    filteredArr = searchArr;
  }

  return filteredArr.map((item) => {
    const r = item as Record<string, unknown>;
    // Prefer explicit score field if present (future-proofing)
    const rawScore = r.score ?? r.search_score;
    const score =
      rawScore !== undefined
        ? Number(rawScore)
        : Math.min(1.0, (Number(r.case_count ?? 0) / 10));
    return {
      score,
      path: String(r.path ?? ""),
      suite_name: r.suite_name !== undefined ? String(r.suite_name) : undefined,
    } satisfies ArchiveSearchHit;
  });
}

// ---------------------------------------------------------------------------
// Knowledge signal collection
// ---------------------------------------------------------------------------

function collectKnowledge(
  project: string,
  frontMatter: Record<string, unknown>,
): { core: KnowledgeReadCore | null; matchedModuleContent: string | null; moduleName: string | null } {
  // read-core
  const coreRaw = invokeJson([
    ".claude/scripts/knowledge-keeper.ts",
    "read-core",
    "--project",
    project,
  ]);

  let core: KnowledgeReadCore | null = null;
  if (coreRaw !== null && typeof coreRaw === "object") {
    const obj = coreRaw as Record<string, unknown>;
    const overview = obj.overview;
    const terms = obj.terms;
    if (overview !== undefined && terms !== undefined) {
      // knowledge-keeper read-core returns { project, overview: {title, content, updated}, terms: TermRow[], index }
      // Map to KnowledgeReadCore: { overview: string, terms: string }
      const overviewStr =
        typeof overview === "object" && overview !== null
          ? String((overview as Record<string, unknown>).content ?? "")
          : String(overview ?? "");
      const termsStr =
        Array.isArray(terms)
          ? terms.length > 0
            ? JSON.stringify(terms)
            : ""
          : String(terms ?? "");
      core = { overview: overviewStr, terms: termsStr };
    }
  }

  // Module detection
  const moduleKebab = firstModuleKebab({
    modules: frontMatter.modules as string[] | undefined,
  });

  let matchedModuleContent: string | null = null;
  if (moduleKebab !== null) {
    const moduleFilePath = resolve(
      repoRoot(),
      "workspace",
      project,
      "knowledge",
      "modules",
      `${moduleKebab}.md`,
    );
    if (existsSync(moduleFilePath)) {
      const moduleRaw = invokeJson([
        ".claude/scripts/knowledge-keeper.ts",
        "read-module",
        "--project",
        project,
        "--module",
        moduleKebab,
      ]);
      if (moduleRaw !== null && typeof moduleRaw === "object") {
        const obj = moduleRaw as Record<string, unknown>;
        matchedModuleContent =
          obj.content !== undefined ? String(obj.content) : null;
      }
    }
  }

  return { core, matchedModuleContent, moduleName: moduleKebab };
}

// ---------------------------------------------------------------------------
// Main probe action
// ---------------------------------------------------------------------------

async function runProbe(opts: {
  project: string;
  prd: string;
  cache?: boolean;
  output: string;
}): Promise<void> {
  // Resolve PRD path
  const prdPath = opts.prd.startsWith("/")
    ? opts.prd
    : resolve(repoRoot(), opts.prd);

  if (!existsSync(prdPath)) {
    process.stderr.write(`[case-signal-analyzer] PRD not found: ${prdPath}\n`);
    process.exit(1);
    return;
  }

  // commander --no-cache: opts.cache === false means --no-cache was passed
  const noCache = opts.cache === false;

  const prdSlug = basename(prdPath).replace(/\.md$/, "");
  const cachePath = probeCachePath(opts.project, prdSlug);
  const prdMtimeMs = statSync(prdPath).mtimeMs;
  const probeScriptPath = resolve(repoRoot(), ".claude/scripts/case-signal-analyzer.ts");
  const probeScriptMtimeMs = statSync(probeScriptPath).mtimeMs;

  // Check cache
  if (!noCache) {
    const cached = resolveCache(cachePath);
    if (isCacheValid(cached, prdMtimeMs, probeScriptMtimeMs)) {
      process.stderr.write("[case-signal-analyzer] cache hit\n");
      const profile = cached!.profile;
      outputProfile(profile, opts.output);
      return;
    }
  }

  // Read PRD
  const prdContent = readFileSync(prdPath, "utf8");
  const { frontMatter, body } = parseFrontMatter(prdContent);

  // Collect all 4 dimensions
  // 1. Source
  const sourceOutput = collectSource(opts.project, frontMatter as Record<string, unknown>);
  const sourceSignal = classifySource(sourceOutput);

  // 2. PRD
  const { fillRate, pageCount } = computeFieldFillRate(body);
  const rawConfidence = frontMatter.confidence;
  const confidence =
    typeof rawConfidence === "number"
      ? rawConfidence
      : typeof rawConfidence === "string"
        ? parseFloat(rawConfidence) || 0
        : 0;
  const prdSignal = classifyPrd({
    fieldFillRate: fillRate,
    confidence,
    pageCount,
  });

  // 3. History
  const historyHits = collectHistory(opts.project, frontMatter as Record<string, unknown>);
  const historySignal = classifyHistory(historyHits);

  // 4. Knowledge
  const { core, matchedModuleContent, moduleName } = collectKnowledge(
    opts.project,
    frontMatter as Record<string, unknown>,
  );
  const knowledgeSignal = classifyKnowledge({
    core,
    matchedModuleContent,
    moduleName,
  });

  // Compose profile
  const profile = composeProfile({
    project: opts.project,
    prdPath,
    source: sourceSignal,
    prd: prdSignal,
    history: historySignal,
    knowledge: knowledgeSignal,
    now: new Date(),
  });

  // Save cache (only when --no-cache was NOT passed)
  if (!noCache) {
    const cacheEntry = buildCacheEntry(profile, prdMtimeMs, probeScriptMtimeMs);
    saveCache(cachePath, cacheEntry);
  }

  outputProfile(profile, opts.output);
}

function outputProfile(profile: SignalProfile, format: string): void {
  if (format === "summary") {
    process.stderr.write(
      `[case-signal-analyzer] source=${profile.source.level} prd=${profile.prd.level} history=${profile.history.level} knowledge=${profile.knowledge.level}\n`,
    );
  }
  // Always output JSON to stdout (both json and summary modes)
  process.stdout.write(JSON.stringify(profile, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function probeAction(opts: {
  project: string;
  prd: string;
  cache?: boolean;
  output: string;
}): Promise<void> {
  try {
    await runProbe(opts);
  } catch (error) {
    process.stderr.write(
      `[case-signal-analyzer] Unexpected error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
}

createCli({
  name: "case-signal-analyzer",
  description: "4-dimensional signal probe (source / PRD / history / knowledge)",
  commands: [
    {
      name: "probe",
      description: "Run the probe for a PRD",
      options: [
        {
          flag: "--project <name>",
          description: "Project name under workspace/",
          required: true,
        },
        {
          flag: "--prd <path>",
          description: "Absolute or relative path to PRD markdown",
          required: true,
        },
        { flag: "--no-cache", description: "Bypass cache and re-run probe" },
        {
          flag: "--output <format>",
          description: "Output format (json|summary)",
          defaultValue: "json",
        },
      ],
      action: probeAction,
    },
  ],
}).parseAsync(process.argv);
