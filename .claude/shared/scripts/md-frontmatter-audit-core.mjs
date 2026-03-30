import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "fs";
import { resolve, join, relative, dirname, basename } from "path";
import { fileURLToPath } from "url";
import {
  buildFrontMatter,
  extractModuleKey,
  extractVersionFromPath,
  inferTags,
  parseFrontMatter,
} from "./front-matter-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(__dirname, "../../..");
const VALID_PRODUCTS = new Set([
  "data-assets",
  "batch-works",
  "data-query",
  "variable-center",
  "public-service",
  "xyzh",
]);
const VALID_PRD_STATUS = new Set(["raw", "formalized", "enhanced"]);

export function resolveAuditRoot(rootArg = DEFAULT_ROOT) {
  return resolve(rootArg);
}

export function collectTargetFiles({
  root = DEFAULT_ROOT,
  archiveOnly = false,
  requirementsOnly = false,
  pathArg = null,
} = {}) {
  const repoRoot = resolveAuditRoot(root);
  if (pathArg) return [resolve(pathArg)];

  const scopes = archiveOnly && !requirementsOnly
    ? ["archive"]
    : requirementsOnly && !archiveOnly
      ? ["requirements"]
      : ["archive", "requirements"];

  const files = [];
  for (const scope of scopes) {
    const dir = scope === "archive"
      ? join(repoRoot, "cases/archive")
      : join(repoRoot, "cases/requirements");
    files.push(...collectMdFiles(dir));
  }
  return files.sort();
}

export function auditFile(filePath, { root = DEFAULT_ROOT } = {}) {
  const repoRoot = resolveAuditRoot(root);
  const normalizedPath = normalizePath(filePath);
  const docKind = normalizedPath.includes("/cases/archive/")
    ? "archive"
    : normalizedPath.includes("/cases/requirements/")
      ? "requirements"
      : null;

  if (!docKind) {
    throw new Error(`不支持的 Markdown 路径: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf8");
  const { frontMatter, body } = parseFrontMatter(content);
  const relPath = relativePath(repoRoot, filePath);
  const bucket = computeBucket(repoRoot, filePath, docKind);

  return docKind === "archive"
    ? auditArchiveFile({ filePath, repoRoot, relPath, bucket, content, frontMatter, body })
    : auditRequirementFile({ filePath, repoRoot, relPath, bucket, content, frontMatter, body });
}

export function previewCanonicalFrontMatter(filePath, options = {}) {
  return buildFrontMatter(auditFile(filePath, options).canonicalFrontMatter);
}

export function runFrontMatterAudit({
  root = DEFAULT_ROOT,
  archiveOnly = false,
  requirementsOnly = false,
  pathArg = null,
  fix = false,
} = {}) {
  const repoRoot = resolveAuditRoot(root);
  const files = collectTargetFiles({ root: repoRoot, archiveOnly, requirementsOnly, pathArg });
  const records = files.map((filePath) => auditFile(filePath, { root: repoRoot }));

  if (fix) {
    const writeErrors = [];
    const fixed = [];
    for (const record of records) {
      try {
        applyFix(record);
        fixed.push(record.filePath);
      } catch (error) {
        writeErrors.push({
          filePath: record.relPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return {
      mode: "fix",
      records,
      fixedCount: fixed.length,
      writeErrors,
      output: formatFixSummary(records, fixed.length, writeErrors),
      exitCode: writeErrors.length > 0 ? 1 : 0,
    };
  }

  const summary = summarizeIssues(records);
  const hasIssues = records.some((record) => record.issues.length > 0);
  return {
    mode: "report",
    records,
    summary,
    output: formatReport(records, summary),
    exitCode: hasIssues ? 1 : 0,
  };
}

export function formatReport(records, summary = summarizeIssues(records)) {
  const lines = [];
  const grouped = new Map();

  for (const record of records.filter((item) => item.issues.length > 0)) {
    const group = grouped.get(record.bucket) || [];
    group.push(record);
    grouped.set(record.bucket, group);
  }

  if (grouped.size === 0) {
    lines.push("No issues found.");
  }

  for (const bucket of [...grouped.keys()].sort()) {
    lines.push(`## ${bucket}`);
    for (const record of grouped.get(bucket) || []) {
      lines.push(record.relPath);
      for (const issue of record.issues) {
        lines.push(`- ${issue.level === "error" ? "❌" : "⚠️"} ${issue.code}`);
      }
      lines.push("");
    }
  }

  lines.push("Summary:");
  lines.push(`Total files: ${summary.totalFiles}`);
  lines.push(`Files with issues: ${summary.filesWithIssues}`);
  for (const [code, count] of summary.issueCounts) {
    lines.push(`${code}: ${count}`);
  }

  return lines.join("\n").trimEnd() + "\n";
}

function formatFixSummary(records, fixedCount, writeErrors) {
  const lines = [];
  lines.push(`Fixed files: ${fixedCount}`);
  if (writeErrors.length > 0) {
    lines.push(`Write errors: ${writeErrors.length}`);
    for (const item of writeErrors) {
      lines.push(`- ❌ ${item.filePath}: ${item.error}`);
    }
  }
  for (const record of records) {
    lines.push(`- ✅ ${record.relPath}`);
  }
  return lines.join("\n") + "\n";
}

function summarizeIssues(records) {
  const issueCounts = new Map();
  let filesWithIssues = 0;
  for (const record of records) {
    if (record.issues.length > 0) filesWithIssues++;
    for (const issue of record.issues) {
      issueCounts.set(issue.code, (issueCounts.get(issue.code) || 0) + 1);
    }
  }
  return {
    totalFiles: records.length,
    filesWithIssues,
    issueCounts: [...issueCounts.entries()].sort((a, b) => a[0].localeCompare(b[0], "zh-CN")),
  };
}

function applyFix(record) {
  const nextContent = buildFrontMatter(record.canonicalFrontMatter) + record.body;
  writeFileSync(record.filePath, nextContent, "utf8");
  verifyRewrite(record);
}

function verifyRewrite(record) {
  const content = readFileSync(record.filePath, "utf8");
  const { frontMatter, body } = parseFrontMatter(content);
  if (!frontMatter) {
    throw new Error("写入后 frontmatter 丢失");
  }
  if (frontMatter.name !== undefined || frontMatter.module !== undefined || frontMatter.source !== undefined || frontMatter.created_at !== undefined) {
    throw new Error("legacy 字段未清理干净");
  }
  if (record.docKind === "archive") {
    if (!isValidCaseCount(frontMatter.case_count)) {
      throw new Error("case_count 必须是非负整数");
    }
    if (frontMatter.case_count !== countArchiveCases(body)) {
      throw new Error("case_count 校验失败");
    }
  }
}

function auditArchiveFile({ filePath, repoRoot, relPath, bucket, frontMatter, body }) {
  const hadFrontMatter = frontMatter !== null;
  const current = frontMatter || {};
  const issues = [];
  const suiteName = inferArchiveSuiteName(filePath, current, body);
  const description = inferArchiveDescription(current, suiteName, hadFrontMatter);
  const prdId = inferPrdId(filePath, current, body);
  const expectedVersion = extractVersionFromPath(filePath);
  const prdVersion = inferArchiveVersion(filePath, current);
  const product = inferProduct(filePath, current);
  const tags = inferArchiveTags(filePath, current, body);
  const createAt = inferArchiveCreateAt(filePath, current, hadFrontMatter);
  const prdPath = inferArchivePrdPath({ repoRoot, filePath, suiteName, product, prdVersion, current });
  const status = typeof current.status === "string" ? current.status : "";
  const healthWarnings = Array.isArray(current.health_warnings) ? current.health_warnings : [];
  const origin = inferOrigin(current, body);
  const caseCount = countArchiveCases(body);

  if (!hadFrontMatter) {
    issues.push(issue("error", "missing frontmatter"));
  } else if (isLegacyFrontMatter(current)) {
    issues.push(issue("error", "legacy frontmatter"));
  }
  if (!stringValue(current.suite_name)) issues.push(issue("warn", "missing suite_name"));
  if (!stringValue(current.description)) issues.push(issue("warn", "missing description"));
  else if (String(current.description).trim().length > 60) issues.push(issue("warn", "description > 60 chars"));
  if (isDtstackFile(filePath) && !valueExists(current.prd_id)) issues.push(issue("warn", "missing prd_id"));
  if (expectedVersion && !stringValue(current.prd_version) && !stringValue(current.version)) issues.push(issue("error", "missing prd_version"));
  if (expectedVersion && stringValue(current.prd_version) && String(current.prd_version).trim() !== expectedVersion) issues.push(issue("error", "prd_version mismatch"));
  if (!stringValue(current.product) && !stringValue(current.module)) issues.push(issue("error", "missing product"));
  else if (product && !VALID_PRODUCTS.has(product)) issues.push(issue("error", "invalid product"));
  if (!stringValue(current.create_at) && !stringValue(current.created_at)) issues.push(issue("error", "missing create_at"));
  if (!Object.prototype.hasOwnProperty.call(current, "case_count")) issues.push(issue("error", "missing case_count"));
  else if (!isValidCaseCount(current.case_count)) issues.push(issue("error", "invalid case_count"));
  else if (current.case_count !== caseCount) issues.push(issue("error", "mismatched case_count"));
  if (!Object.prototype.hasOwnProperty.call(current, "health_warnings")) issues.push(issue("error", "missing health_warnings"));
  if (!Object.prototype.hasOwnProperty.call(current, "status")) issues.push(issue("error", "missing status"));
  if (!Object.prototype.hasOwnProperty.call(current, "prd_path")) issues.push(issue("error", "missing prd_path"));
  if (tags.length < 3 || tags.length > 10) issues.push(issue("warn", "tags outside 3-10 range"));
  issues.push(...findArchiveBodyIssues(body));

  const canonicalFrontMatter = {
    suite_name: suiteName || undefined,
    description: description || undefined,
    prd_id: prdId ?? undefined,
    prd_version: prdVersion || undefined,
    prd_path: prdPath,
    ...(stringValue(current.prd_url) ? { prd_url: String(current.prd_url).trim() } : {}),
    product: product || undefined,
    ...(stringValue(current.dev_version) ? { dev_version: String(current.dev_version).trim() } : {}),
    tags,
    create_at: createAt || undefined,
    status,
    health_warnings: healthWarnings,
    case_count: caseCount,
    ...(origin ? { origin } : {}),
  };

  return { docKind: "archive", filePath, relPath, bucket, issues, canonicalFrontMatter, body };
}

function auditRequirementFile({ filePath, repoRoot, relPath, bucket, frontMatter, body }) {
  const hadFrontMatter = frontMatter !== null;
  const current = frontMatter || {};
  const issues = [];
  const prdName = inferRequirementName(filePath, current, body);
  const description = inferRequirementDescription(current, prdName, body, hadFrontMatter);
  const prdId = inferPrdId(filePath, current, body);
  const prdVersion = inferRequirementVersion(filePath, current, body);
  const product = inferProduct(filePath, current);
  const { source, devVersion } = parseRequirementMeta(body, current);
  const createAt = inferRequirementCreateAt(filePath, current, hadFrontMatter);
  const statusInfo = inferRequirementStatus(filePath, current);
  const tags = Array.isArray(current.tags) ? sanitizeTags(current.tags) : [];
  const healthWarnings = Array.isArray(current.health_warnings) ? current.health_warnings : [];

  if (!hadFrontMatter) {
    issues.push(issue("error", "missing frontmatter"));
  } else if (isLegacyFrontMatter(current)) {
    issues.push(issue("error", "legacy frontmatter"));
  }
  if (!stringValue(current.prd_name) && !stringValue(current.suite_name) && !stringValue(current.name)) issues.push(issue("warn", "missing prd_name"));
  if (!stringValue(current.description)) issues.push(issue("warn", "missing description"));
  if (!stringValue(current.product) && !stringValue(current.module)) issues.push(issue("error", "missing product"));
  if (!stringValue(current.create_at) && !stringValue(current.created_at)) issues.push(issue("error", "missing create_at"));
  if (!statusInfo.currentValid) issues.push(issue("warn", statusInfo.currentMissing ? "missing status" : "invalid status"));

  const canonicalFrontMatter = {
    prd_name: prdName || undefined,
    description: description || undefined,
    prd_id: prdId ?? undefined,
    prd_version: prdVersion || undefined,
    prd_source: source,
    ...(stringValue(current.prd_url) ? { prd_url: String(current.prd_url).trim() } : {}),
    product: product || undefined,
    ...(devVersion ? { dev_version: devVersion } : {}),
    tags,
    create_at: createAt || undefined,
    status: statusInfo.nextValue,
    health_warnings: healthWarnings,
    case_path: stringValue(current.case_path) || "",
  };

  return { docKind: "requirements", filePath, relPath, bucket, issues, canonicalFrontMatter, body };
}

function inferArchiveSuiteName(filePath, frontMatter, body) {
  return cleanArchiveTitle(stringValue(frontMatter.suite_name) || stringValue(frontMatter.name) || firstHeading(body, 1) || basename(filePath, ".md"));
}

function inferArchiveDescription(frontMatter, suiteName, hadFrontMatter) {
  if (typeof frontMatter.description === "string") return frontMatter.description.trim();
  return hadFrontMatter ? "" : cleanArchiveTitle(stripTicketSuffix(suiteName));
}

function inferArchiveVersion(filePath, frontMatter) {
  return stringValue(frontMatter.prd_version)
    || stringValue(frontMatter.version)
    || extractVersionFromPath(filePath)
    || extractVersionFromPath(stringValue(frontMatter.source) || "")
    || null;
}

function inferProduct(filePath, frontMatter) {
  return stringValue(frontMatter.product) || stringValue(frontMatter.module) || extractModuleKey(filePath);
}

function inferArchiveTags(filePath, frontMatter, body) {
  const currentTags = Array.isArray(frontMatter.tags) ? sanitizeTags(frontMatter.tags) : [];
  if (currentTags.length > 0) return currentTags;
  const headings = [...body.matchAll(/^#{2,3}\s+(.+)$/gm)].map((match) => match[1].trim());
  return inferTags({
    title: inferArchiveSuiteName(filePath, frontMatter, body),
    headings,
    modulePath: filePath,
    meta: {},
  });
}

function inferArchiveCreateAt(filePath, frontMatter, hadFrontMatter) {
  return normalizeDateValue(frontMatter.create_at)
    || normalizeDateValue(frontMatter.created_at)
    || dateFromMtime(filePath);
}

function inferArchivePrdPath({ repoRoot, filePath, suiteName, product, prdVersion, current }) {
  const explicit = stringValue(current.prd_path);
  if (explicit !== null) return explicit;
  const requirementDir = resolveRequirementsDir(repoRoot, product, prdVersion);
  if (!requirementDir) return "";

  const candidateNames = new Set([
    `${stripTicketSuffix(cleanArchiveTitle(basename(filePath, ".md")))}.md`,
    `${stripTicketSuffix(cleanArchiveTitle(suiteName))}.md`,
  ]);
  for (const candidate of candidateNames) {
    const fullPath = join(requirementDir, candidate);
    if (existsSync(fullPath)) return relativePath(repoRoot, fullPath);
  }
  return "";
}

function inferRequirementName(filePath, frontMatter, body) {
  return cleanRequirementName(stringValue(frontMatter.prd_name) || stringValue(frontMatter.suite_name) || stringValue(frontMatter.name) || firstHeading(body, 1) || basename(filePath, ".md"));
}

function inferRequirementDescription(frontMatter, prdName, body, hadFrontMatter) {
  if (typeof frontMatter.description === "string") return frontMatter.description.trim();
  if (hadFrontMatter) return "";
  const candidate = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith(">") && !line.startsWith("<!--") && !line.startsWith("|") && !line.startsWith("-"))
    .find(Boolean);
  return candidate ? candidate.slice(0, 60) : prdName;
}

function inferRequirementVersion(filePath, frontMatter, body) {
  return stringValue(frontMatter.prd_version)
    || stringValue(frontMatter.version)
    || extractVersionFromPath(filePath)
    || extractVersionFromPath(body)
    || null;
}

function parseRequirementMeta(body, frontMatter) {
  const source = stringValue(frontMatter.prd_source) || stringValue(frontMatter.source) || extractBlockMeta(body, "来源") || "内部需求文档";
  const devVersion = stringValue(frontMatter.dev_version) || extractBlockMeta(body, "开发版本") || null;
  return { source, devVersion };
}

function inferRequirementCreateAt(filePath, frontMatter, hadFrontMatter) {
  return normalizeDateValue(frontMatter.create_at)
    || normalizeDateValue(frontMatter.created_at)
    || normalizeDateValue(frontMatter.imported_at)
    || dateFromMtime(filePath);
}

function inferRequirementStatus(filePath, frontMatter) {
  const current = stringValue(frontMatter.status);
  const inferred = inferStatusFromName(filePath);
  if (current && VALID_PRD_STATUS.has(current)) return { currentValid: true, currentMissing: false, nextValue: current };
  if (!current) return { currentValid: false, currentMissing: true, nextValue: inferred };
  return { currentValid: false, currentMissing: false, nextValue: inferred };
}

function inferStatusFromName(filePath) {
  const name = basename(filePath, ".md").toLowerCase();
  if (name.endsWith("-enhanced")) return "enhanced";
  if (name.endsWith("-formalized")) return "formalized";
  return "raw";
}

function inferPrdId(filePath, frontMatter, body) {
  const candidates = [
    frontMatter.prd_id,
    basename(filePath, ".md"),
    firstHeading(body, 1),
    stringValue(frontMatter.name),
    stringValue(frontMatter.suite_name),
    stringValue(frontMatter.prd_name),
  ];
  for (const item of candidates) {
    const id = parsePrdId(item);
    if (id !== null) return id;
  }
  return null;
}

function inferOrigin(frontMatter, body) {
  const explicit = stringValue(frontMatter.origin);
  if (explicit) return explicit;
  const source = stringValue(frontMatter.source) || stringValue(frontMatter.prd_path) || extractBlockMeta(body, "来源") || "";
  if (/\.xmind$/i.test(source) || /\/xmind\//.test(source)) return "xmind";
  if (/\.csv$/i.test(source) || /\/history\//.test(source)) return "csv";
  if (/\.json$/i.test(source)) return "json";
  if (/<!--\s*split-from:/i.test(body)) return "split";
  return null;
}

function countArchiveCases(body) {
  return [...body.matchAll(/^#####\s+/gm)].length;
}

function findArchiveBodyIssues(body) {
  const issues = [];
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  if (body.trimStart().startsWith("# ")) issues.push(issue("warn", "body contains H1"));

  const caseIndices = [];
  for (let index = 0; index < lines.length; index++) {
    if (lines[index].startsWith("##### ")) caseIndices.push(index);
  }

  for (let position = 0; position < caseIndices.length; position++) {
    const start = caseIndices[position];
    const end = position + 1 < caseIndices.length ? caseIndices[position + 1] : lines.length;
    const title = lines[start].replace(/^#####\s+/, "").trim();
    if (!/^【P[0-2]】/.test(title)) issues.push(issue("warn", "case title missing priority prefix"));

    const section = lines.slice(start + 1, end);
    const stepMarkerIndex = section.findIndex((line) => line.trim() === "> 用例步骤");
    const tableIndex = section.findIndex((line) => /^\|\s*编号\s*\|/.test(line));

    if (tableIndex !== -1) {
      if (stepMarkerIndex === -1 || stepMarkerIndex > tableIndex) issues.push(issue("warn", "missing > 用例步骤"));
      const dataRow = findFirstTableDataRow(section, tableIndex);
      if (dataRow && !String(dataRow.step || "").startsWith("进入【")) issues.push(issue("warn", "first step not starting with 进入【"));
    }

    if (stepMarkerIndex > 0) {
      const beforeSteps = section.slice(0, stepMarkerIndex).map((line) => line.trim()).filter(Boolean);
      if (beforeSteps.length > 0 && beforeSteps[0] !== "> 前置条件") issues.push(issue("warn", "missing > 前置条件"));
    }
  }

  return issues;
}

function findFirstTableDataRow(section, tableIndex) {
  for (let index = tableIndex + 1; index < section.length; index++) {
    const line = section[index].trim();
    if (!line.startsWith("|")) return null;
    if (/^\|\s*-+/.test(line) || /^\|\s*---/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    return { step: cells[1] || "" };
  }
  return null;
}

function resolveRequirementsDir(repoRoot, product, version) {
  if (!product) return null;
  if (product === "xyzh") {
    const xyzhDir = join(repoRoot, "cases/requirements/custom/xyzh");
    return existsSync(xyzhDir) ? xyzhDir : null;
  }
  const base = join(repoRoot, "cases/requirements", product);
  if (version && existsSync(join(base, version))) return join(base, version);
  return existsSync(base) ? base : null;
}

function computeBucket(repoRoot, filePath, docKind) {
  const rel = relativePath(repoRoot, filePath);
  const prefix = docKind === "archive" ? "cases/archive/" : "cases/requirements/";
  const trimmed = rel.startsWith(prefix) ? rel.slice(prefix.length) : rel;
  const dir = dirname(trimmed).replace(/\\/g, "/");
  return dir === "." ? docKind : dir;
}

function collectMdFiles(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectMdFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".md")) results.push(fullPath);
  }
  return results;
}

function normalizeDateValue(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const exact = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (exact) return exact[1];
  const prefix = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (prefix) return prefix[1];
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function dateFromMtime(filePath) {
  return statSync(filePath).mtime.toISOString().slice(0, 10);
}

function parsePrdId(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return null;
  const raw = String(value);
  const match = raw.match(/\(#(\d+)\)/) || raw.match(/（#(\d+)）/) || raw.match(/\bPRD[-\s_]*(\d+)\b/i);
  return match ? Number(match[1]) : null;
}

function firstHeading(body, level) {
  const match = body.match(new RegExp(`^${"#".repeat(level)}\\s+(.+)$`, "m"));
  return match ? match[1].trim() : "";
}

function extractBlockMeta(body, label) {
  const match = body.match(new RegExp(`^>\\s*${label}[:：]\\s*(.+)$`, "m"));
  return match ? match[1].trim() : null;
}

function cleanArchiveTitle(value) {
  return String(value || "").replace(/[（(]XMind[)）]/gi, "").replace(/\s+/g, " ").trim();
}

function cleanRequirementName(value) {
  return String(value || "").replace(/^PRD[-\s_]*\d+\s*/i, "").replace(/-enhanced$/i, "").replace(/-formalized$/i, "").trim();
}

function stripTicketSuffix(value) {
  return String(value || "").replace(/\s*\(#\d+\)\s*/g, "").replace(/\s*（#\d+）\s*/g, "").trim();
}

function sanitizeTags(tags) {
  return tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 10);
}

function isLegacyFrontMatter(frontMatter) {
  return frontMatter && (frontMatter.name !== undefined || frontMatter.module !== undefined || frontMatter.source !== undefined || frontMatter.created_at !== undefined);
}

function isDtstackFile(filePath) {
  return extractModuleKey(filePath) !== "xyzh";
}

function issue(level, code) {
  return { level, code };
}

function relativePath(root, filePath) {
  return relative(root, filePath).replace(/\\/g, "/");
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : null;
}

function valueExists(value) {
  return value !== null && value !== undefined && value !== "";
}

function isValidCaseCount(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
