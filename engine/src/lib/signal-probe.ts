// Pure functions for 4-dimension signal classification.
// No I/O — zero imports of node:fs or any side-effectful module.
// All functions are deterministic: same input → same output.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SignalLevel = "strong" | "weak" | "missing";

export interface SignalEntry {
  level: SignalLevel;
  evidence: Record<string, unknown>;
}

export interface SignalProfile {
  source: SignalEntry;
  prd: SignalEntry;
  history: SignalEntry;
  knowledge: SignalEntry;
  probed_at: string;
  project: string;
  prd_path: string;
}

export interface SourceAnalyzeOutput {
  a_level: Array<unknown>;
  b_level: Array<unknown>;
  coverage_rate: number;
  searched_files: number;
  matched_files: number;
}

export interface ArchiveSearchHit {
  score: number;
  path: string;
  suite_name?: string;
}

export interface KnowledgeReadCore {
  overview: string;
  terms: string;
  index?: string;
}

export interface ProbeCacheEntry {
  prd_mtime_ms: number;
  probe_script_mtime_ms: number;
  profile: SignalProfile;
}

// ---------------------------------------------------------------------------
// Step 2: 4-dimension classification pure functions
// ---------------------------------------------------------------------------

/**
 * Classify source-code signal level based on source-analyze output.
 * spec §4.2.1 — source dimension.
 */
export function classifySource(output: SourceAnalyzeOutput | null): SignalEntry {
  if (output === null) {
    return {
      level: "missing",
      evidence: { a_level_count: 0, b_level_count: 0, coverage_rate: 0 },
    };
  }

  const aCount = output.a_level?.length ?? 0;
  const bCount = output.b_level?.length ?? 0;
  const coverageRate = output.coverage_rate ?? 0;

  const evidence = {
    a_level_count: aCount,
    b_level_count: bCount,
    coverage_rate: coverageRate,
  };

  if (aCount >= 3 && coverageRate >= 0.05) {
    return { level: "strong", evidence };
  }

  // weak: a_level in [1, 2], OR (a_level === 0 && b_level > 0)
  if ((aCount >= 1 && aCount <= 2) || (aCount === 0 && bCount > 0)) {
    return { level: "weak", evidence };
  }

  return { level: "missing", evidence };
}

/**
 * Classify PRD signal level based on field fill rate, confidence, and page count.
 * spec §4.2.1 — PRD dimension.
 */
export function classifyPrd(input: {
  fieldFillRate: number;
  confidence: number;
  pageCount: number;
}): SignalEntry {
  const fillRate = input?.fieldFillRate ?? 0;
  const confidence = input?.confidence ?? 0;
  const pageCount = input?.pageCount ?? 0;

  const evidence = {
    field_fill_rate: fillRate,
    confidence,
    page_count: pageCount,
  };

  if (fillRate >= 0.7 && confidence >= 0.8) {
    return { level: "strong", evidence };
  }

  if (fillRate >= 0.3 && fillRate < 0.7) {
    return { level: "weak", evidence };
  }

  return { level: "missing", evidence };
}

/**
 * Classify history signal level based on archive search hits.
 * spec §4.2.1 — history dimension.
 *
 * strong: >= 2 hits with score >= 0.7
 * weak:   >= 1 hit  with score >= 0.5
 * missing: otherwise
 */
export function classifyHistory(hits: ArchiveSearchHit[]): SignalEntry {
  const safeHits = hits ?? [];

  const highScoreHits = safeHits.filter((h) => h.score >= 0.7);
  const midScoreHits = safeHits.filter((h) => h.score >= 0.5);

  const bestScore =
    safeHits.length > 0
      ? Math.max(...safeHits.map((h) => h.score))
      : 0;

  if (highScoreHits.length >= 2) {
    return {
      level: "strong",
      evidence: { top_hits: highScoreHits.length, best_score: bestScore },
    };
  }

  if (midScoreHits.length >= 1) {
    return {
      level: "weak",
      evidence: { top_hits: midScoreHits.length, best_score: bestScore },
    };
  }

  return {
    level: "missing",
    evidence: { top_hits: 0, best_score: bestScore },
  };
}

/**
 * Classify knowledge signal level based on read-core and matched module content.
 * spec §4.2.1 — knowledge dimension.
 *
 * strong: core non-null AND matchedModuleContent non-empty
 * weak:   core non-null AND (overview or terms non-empty)
 * missing: otherwise
 */
export function classifyKnowledge(input: {
  core: KnowledgeReadCore | null;
  matchedModuleContent: string | null;
  moduleName?: string | null;
}): SignalEntry {
  const core = input?.core ?? null;
  const matchedModuleContent = input?.matchedModuleContent ?? null;
  const moduleName = input?.moduleName ?? null;

  const coreNonempty =
    core !== null &&
    (core.overview.length > 0 || core.terms.length > 0);

  const evidence: Record<string, unknown> = {
    core_nonempty: coreNonempty,
    matched_module: moduleName,
  };

  if (core !== null && matchedModuleContent !== null && matchedModuleContent !== "") {
    return { level: "strong", evidence };
  }

  if (coreNonempty) {
    return { level: "weak", evidence };
  }

  return { level: "missing", evidence };
}

// ---------------------------------------------------------------------------
// Step 3: Field fill rate computation
// ---------------------------------------------------------------------------

/**
 * Compute the average field-definition table fill rate across all pages of a PRD.
 *
 * Algorithm:
 * 1. Find all `### 字段定义` anchors (tolerates full-width spaces).
 * 2. For each anchor, locate the first markdown table that follows.
 * 3. Skip the header row and separator row; process data rows.
 * 4. For each data row, expect >= 4 columns: 字段名 / 控件类型 / 必填 / 校验规则.
 *    Non-empty cell = trimmed length > 0 and value is not "-" or "—".
 * 5. Per-page fill rate = avg non-empty ratio across all data rows.
 * 6. Overall fillRate = avg of per-page fill rates.
 */
export function computeFieldFillRate(prdMarkdown: string): {
  fillRate: number;
  pageCount: number;
} {
  const content = prdMarkdown ?? "";

  // Match ### 字段定义 anchors (allow full-width space \u3000 between characters)
  const anchorPattern = /###[\s\u3000]*字段[\s\u3000]*定义/g;
  const anchorMatches: number[] = [];
  let anchorMatch: RegExpExecArray | null;
  while ((anchorMatch = anchorPattern.exec(content)) !== null) {
    anchorMatches.push(anchorMatch.index);
  }

  if (anchorMatches.length === 0) {
    return { fillRate: 0, pageCount: 0 };
  }

  const pageCount = anchorMatches.length;
  const pageFillRates: number[] = [];

  for (let i = 0; i < anchorMatches.length; i++) {
    const start = anchorMatches[i];
    const end = i + 1 < anchorMatches.length ? anchorMatches[i + 1] : content.length;
    const section = content.slice(start, end);

    const tableLines = extractTableLines(section);
    if (tableLines.length === 0) {
      pageFillRates.push(0);
      continue;
    }

    // Find header row: first line starting with |
    // Detect fallback: look for line starting with "| 字段名"
    let headerIdx = 0;
    const fallbackHeaderIdx = tableLines.findIndex((l) =>
      l.trimStart().startsWith("| 字段名"),
    );
    if (fallbackHeaderIdx !== -1) {
      headerIdx = fallbackHeaderIdx;
    }

    // Skip header row and separator row (idx + 1 if it looks like | --- |)
    let dataStart = headerIdx + 1;
    if (
      dataStart < tableLines.length &&
      /^\|[\s\-:|]+\|/.test(tableLines[dataStart].trim())
    ) {
      dataStart += 1;
    }

    const dataRows = tableLines.slice(dataStart);
    if (dataRows.length === 0) {
      pageFillRates.push(0);
      continue;
    }

    let totalRatio = 0;
    let validRowCount = 0;

    for (const row of dataRows) {
      const cells = parseTableRow(row);
      if (cells.length < 4) continue;

      // Only consider the first 4 columns: 字段名 / 控件类型 / 必填 / 校验规则
      const targetCells = cells.slice(0, 4);
      const nonEmptyCount = targetCells.filter(isCellNonEmpty).length;
      totalRatio += nonEmptyCount / 4;
      validRowCount += 1;
    }

    pageFillRates.push(validRowCount > 0 ? totalRatio / validRowCount : 0);
  }

  const fillRate =
    pageFillRates.length > 0
      ? pageFillRates.reduce((sum, r) => sum + r, 0) / pageFillRates.length
      : 0;

  return { fillRate, pageCount };
}

/** Extract all table lines (lines that start/end with |) from a section. */
function extractTableLines(section: string): string[] {
  const lines = section.split("\n");
  const tableLines: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|")) {
      inTable = true;
      tableLines.push(trimmed);
    } else if (inTable) {
      // Stop at first non-table line after a table has started
      break;
    }
  }

  return tableLines;
}

/** Parse a markdown table row into cell values, trimming whitespace. */
function parseTableRow(row: string): string[] {
  const trimmed = row.trim();
  // Remove leading and trailing |
  const inner = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((cell) => cell.trim());
}

/** Determine if a table cell is considered non-empty. */
function isCellNonEmpty(cell: string): boolean {
  const v = cell.trim();
  return v.length > 0 && v !== "-" && v !== "\u2014";
}

// ---------------------------------------------------------------------------
// Step 4: kebab conversion
// ---------------------------------------------------------------------------

/**
 * Extract the first module name from PRD frontmatter and convert to kebab-case.
 *
 * Rules:
 * - modules undefined or empty → null
 * - modules[0] trim empty → null
 * - ASCII spaces and underscores → "-"
 * - ASCII uppercase letters → lowercase
 * - Chinese characters preserved as-is
 */
export function firstModuleKebab(prdFrontmatter: {
  modules?: string[];
}): string | null {
  const modules = prdFrontmatter?.modules;
  if (!modules || modules.length === 0) return null;

  const first = modules[0].trim();
  if (first === "") return null;

  return first
    .replace(/[ _]/g, "-")
    .replace(/[A-Z]/g, (c) => c.toLowerCase());
}

// ---------------------------------------------------------------------------
// Step 5: Cache functions
// ---------------------------------------------------------------------------

/**
 * Determine whether a cached probe entry is still valid.
 * Valid iff entry is non-null and both mtime values match exactly.
 */
export function isCacheValid(
  entry: ProbeCacheEntry | null,
  prdMtimeMs: number,
  probeScriptMtimeMs: number,
): boolean {
  if (entry === null) return false;
  return (
    entry.prd_mtime_ms === prdMtimeMs &&
    entry.probe_script_mtime_ms === probeScriptMtimeMs
  );
}

/**
 * Build a new ProbeCacheEntry from a SignalProfile and mtime values.
 */
export function buildCacheEntry(
  profile: SignalProfile,
  prdMtimeMs: number,
  probeScriptMtimeMs: number,
): ProbeCacheEntry {
  return {
    prd_mtime_ms: prdMtimeMs,
    probe_script_mtime_ms: probeScriptMtimeMs,
    profile,
  };
}

// ---------------------------------------------------------------------------
// Step 6: composeProfile
// ---------------------------------------------------------------------------

/**
 * Compose a complete SignalProfile from all four classified dimensions.
 * probed_at is derived from the provided Date instance (no Date.now() side-effects).
 */
export function composeProfile(input: {
  project: string;
  prdPath: string;
  source: SignalEntry;
  prd: SignalEntry;
  history: SignalEntry;
  knowledge: SignalEntry;
  now: Date;
}): SignalProfile {
  return {
    source: input.source,
    prd: input.prd,
    history: input.history,
    knowledge: input.knowledge,
    probed_at: input.now.toISOString(),
    project: input.project,
    prd_path: input.prdPath,
  };
}
