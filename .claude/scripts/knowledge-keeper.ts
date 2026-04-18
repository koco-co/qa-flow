#!/usr/bin/env bun
/**
 * knowledge-keeper.ts — 业务知识库 CRUD + lint/index。
 * Usage:
 *   bun run .claude/scripts/knowledge-keeper.ts <action> --project <name> [...]
 * Actions: read-core | read-module | read-pitfall | write | update | index | lint
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Command } from "commander";
import { initEnv } from "./lib/env.ts";
import {
  autoFixFrontmatter,
  confidenceGate,
  parseContentJson,
  parseFrontmatter,
  renderIndex,
  searchPitfalls,
  serializeFrontmatter,
  todayIso,
  type ContentModule,
  type ContentOverview,
  type ContentPitfall,
  type ContentTerm,
  type Frontmatter,
  type IndexData,
  type IndexEntry,
  type TermRow,
} from "./lib/knowledge.ts";
import { knowledgeDir, knowledgePath } from "./lib/paths.ts";

initEnv();

// ── helpers ──────────────────────────────────────────────────────────────────

function scanEntries(dir: string): IndexEntry[] {
  if (!existsSync(dir)) return [];
  const entries: IndexEntry[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    const raw = readFileSync(join(dir, f), "utf8");
    const parsed = parseFrontmatter(raw);
    if (!parsed.frontmatter) continue;
    entries.push({
      name: f.replace(/\.md$/, ""),
      title: parsed.frontmatter.title,
      tags: parsed.frontmatter.tags,
      updated: parsed.frontmatter.updated,
      confidence: parsed.frontmatter.confidence,
    });
  }
  return entries;
}

function parseTermsTable(body: string): TermRow[] {
  const rows: TermRow[] = [];
  const lines = body.split("\n");
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
      if (cells.some((c) => /^-+$/.test(c))) {
        inTable = true;
        continue;
      }
      if (!inTable) continue;
      if (cells[0] === "术语" || cells[0] === "Term") continue;
      if (cells.length >= 4) {
        rows.push({ term: cells[0], zh: cells[1], desc: cells[2], alias: cells[3] });
      }
    }
  }
  return rows;
}

function gatherIndexData(
  projectName: string,
): { data: IndexData; fixedFiles: string[] } {
  const kdir = knowledgeDir(projectName);
  const today = todayIso();
  const fixedFiles: string[] = [];

  const scanAndFix = (subdir: "modules" | "pitfalls"): IndexEntry[] => {
    const dir = join(kdir, subdir);
    if (!existsSync(dir)) return [];
    const entries: IndexEntry[] = [];
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      const full = join(dir, f);
      let raw = readFileSync(full, "utf8");
      const fix = autoFixFrontmatter(raw, full, today);
      if (fix.fixed) {
        writeFileSync(full, fix.content);
        fixedFiles.push(`${subdir}/${f}`);
        raw = fix.content;
      }
      const parsed = parseFrontmatter(raw);
      if (!parsed.frontmatter) continue;
      entries.push({
        name: f.replace(/\.md$/, ""),
        title: parsed.frontmatter.title,
        tags: parsed.frontmatter.tags,
        updated: parsed.frontmatter.updated,
        confidence: parsed.frontmatter.confidence,
      });
    }
    return entries;
  };

  for (const single of ["overview.md", "terms.md"]) {
    const full = join(kdir, single);
    if (!existsSync(full)) continue;
    const raw = readFileSync(full, "utf8");
    const fix = autoFixFrontmatter(raw, full, today);
    if (fix.fixed) {
      writeFileSync(full, fix.content);
      fixedFiles.push(single);
    }
  }

  const modules = scanAndFix("modules");
  const pitfalls = scanAndFix("pitfalls");

  const readUpdated = (name: string): string => {
    const path = join(kdir, name);
    if (!existsSync(path)) return "";
    const parsed = parseFrontmatter(readFileSync(path, "utf8"));
    return parsed.frontmatter?.updated ?? "";
  };

  const termsPath = join(kdir, "terms.md");
  let terms_count = 0;
  if (existsSync(termsPath)) {
    const parsed = parseFrontmatter(readFileSync(termsPath, "utf8"));
    terms_count = parsed.body.split("\n").filter((l) => {
      const t = l.trim();
      return (
        t.startsWith("|") &&
        t.endsWith("|") &&
        !t.includes("---") &&
        !t.startsWith("| 术语") &&
        !t.startsWith("| Term")
      );
    }).length;
  }

  return {
    data: {
      modules,
      pitfalls,
      overview_updated: readUpdated("overview.md"),
      terms_updated: readUpdated("terms.md"),
      terms_count,
    },
    fixedFiles,
  };
}

function writeIndexFile(projectName: string): {
  modules_count: number;
  pitfalls_count: number;
  fixed_frontmatter: string[];
  written: string;
} {
  const { data, fixedFiles } = gatherIndexData(projectName);
  const out = renderIndex(projectName, data);
  const indexPath = join(knowledgeDir(projectName), "_index.md");
  writeFileSync(indexPath, out);
  return {
    modules_count: data.modules.length,
    pitfalls_count: data.pitfalls.length,
    fixed_frontmatter: fixedFiles,
    written: indexPath,
  };
}

function renderTermRow(t: ContentTerm): string {
  return `| ${t.term} | ${t.zh} | ${t.desc} | ${t.alias} |`;
}

function upsertOverviewSection(
  body: string,
  section: string,
  newBody: string,
  mode: "append" | "replace",
): string {
  const lines = body.split("\n");
  const headingRe = new RegExp(`^##\\s+${escapeRegex(section)}\\s*$`);

  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingRe.test(lines[i])) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) {
    // Append a new section at the end
    const trailingNewline = body.endsWith("\n") ? "" : "\n";
    return `${body}${trailingNewline}\n## ${section}\n\n${newBody}\n`;
  }

  // Find next heading (## or #) to define section end
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^#{1,2}\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }

  const before = lines.slice(0, startIdx + 1);
  const after = lines.slice(endIdx);

  if (mode === "replace") {
    // Replace section body with blank line + newBody + blank line before next section
    const newSection = ["", newBody, ""];
    return [...before, ...newSection, ...after].join("\n");
  }

  // append mode: keep existing body, append newBody at the end of the section
  const existing = lines.slice(startIdx + 1, endIdx);
  // Trim trailing empty lines before appending, then re-add one blank separator
  let tailTrim = existing.length;
  while (tailTrim > 0 && existing[tailTrim - 1].trim() === "") tailTrim--;
  const trimmedExisting = existing.slice(0, tailTrim);
  const appended = [...trimmedExisting, newBody, ""];
  return [...before, ...appended, ...after].join("\n");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function upsertTermRow(body: string, newRow: string, term: string): string {
  const lines = body.split("\n");
  const rowPrefix = `| ${term} |`;

  let replacedIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith(rowPrefix)) {
      replacedIdx = i;
      break;
    }
  }

  if (replacedIdx !== -1) {
    return [...lines.slice(0, replacedIdx), newRow, ...lines.slice(replacedIdx + 1)].join("\n");
  }

  // Find last table row (| ... |) and insert after it
  let lastRowIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (t.startsWith("|") && t.endsWith("|")) {
      lastRowIdx = i;
      break;
    }
  }
  if (lastRowIdx === -1) {
    // No table, just append
    const trailingNewline = body.endsWith("\n") ? "" : "\n";
    return `${body}${trailingNewline}${newRow}\n`;
  }
  return [...lines.slice(0, lastRowIdx + 1), newRow, ...lines.slice(lastRowIdx + 1)].join("\n");
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("knowledge-keeper")
  .description(
    "Knowledge base CRUD + lint/index for workspace/{project}/knowledge/",
  );

program
  .command("read-core")
  .description("Load core knowledge (overview + terms + index)")
  .requiredOption("--project <name>", "Project name")
  .action((opts: { project: string }) => {
    const kdir = knowledgeDir(opts.project);

    const ovPath = knowledgePath(opts.project, "overview.md");
    let overview = { title: "", content: "", updated: "" };
    if (existsSync(ovPath)) {
      const raw = readFileSync(ovPath, "utf8");
      const parsed = parseFrontmatter(raw);
      overview = {
        title: parsed.frontmatter?.title ?? "",
        content: parsed.body,
        updated: parsed.frontmatter?.updated ?? "",
      };
    }

    const termsPath = knowledgePath(opts.project, "terms.md");
    let terms: TermRow[] = [];
    let terms_updated = "";
    if (existsSync(termsPath)) {
      const raw = readFileSync(termsPath, "utf8");
      const parsed = parseFrontmatter(raw);
      terms = parseTermsTable(parsed.body);
      terms_updated = parsed.frontmatter?.updated ?? "";
    }

    const modules = scanEntries(join(kdir, "modules"));
    const pitfalls = scanEntries(join(kdir, "pitfalls"));

    const result = {
      project: opts.project,
      overview,
      terms,
      index: {
        modules,
        pitfalls,
        overview_updated: overview.updated,
        terms_updated,
        terms_count: terms.length,
      },
    };

    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  });

program
  .command("read-module")
  .description("Load a single module by name")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--module <name>", "Module name (without .md)")
  .action((opts: { project: string; module: string }) => {
    const path = knowledgePath(opts.project, "modules", `${opts.module}.md`);
    if (!existsSync(path)) {
      process.stderr.write(
        `[knowledge-keeper] Module not found: ${opts.module}\n`,
      );
      process.exit(1);
    }
    const raw = readFileSync(path, "utf8");
    const parsed = parseFrontmatter(raw);
    const result = {
      project: opts.project,
      module: opts.module,
      frontmatter: parsed.frontmatter,
      content: parsed.body,
    };
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  });

program
  .command("read-pitfall")
  .description("Search pitfalls by query (filename + tags)")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--query <keyword>", "Search keyword")
  .action((opts: { project: string; query: string }) => {
    const pdir = knowledgePath(opts.project, "pitfalls");
    const files: { name: string; tags: string[]; title: string; path: string }[] =
      [];
    if (existsSync(pdir)) {
      for (const f of readdirSync(pdir)) {
        if (!f.endsWith(".md")) continue;
        const raw = readFileSync(join(pdir, f), "utf8");
        const parsed = parseFrontmatter(raw);
        if (!parsed.frontmatter) continue;
        files.push({
          name: f.replace(/\.md$/, ""),
          tags: parsed.frontmatter.tags,
          title: parsed.frontmatter.title,
          path: join(pdir, f),
        });
      }
    }

    const hits = searchPitfalls(opts.query, files);
    const matches = hits.map((h) => {
      const f = files.find((x) => x.name === h.name)!;
      return {
        name: f.name,
        title: f.title,
        tags: f.tags,
        match_by: h.match_by,
        path: f.path,
      };
    });

    process.stdout.write(
      JSON.stringify(
        { project: opts.project, query: opts.query, matches },
        null,
        2,
      ) + "\n",
    );
  });

program
  .command("index")
  .description("Rebuild _index.md (and auto-fix phase-0 templates)")
  .requiredOption("--project <name>", "Project name")
  .action((opts: { project: string }) => {
    const result = writeIndexFile(opts.project);
    process.stdout.write(
      JSON.stringify({ project: opts.project, ...result }, null, 2) + "\n",
    );
  });

program
  .command("write")
  .description("Write knowledge entry (term/overview/module/pitfall)")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--type <type>", "Entry type: term|overview|module|pitfall")
  .requiredOption("--content <json>", "Content as JSON string")
  .option("--confidence <level>", "Confidence: high|medium|low", "medium")
  .option("--confirmed", "Confirm medium-confidence write", false)
  .option("--dry-run", "Preview without writing", false)
  .option("--overwrite", "Allow overwriting existing module/pitfall file", false)
  .action((opts: {
    project: string;
    type: string;
    content: string;
    confidence: string;
    confirmed: boolean;
    dryRun: boolean;
    overwrite: boolean;
  }) => {
    const gate = confidenceGate(opts.confidence, opts.confirmed);
    if (!gate.allowed) {
      process.stderr.write(`[knowledge-keeper] ${gate.reason}\n`);
      process.exit(1);
    }

    const today = todayIso();
    let targetPath = "";
    let beforeContent = "";
    let afterContent = "";

    if (opts.type === "term") {
      const parsed = parseContentJson<ContentTerm>("term", opts.content);
      targetPath = knowledgePath(opts.project, "terms.md");
      beforeContent = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
      const file = parseFrontmatter(beforeContent);
      const existingFm = file.frontmatter;
      const newFm: Frontmatter = existingFm
        ? { ...existingFm, updated: today }
        : {
            title: `${opts.project} 术语表`,
            type: "term",
            tags: [],
            confidence: "high",
            source: "",
            updated: today,
          };
      const baseBody = existingFm
        ? file.body
        : `\n# ${newFm.title}\n\n| 术语 | 中文 | 解释 | 别名 |\n|---|---|---|---|\n`;
      const newBody = upsertTermRow(baseBody, renderTermRow(parsed), parsed.term);
      afterContent = serializeFrontmatter(newFm) + newBody;
    } else if (opts.type === "overview") {
      const parsed = parseContentJson<ContentOverview>("overview", opts.content);
      targetPath = knowledgePath(opts.project, "overview.md");
      beforeContent = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
      const file = parseFrontmatter(beforeContent);
      const existingFm = file.frontmatter;
      const newFm: Frontmatter = existingFm
        ? { ...existingFm, updated: today }
        : {
            title: `${opts.project} 业务概览`,
            type: "overview",
            tags: [],
            confidence: "high",
            source: "",
            updated: today,
          };
      const baseBody = existingFm ? file.body : `\n# ${newFm.title}\n`;
      const newBody = upsertOverviewSection(baseBody, parsed.section, parsed.body, parsed.mode);
      afterContent = serializeFrontmatter(newFm) + newBody;
    } else if (opts.type === "module" || opts.type === "pitfall") {
      const parsed = parseContentJson<ContentModule | ContentPitfall>(opts.type, opts.content);
      const subdir = opts.type === "module" ? "modules" : "pitfalls";
      targetPath = knowledgePath(opts.project, subdir, `${parsed.name}.md`);
      const exists = existsSync(targetPath);
      if (exists && !opts.overwrite) {
        process.stderr.write(`[knowledge-keeper] File exists: ${targetPath} (use --overwrite)\n`);
        process.exit(1);
      }
      beforeContent = exists ? readFileSync(targetPath, "utf8") : "";
      const newFm: Frontmatter = {
        title: parsed.title,
        type: opts.type === "module" ? "module" : "pitfall",
        tags: parsed.tags,
        confidence: opts.confidence as Frontmatter["confidence"],
        source: parsed.source,
        updated: today,
      };
      afterContent = serializeFrontmatter(newFm) + "\n" + parsed.body + (parsed.body.endsWith("\n") ? "" : "\n");
    } else {
      process.stderr.write(`[knowledge-keeper] Unknown type: ${opts.type}\n`);
      process.exit(1);
    }

    if (opts.dryRun) {
      process.stdout.write(
        JSON.stringify(
          {
            dry_run: true,
            action: "write",
            type: opts.type,
            file: targetPath,
            before: beforeContent,
            after: afterContent,
          },
          null,
          2,
        ) + "\n",
      );
      return;
    }

    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, afterContent);
    writeIndexFile(opts.project);
    process.stdout.write(
      JSON.stringify(
        {
          action: "write",
          type: opts.type,
          file: targetPath,
          before: beforeContent,
          after: afterContent,
        },
        null,
        2,
      ) + "\n",
    );
  });

interface UpdateContentShape {
  frontmatter_patch?: Partial<Frontmatter>;
  body_patch?: { section?: string; row_id?: string; new_body?: string };
  mode: "patch" | "replace";
}

program
  .command("update")
  .description("Update an existing knowledge file (frontmatter / body)")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--path <rel>", "Relative path under knowledge/")
  .requiredOption("--content <json>", "JSON patch spec")
  .option("--confirmed", "Confirm update", false)
  .option("--dry-run", "Preview without persisting", false)
  .action((opts: {
    project: string;
    path: string;
    content: string;
    confirmed: boolean;
    dryRun: boolean;
  }) => {
    // 1. 路径安全
    if (opts.path.startsWith("/") || opts.path.includes("..")) {
      process.stderr.write(`[knowledge-keeper] Invalid path: ${opts.path}\n`);
      process.exit(1);
    }

    // 2. --confirmed 必须
    if (!opts.confirmed) {
      process.stderr.write(`[knowledge-keeper] update requires --confirmed\n`);
      process.exit(1);
    }

    // 3. 路径存在性
    const full = knowledgePath(opts.project, opts.path);
    if (!existsSync(full)) {
      process.stderr.write(`[knowledge-keeper] File not found: ${opts.path}\n`);
      process.exit(1);
    }

    // 4. parse content JSON
    let patch: UpdateContentShape;
    try {
      patch = JSON.parse(opts.content) as UpdateContentShape;
    } catch (err) {
      process.stderr.write(`[knowledge-keeper] Invalid JSON for update: ${err}\n`);
      process.exit(1);
      return;
    }
    if (patch.mode !== "patch" && patch.mode !== "replace") {
      process.stderr.write(`[knowledge-keeper] Invalid mode "${patch.mode}"; must be patch|replace\n`);
      process.exit(1);
    }

    // 5. 读文件 → parseFrontmatter
    const beforeContent = readFileSync(full, "utf8");
    const parsed = parseFrontmatter(beforeContent);
    if (!parsed.frontmatter) {
      process.stderr.write(`[knowledge-keeper] File has no valid frontmatter: ${opts.path}\n`);
      process.exit(1);
      return;
    }

    const today = todayIso();

    // 6. 构造新 fm（immutable spread）
    const newFm: Frontmatter = {
      ...parsed.frontmatter,
      ...(patch.frontmatter_patch ?? {}),
      updated: today,
    };

    // 7. 处理 body_patch
    let newBody = parsed.body;
    if (patch.body_patch) {
      const bp = patch.body_patch;
      const fmType = newFm.type;
      if ((fmType === "module" || fmType === "pitfall") && typeof bp.new_body === "string") {
        newBody = bp.new_body;
      } else if (fmType === "overview" && bp.section && typeof bp.new_body === "string") {
        newBody = upsertOverviewSection(parsed.body, bp.section, bp.new_body, "replace");
      } else if (fmType === "term" && bp.row_id && typeof bp.new_body === "string") {
        newBody = upsertTermRow(parsed.body, bp.new_body, bp.row_id);
      }
    }

    const afterContent =
      serializeFrontmatter(newFm) + "\n" + newBody + (newBody.endsWith("\n") ? "" : "\n");

    // 9. dry-run
    if (opts.dryRun) {
      process.stdout.write(
        JSON.stringify(
          {
            dry_run: true,
            action: "update",
            file: full,
            before: beforeContent,
            after: afterContent,
          },
          null,
          2,
        ) + "\n",
      );
      return;
    }

    // 10. 真实写
    writeFileSync(full, afterContent);
    writeIndexFile(opts.project);
    process.stdout.write(
      JSON.stringify(
        {
          action: "update",
          file: full,
          before: beforeContent,
          after: afterContent,
        },
        null,
        2,
      ) + "\n",
    );
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`[knowledge-keeper] Unexpected error: ${err}\n`);
  process.exit(1);
});
