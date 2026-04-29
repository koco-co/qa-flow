// lib/knowledge.ts

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

export interface Frontmatter {
  title: string;
  type: "overview" | "term" | "module" | "pitfall";
  tags: string[];
  confidence: "high" | "medium" | "low";
  source: string;
  updated: string;
}

export interface ParsedFile {
  frontmatter: Frontmatter | null;
  body: string;
}

export function parseFrontmatter(raw: string): ParsedFile {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) {
    return { frontmatter: null, body: raw };
  }
  const lines = raw.split("\n");
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) {
    return { frontmatter: null, body: raw };
  }

  const fmLines = lines.slice(1, endIdx);
  const body = lines.slice(endIdx + 1).join("\n");

  const fm: Partial<Frontmatter> = {};
  for (const line of fmLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === "tags") {
      if (value.startsWith("[") && value.endsWith("]")) {
        const inner = value.slice(1, -1).trim();
        if (inner === "") {
          fm.tags = [];
        } else {
          fm.tags = inner
            .split(",")
            .map((s) => s.trim().replace(/^["']|["']$/g, ""));
        }
      } else {
        fm.tags = [];
      }
    } else if (key === "title") {
      fm.title = value;
    } else if (key === "type") {
      fm.type = value as Frontmatter["type"];
    } else if (key === "confidence") {
      fm.confidence = value as Frontmatter["confidence"];
    } else if (key === "source") {
      fm.source = value;
    } else if (key === "updated") {
      fm.updated = value;
    }
  }

  // Validate required fields
  if (
    typeof fm.title !== "string" ||
    typeof fm.type !== "string" ||
    !Array.isArray(fm.tags) ||
    typeof fm.confidence !== "string" ||
    typeof fm.source !== "string" ||
    typeof fm.updated !== "string"
  ) {
    return { frontmatter: null, body: raw };
  }

  return { frontmatter: fm as Frontmatter, body };
}

export function serializeFrontmatter(fm: Frontmatter): string {
  const lines = [
    "---",
    `title: ${fm.title}`,
    `type: ${fm.type}`,
    `tags: [${fm.tags.join(", ")}]`,
    `confidence: ${fm.confidence}`,
    `source: ${fm.source === "" ? '""' : fm.source}`,
    `updated: ${fm.updated}`,
    "---",
    "",
  ];
  return lines.join("\n");
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface ContentTerm {
  term: string;
  zh: string;
  desc: string;
  alias: string;
}

/** Row parsed from the terms.md markdown table. */
export interface TermRow {
  term: string;
  zh: string;
  desc: string;
  alias: string;
}

export interface ContentOverview {
  section: string;
  body: string;
  mode: "append" | "replace";
}

export interface ContentModule {
  name: string;
  title: string;
  tags: string[];
  body: string;
  source: string;
}

export interface ContentPitfall extends ContentModule {}

const TERM_FIELDS: (keyof ContentTerm)[] = ["term", "zh", "desc", "alias"];
const OVERVIEW_FIELDS: (keyof ContentOverview)[] = ["section", "body", "mode"];
const MODULE_FIELDS: (keyof ContentModule)[] = ["name", "title", "tags", "body", "source"];

export function parseContentJson<T>(type: string, raw: string): T {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid JSON for type=${type}`);
  }

  let required: string[];
  if (type === "term") required = TERM_FIELDS as string[];
  else if (type === "overview") required = OVERVIEW_FIELDS as string[];
  else if (type === "module" || type === "pitfall") required = MODULE_FIELDS as string[];
  else throw new Error(`Unknown type: ${type}`);

  for (const field of required) {
    if (!(field in obj)) {
      throw new Error(`Missing required field "${field}" for type=${type}`);
    }
  }

  if (type === "overview") {
    const mode = obj.mode as string;
    if (mode !== "append" && mode !== "replace") {
      throw new Error(`Invalid mode "${mode}" for overview; must be append|replace`);
    }
  }
  if ((type === "module" || type === "pitfall") && !Array.isArray(obj.tags)) {
    throw new Error(`Field "tags" must be an array for type=${type}`);
  }

  return obj as T;
}

export interface IndexEntry {
  name: string;
  title: string;
  tags: string[];
  updated: string;
  confidence: string;
}

export interface IndexData {
  modules: IndexEntry[];
  pitfalls: IndexEntry[];
  sites: IndexEntry[];
  overview_updated: string;
  terms_updated: string;
  terms_count: number;
}

function renderIndexEntry(subdir: "modules" | "pitfalls", entry: IndexEntry): string {
  const tagsStr = entry.tags.length ? ` [tags: ${entry.tags.join(", ")}]` : "";
  return `- [${entry.name}.md](${subdir}/${entry.name}.md) — ${entry.title}${tagsStr} (updated: ${entry.updated}, confidence: ${entry.confidence})`;
}

export function renderIndex(project: string, data: IndexData): string {
  const sortedModules = [...data.modules].sort((a, b) => a.name.localeCompare(b.name));
  const sortedPitfalls = [...data.pitfalls].sort((a, b) => a.name.localeCompare(b.name));
  const sortedSites = [...data.sites].sort((a, b) => a.name.localeCompare(b.name));

  const modulesBody = sortedModules.length
    ? sortedModules.map((e) => renderIndexEntry("modules", e)).join("\n")
    : "_（暂无）_";
  const pitfallsBody = sortedPitfalls.length
    ? sortedPitfalls.map((e) => renderIndexEntry("pitfalls", e)).join("\n")
    : "_（暂无）_";
  const sitesBody = sortedSites.length
    ? sortedSites
        .map((e) => {
          const tagsStr = e.tags.length ? ` [tags: ${e.tags.join(", ")}]` : "";
          return `- [${e.name}.md](${e.name}.md) — ${e.title}${tagsStr} (updated: ${e.updated}, confidence: ${e.confidence})`;
        })
        .join("\n")
    : "_（暂无）_";

  const nowIso = new Date().toISOString();

  return `# ${project} Knowledge Index

> 由 knowledge-keeper 自动维护，请勿手动编辑。

## Core

- [overview.md](overview.md) — 产品定位 + 主流程（updated: ${data.overview_updated}）
- [terms.md](terms.md) — 术语表（${data.terms_count} 条，updated: ${data.terms_updated}）

## Modules

${modulesBody}

## Pitfalls

${pitfallsBody}

## Sites

${sitesBody}

<!-- last-indexed: ${nowIso} -->
`;
}

export function searchPitfalls(
  query: string,
  files: { name: string; tags: string[] }[],
): { name: string; match_by: string[] }[] {
  if (query === "") return [];
  const q = query.toLowerCase();
  const hits = new Map<string, Set<string>>();

  for (const f of files) {
    if (f.name.toLowerCase().includes(q)) {
      if (!hits.has(f.name)) hits.set(f.name, new Set());
      hits.get(f.name)!.add("filename");
    }
    if (f.tags.some((t) => t.toLowerCase().includes(q))) {
      if (!hits.has(f.name)) hits.set(f.name, new Set());
      hits.get(f.name)!.add("tags");
    }
  }

  return Array.from(hits.entries()).map(([name, by]) => ({
    name,
    match_by: Array.from(by).sort(),
  }));
}

export function confidenceGate(
  confidence: string,
  confirmed: boolean,
): { allowed: boolean; reason?: string } {
  if (confidence === "high") return { allowed: true };
  if (confidence === "low") {
    return {
      allowed: false,
      reason: "Low confidence is forbidden; upgrade to medium in skill layer",
    };
  }
  if (confidence === "medium") {
    if (confirmed) return { allowed: true };
    return {
      allowed: false,
      reason: "Non-high confidence requires --confirmed flag",
    };
  }
  return { allowed: false, reason: `Unknown confidence: ${confidence}` };
}

export function autoFixFrontmatter(
  rawContent: string,
  filePath: string,
  today: string,
): { fixed: boolean; content: string } {
  const parsed = parseFrontmatter(rawContent);
  if (parsed.frontmatter !== null) {
    return { fixed: false, content: rawContent };
  }
  // If the file already has a frontmatter block (starts with ---), leave it
  // alone — lint will report the missing fields. Only inject frontmatter when
  // the file has no block at all (phase-0 templates).
  if (rawContent.startsWith("---\n") || rawContent.startsWith("---\r\n")) {
    return { fixed: false, content: rawContent };
  }

  let type: Frontmatter["type"];
  if (filePath.includes("/modules/")) type = "module";
  else if (filePath.includes("/pitfalls/")) type = "pitfall";
  else if (filePath.endsWith("overview.md")) type = "overview";
  else if (filePath.endsWith("terms.md")) type = "term";
  else type = "module";

  let title = "";
  const h1Match = rawContent.match(/^#\s+(.+)$/m);
  if (h1Match) {
    title = h1Match[1].trim();
  } else {
    const segments = filePath.split("/");
    title = segments[segments.length - 1].replace(/\.md$/, "");
  }

  const fm: Frontmatter = {
    title,
    type,
    tags: [],
    confidence: "high",
    source: "",
    updated: today,
  };

  const content = serializeFrontmatter(fm) + "\n" + rawContent;
  return { fixed: true, content };
}

export interface LintError {
  file: string;
  rule: string;
  detail: string;
}

export interface LintResult {
  errors: LintError[];
  warnings: LintError[];
}

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function checkKebabCase(fileBase: string): boolean {
  const name = fileBase.replace(/^private-/, "");
  return KEBAB_RE.test(name);
}

function listMd(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".md"));
}

export function lintChecks(_project: string, knowledgeDirPath: string): LintResult {
  const errors: LintError[] = [];
  const warnings: LintError[] = [];

  const indexPath = join(knowledgeDirPath, "_index.md");
  const indexContent = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";

  const check = (subdir: "modules" | "pitfalls", expectedType: "module" | "pitfall") => {
    const dir = join(knowledgeDirPath, subdir);
    for (const fname of listMd(dir)) {
      const relPath = `${subdir}/${fname}`;
      const raw = readFileSync(join(dir, fname), "utf8");
      const parsed = parseFrontmatter(raw);

      const base = basename(fname, ".md");
      if (!checkKebabCase(base)) {
        errors.push({ file: relPath, rule: "non-kebab-case-name", detail: base });
      }

      if (parsed.frontmatter === null) {
        errors.push({ file: relPath, rule: "missing-frontmatter-field", detail: "all fields" });
        // Best-effort: if file has a frontmatter block with a `type:` line
        // that disagrees with the directory, still flag type-dir-mismatch.
        const typeMatch = raw.match(/^type:\s*(\S+)\s*$/m);
        if (typeMatch && typeMatch[1] !== expectedType) {
          errors.push({
            file: relPath,
            rule: "type-dir-mismatch",
            detail: `expected ${expectedType}, got ${typeMatch[1]}`,
          });
        }
        continue;
      }
      const fm = parsed.frontmatter;
      for (const field of ["title", "type", "confidence", "updated"] as const) {
        if (!fm[field]) {
          errors.push({ file: relPath, rule: "missing-frontmatter-field", detail: field });
        }
      }
      if (fm.type !== expectedType) {
        errors.push({
          file: relPath,
          rule: "type-dir-mismatch",
          detail: `expected ${expectedType}, got ${fm.type}`,
        });
      }
      if (fm.tags.length === 0) {
        warnings.push({ file: relPath, rule: "empty-tags", detail: "" });
      }
      if (fm.source === "") {
        warnings.push({ file: relPath, rule: "empty-source", detail: "" });
      }
      if (!indexContent.includes(`${subdir}/${fname}`)) {
        warnings.push({ file: relPath, rule: "orphan-file", detail: "not listed in _index.md" });
      }
    }
  };

  check("modules", "module");
  check("pitfalls", "pitfall");

  return { errors, warnings };
}
