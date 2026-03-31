/**
 * audit-md-frontmatter.mjs
 * 审计并可选修复 {casesRoot}/archive 和 {casesRoot}/requirements 下的 Markdown frontmatter（路径从 config.json 读取）。
 *
 * 用法:
 *   node .claude/shared/scripts/audit-md-frontmatter.mjs
 *   node .claude/shared/scripts/audit-md-frontmatter.mjs --dry-run
 *   node .claude/shared/scripts/audit-md-frontmatter.mjs --fix
 *   node .claude/shared/scripts/audit-md-frontmatter.mjs --root <dir> --path <file-or-dir>
 */
import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";
import { resolve, join, dirname, basename, relative } from "path";
import { fileURLToPath } from "url";
import { loadConfig } from "./load-config.mjs";
import {
  ARCHIVE_BODY_STRUCTURE_CATEGORIES,
  buildFrontMatter,
  classifyArchiveBodyStructure,
  countArchiveCases,
  extractModuleKey,
  extractPrdId,
  extractVersionFromPath,
  inferTags,
  isValidDateString,
  normalizeDateString,
  parseFrontMatter,
} from "./front-matter-utils.mjs";
import { resolveMdContentSource } from "./md-content-source-resolver.mjs";
import { normalizeArchiveBody } from "./normalize-md-content.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(__dirname, "../../..");
const args = process.argv.slice(2);

const DRY_RUN = args.includes("--dry-run");
const FIX = args.includes("--fix") && !DRY_RUN;
const ROOT = resolveArgPath("--root") || DEFAULT_ROOT;
const PATH_ARG = resolveArgPath("--path");
const CONFIG = loadConfig();
const VALID_PRODUCTS = new Set(Object.keys(CONFIG.modules || {}));
const DTSTACK_PRODUCTS = new Set(
  Object.entries(CONFIG.modules || {})
    .filter(([, mod]) => mod.type !== "custom")
    .map(([key]) => key),
);
const ARCHIVE_FIELD_ORDER = [
  "suite_name",
  "description",
  "prd_id",
  "prd_version",
  "prd_path",
  "prd_url",
  "product",
  "dev_version",
  "tags",
  "create_at",
  "update_at",
  "status",
  "health_warnings",
  "repos",
  "case_count",
  "origin",
];
const REQUIREMENT_FIELD_ORDER = [
  "prd_name",
  "description",
  "prd_id",
  "prd_version",
  "prd_source",
  "prd_url",
  "product",
  "dev_version",
  "tags",
  "create_at",
  "update_at",
  "status",
  "health_warnings",
  "repos",
  "case_path",
];
const LEGACY_ARCHIVE_KEYS = new Set([
  "name",
  "module",
  "version",
  "source",
  "created_at",
]);
const LEGACY_REQUIREMENT_KEYS = new Set([
  "name",
  "module",
  "version",
  "source",
  "created_at",
]);
const VALID_REQUIREMENT_STATUSES = new Set(["raw", "elicited", "formalized", "enhanced"]);

function resolveArgPath(flag) {
  if (!args.includes(flag)) return null;
  const value = args[args.indexOf(flag) + 1];
  if (!value) return null;
  return resolve(value);
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function relativePath(filePath) {
  return normalizePath(relative(ROOT, filePath) || filePath);
}

function collectMdFiles(targetPath) {
  const results = [];
  let stat;
  try {
    stat = statSync(targetPath);
  } catch {
    return results;
  }

  if (stat.isFile()) {
    if (targetPath.endsWith(".md")) results.push(targetPath);
    return results;
  }

  for (const entry of readdirSync(targetPath, { withFileTypes: true })) {
    const fullPath = join(targetPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function getTargetFiles() {
  if (PATH_ARG) {
    return collectMdFiles(PATH_ARG).sort();
  }
  const casesRoot = CONFIG.casesRoot ?? 'cases/';
  return [
    ...collectMdFiles(join(ROOT, casesRoot, "archive")),
    ...collectMdFiles(join(ROOT, casesRoot, "requirements")),
  ].sort();
}

const _casesRoot = CONFIG.casesRoot ?? 'cases/';
const _archivePrefix = `${_casesRoot}archive/`;
const _requirementsPrefix = `${_casesRoot}requirements/`;

function getDocType(filePath) {
  const rel = relativePath(filePath);
  if (rel.startsWith(_archivePrefix)) return "archive";
  if (rel.startsWith(_requirementsPrefix)) return "requirements";
  return null;
}

function getGroupKey(filePath, docType, product) {
  return `${docType}:${product || "unknown"}`;
}

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asOptionalString(value) {
  if (value === null || value === undefined) return undefined;
  return String(value);
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]") return [];
    return [trimmed];
  }

  return [];
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function inferArchiveOrigin({ source, title, body }) {
  const candidate = [source, title].filter(Boolean).join(" ");
  if (/split-from:/i.test(body)) return "split";
  if (/cases\/history\//i.test(candidate) || /\.csv\b/i.test(candidate)) return "csv";
  if (/cases\/xmind\//i.test(candidate) || /\.xmind\b/i.test(candidate) || /xmind/i.test(candidate)) {
    return "xmind";
  }
  if (/\.json\b/i.test(candidate)) return "json";
  return "";
}

function inferRequirementStatus(filePath, currentStatus) {
  const normalized = asString(currentStatus).toLowerCase();
  if (VALID_REQUIREMENT_STATUSES.has(normalized)) return normalized;
  const base = basename(filePath, ".md").toLowerCase();
  if (base.endsWith("-enhanced")) return "enhanced";
  if (base.endsWith("-formalized")) return "formalized";
  return "raw";
}

function pickArchivePrdPath(meta, legacySource, confirmedPrdPath = "") {
  if (asString(meta.prd_path)) return asString(meta.prd_path);
  if (legacySource && /cases\/requirements\/.+\.md$/i.test(legacySource)) {
    return legacySource;
  }
  if (confirmedPrdPath) return confirmedPrdPath;
  return "";
}

function chooseArchiveDescription(meta, semanticEnrichment = null) {
  const currentDescription = asString(meta.description);
  if (currentDescription && currentDescription.length <= 60) {
    return currentDescription;
  }
  if (semanticEnrichment?.inferredDescription) {
    return semanticEnrichment.inferredDescription;
  }
  return currentDescription || undefined;
}

function chooseArchiveTags(meta, semanticEnrichment = null) {
  const currentTags = hasOwn(meta, "tags") ? toStringArray(meta.tags) : [];
  if (currentTags.length >= 3 && currentTags.length <= 10) {
    return currentTags;
  }
  if (semanticEnrichment?.enrichedTags?.length) {
    return semanticEnrichment.enrichedTags;
  }
  return currentTags.length > 0 ? currentTags : undefined;
}

function buildArchiveSemanticEnrichment(meta, filePath, body) {
  let sourceInfo = null;
  try {
    sourceInfo = resolveMdContentSource(filePath, { rootDir: ROOT });
  } catch {
    return null;
  }

  const confirmedPrdPath = sourceInfo?.existingCandidatePrdPaths?.[0] || "";
  const prdSource = confirmedPrdPath
    ? readMarkdownSemanticSource(confirmedPrdPath)
    : null;
  const prdName = asString(prdSource?.frontMatter?.prd_name)
    || asString(prdSource?.frontMatter?.suite_name)
    || prdSource?.headings?.[0]
    || "";
  const inferredPrdId = extractPrdId(confirmedPrdPath)
    ?? extractPrdId(prdName)
    ?? undefined;
  const mergedTags = mergeUniqueStrings(
    toStringArray(meta.tags),
    toStringArray(prdSource?.frontMatter?.tags),
    inferTags({
      title: prdName || asString(meta.suite_name) || asString(meta.name),
      headings: mergeUniqueStrings(
        extractMarkdownHeadings(body, [2, 3, 4]),
        prdSource?.headings || [],
      ),
      modulePath: relativePath(filePath),
      meta: {
        ...meta,
        tags: mergeUniqueStrings(
          toStringArray(meta.tags),
          toStringArray(prdSource?.frontMatter?.tags),
        ),
      },
    }),
  ).slice(0, 10);
  const inferredDescription = buildTraceableDescription([
    prdName,
    asString(meta.suite_name) || asString(meta.name),
    asString(meta.description),
  ]);

  return {
    confirmedPrdPath,
    inferredPrdId,
    enrichedTags: mergedTags.length > 0 ? mergedTags : undefined,
    inferredDescription,
  };
}

function readMarkdownSemanticSource(relativePrdPath) {
  const fullPath = resolve(ROOT, relativePrdPath);
  try {
    const content = readFileSync(fullPath, "utf8");
    const { frontMatter, body } = parseFrontMatter(content);
    return {
      frontMatter: frontMatter || {},
      body,
      headings: extractMarkdownHeadings(body, [1, 2, 3]),
    };
  } catch {
    return null;
  }
}

function extractMarkdownHeadings(body, allowedLevels = [1, 2, 3]) {
  const levels = new Set(allowedLevels);
  const headings = [];
  for (const match of String(body).matchAll(/^(#{1,6})\s+(.+)$/gm)) {
    const level = match[1]?.length || 0;
    if (!levels.has(level)) continue;
    const heading = normalizeSemanticText(match[2]);
    if (heading) headings.push(heading);
  }
  return headings;
}

function buildTraceableDescription(candidates) {
  const normalizedCandidates = candidates
    .map((candidate) => normalizeSemanticText(candidate))
    .filter(Boolean);
  const shortCandidate = normalizedCandidates.find((candidate) => candidate.length <= 60);
  if (shortCandidate) return shortCandidate;
  const firstCandidate = normalizedCandidates[0] || "";
  return firstCandidate ? firstCandidate.slice(0, 60).trim() : undefined;
}

function normalizeSemanticText(value) {
  return asString(value)
    .replace(/\s*(?:（|\()(?:xmind|XMind)(?:）|\))\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeUniqueStrings(...values) {
  const merged = [];
  const seen = new Set();
  for (const value of values) {
    for (const item of Array.isArray(value) ? value : [value]) {
      const normalized = asString(item);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(normalized);
    }
  }
  return merged;
}

function pickRequirementSource(meta, legacySource, filePath) {
  if (asString(meta.prd_source)) return asString(meta.prd_source);
  if (legacySource) return legacySource;
  return relativePath(filePath);
}

function normalizeFieldValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  return value;
}

function mergeOrderedFields(order, canonicalFields, extraFields, legacyKeys) {
  const merged = {};
  for (const key of order) {
    if (canonicalFields[key] !== undefined && canonicalFields[key] !== null) {
      merged[key] = canonicalFields[key];
    }
  }

  for (const [key, value] of Object.entries(extraFields || {})) {
    if (legacyKeys.has(key)) continue;
    if (order.includes(key)) continue;
    if (value === undefined || value === null) continue;
    merged[key] = normalizeFieldValue(value);
  }

  return merged;
}

function getMtimeDate(filePath) {
  return statSync(filePath).mtime;
}

function firstNonEmptyLine(text) {
  for (const line of String(text).split("\n")) {
    if (line.trim()) return line.trim();
  }
  return "";
}

function parseTableCells(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function auditArchiveBody(body) {
  const issues = [];
  const firstLine = firstNonEmptyLine(body);
  const structure = classifyArchiveBodyStructure(body);
  const caseCount = countArchiveCases(body);

  if (firstLine.startsWith("# ")) {
    issues.push({
      code: "body-h1",
      severity: "error",
      message: "Body 第一行包含 H1 标题",
    });
  }

  if (
    structure !== ARCHIVE_BODY_STRUCTURE_CATEGORIES.CANONICAL_TABLE
    && !(structure === ARCHIVE_BODY_STRUCTURE_CATEGORIES.REQUIREMENTS_NARRATIVE && caseCount === 0)
  ) {
    issues.push({
      code: "body-structure",
      severity: "warning",
      structure,
      message: `Body 结构类型为 ${structure}（期望 canonical table）`,
    });
  }

  if (
    structure === ARCHIVE_BODY_STRUCTURE_CATEGORIES.BULLET_XMIND_TREE
    || structure === ARCHIVE_BODY_STRUCTURE_CATEGORIES.REQUIREMENTS_NARRATIVE
  ) {
    return issues;
  }

  const caseMatches = [...String(body).matchAll(/^#####\s+(.+)$/gm)];
  let missingPriorityCount = 0;
  let missingStepMarkerCount = 0;
  let invalidFirstStepCount = 0;
  let missingPreconditionMarkerCount = 0;

  for (let index = 0; index < caseMatches.length; index++) {
    const match = caseMatches[index];
    const titleLine = match[0];
    if (!/^#####\s+【P[012]】/.test(titleLine)) {
      missingPriorityCount++;
    }

    const sectionStart = match.index ?? 0;
    const sectionEnd = index + 1 < caseMatches.length
      ? (caseMatches[index + 1].index ?? body.length)
      : body.length;
    const sectionLines = String(body)
      .slice(sectionStart, sectionEnd)
      .split("\n");
    const tableHeaderIndex = sectionLines.findIndex((line) =>
      /^\|\s*编号\s*\|\s*步骤\s*\|\s*预期\s*\|?\s*$/.test(line.trim())
    );

    if (tableHeaderIndex === -1) continue;

    const previousNonEmpty = findPreviousNonEmpty(sectionLines, tableHeaderIndex);
    if (previousNonEmpty !== "> 用例步骤") {
      missingStepMarkerCount++;
    }

    const beforeTable = sectionLines.slice(1, tableHeaderIndex);
    const hasPreconditionContent = beforeTable.some((line) => {
      const trimmed = line.trim();
      return Boolean(
        trimmed
        && trimmed !== "> 前置条件"
        && trimmed !== "> 用例步骤",
      );
    });
    if (hasPreconditionContent && !beforeTable.some((line) => line.trim() === "> 前置条件")) {
      missingPreconditionMarkerCount++;
    }

    const firstDataRowIndex = findFirstDataRow(sectionLines, tableHeaderIndex + 1);
    if (firstDataRowIndex !== -1) {
      const cells = parseTableCells(sectionLines[firstDataRowIndex]);
      const firstStep = cells[1] || "";
      if (!firstStep.startsWith("进入【")) {
        invalidFirstStepCount++;
      }
    }
  }

  if (missingPriorityCount > 0) {
    issues.push({
      code: "title-priority",
      severity: "warning",
      count: missingPriorityCount,
      message: `用例标题无优先级前缀（${missingPriorityCount} 处）`,
    });
  }

  if (missingStepMarkerCount > 0) {
    issues.push({
      code: "step-marker",
      severity: "warning",
      count: missingStepMarkerCount,
      message: `步骤表格前缺少 \`> 用例步骤\`（${missingStepMarkerCount} 处）`,
    });
  }

  if (invalidFirstStepCount > 0) {
    issues.push({
      code: "first-step",
      severity: "warning",
      count: invalidFirstStepCount,
      message: `步骤表格第一步未以“进入【”开头（${invalidFirstStepCount} 处）`,
    });
  }

  if (missingPreconditionMarkerCount > 0) {
    issues.push({
      code: "precondition-marker",
      severity: "warning",
      count: missingPreconditionMarkerCount,
      message: `前置条件块前缺少 \`> 前置条件\`（${missingPreconditionMarkerCount} 处）`,
    });
  }

  return issues;
}

function findPreviousNonEmpty(lines, startIndex) {
  for (let index = startIndex - 1; index >= 0; index--) {
    const trimmed = lines[index].trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function findFirstDataRow(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (!trimmed) continue;
    if (/^\|\s*-+/.test(trimmed)) continue;
    if (/^\|/.test(trimmed)) return index;
    if (/^#####\s+/.test(trimmed)) return -1;
  }
  return -1;
}

function buildArchiveCanonicalFields(meta, filePath, body, semanticEnrichment = null) {
  const legacySource = asString(meta.source);
  const suiteName = asString(meta.suite_name) || asString(meta.name);
  const description = chooseArchiveDescription(meta, semanticEnrichment);
  const product = asString(meta.product) || asString(meta.module) || extractModuleKey(filePath) || "";
  const prdVersion = asString(meta.prd_version) || asString(meta.version) || extractVersionFromPath(filePath) || "";
  const prdId = toNumber(meta.prd_id)
    ?? extractPrdId(basename(filePath))
    ?? extractPrdId(suiteName)
    ?? semanticEnrichment?.inferredPrdId
    ?? undefined;
  const createAt = normalizeDateString(meta.create_at ?? meta.created_at, getMtimeDate(filePath));
  const healthWarnings = hasOwn(meta, "health_warnings")
    ? toStringArray(meta.health_warnings)
    : [];
  const repos = hasOwn(meta, "repos")
    ? toStringArray(meta.repos)
    : undefined;
  const status = hasOwn(meta, "status") ? String(meta.status) : "";
  const caseCount = countArchiveCases(body);
  const origin = asString(meta.origin) || inferArchiveOrigin({
    source: legacySource || asString(meta.prd_path),
    title: suiteName,
    body,
  });
  const prdPath = pickArchivePrdPath(meta, legacySource, semanticEnrichment?.confirmedPrdPath);
  const tags = chooseArchiveTags(meta, semanticEnrichment);

  const fields = {
    suite_name: suiteName || undefined,
    description: description || undefined,
    prd_id: prdId ?? undefined,
    prd_version: prdVersion || undefined,
    prd_path: prdPath,
    prd_url: asString(meta.prd_url) || undefined,
    product: VALID_PRODUCTS.has(product) ? product : undefined,
    dev_version: asString(meta.dev_version) || undefined,
    tags,
    create_at: createAt,
    update_at: isValidDateString(asString(meta.update_at)) ? asString(meta.update_at) : undefined,
    status,
    health_warnings: healthWarnings,
    repos,
    case_count: caseCount,
    origin: origin || undefined,
  };

  return fields;
}

function buildRequirementCanonicalFields(meta, filePath) {
  const legacySource = asString(meta.source);
  const bodyHeading = extractMarkdownHeadings(meta.__body || "", [1])[0] || "";
  const prdName = asString(meta.prd_name) || asString(meta.suite_name) || asString(meta.name) || bodyHeading;
  const description = asString(meta.description) || bodyHeading;
  const product = asString(meta.product) || asString(meta.module) || extractModuleKey(filePath) || "";
  const prdVersion = asString(meta.prd_version) || asString(meta.version) || extractVersionFromPath(filePath) || "";
  const prdId = toNumber(meta.prd_id)
    ?? extractPrdId(basename(filePath))
    ?? extractPrdId(prdName);
  const createAt = normalizeDateString(meta.create_at ?? meta.created_at, getMtimeDate(filePath));
  const fields = {
    prd_name: prdName || undefined,
    description: description || undefined,
    prd_id: prdId ?? undefined,
    prd_version: prdVersion || undefined,
    prd_source: pickRequirementSource(meta, legacySource, filePath),
    prd_url: asString(meta.prd_url) || undefined,
    product: VALID_PRODUCTS.has(product) ? product : undefined,
    dev_version: asString(meta.dev_version) || undefined,
    tags: hasOwn(meta, "tags") ? toStringArray(meta.tags) : undefined,
    create_at: createAt,
    update_at: isValidDateString(asString(meta.update_at)) ? asString(meta.update_at) : undefined,
    status: inferRequirementStatus(filePath, meta.status),
    health_warnings: hasOwn(meta, "health_warnings")
      ? toStringArray(meta.health_warnings)
      : undefined,
    repos: hasOwn(meta, "repos")
      ? toStringArray(meta.repos)
      : undefined,
    case_path: asString(meta.case_path) || undefined,
  };

  return fields;
}

function auditArchiveFrontmatter(meta, canonical, filePath, body, hadFrontMatter) {
  const issues = [];
  const derivedProduct = canonical.product || extractModuleKey(filePath) || "";
  const derivedVersion = extractVersionFromPath(filePath);
  const tags = toStringArray(canonical.tags);
  const existingCaseCount = toNumber(meta.case_count);
  const actualCaseCount = canonical.case_count ?? countArchiveCases(body);

  if (!hadFrontMatter) {
    issues.push(issue("missing-frontmatter", "error", "缺少 frontmatter"));
  }

  if (!hasOwn(meta, "suite_name")) {
    issues.push(issue(
      "suite-name",
      "error",
      hasOwn(meta, "name")
        ? "`suite_name` 缺失（当前使用 legacy `name` 字段）"
        : "`suite_name` 缺失",
    ));
  } else if (!asString(canonical.suite_name)) {
    issues.push(issue("suite-name", "error", "`suite_name` 缺失"));
  }

  if (!hasOwn(meta, "description") || !asString(canonical.description)) {
    issues.push(issue("description", "error", "`description` 缺失"));
  } else if (asString(canonical.description).length > 60) {
    issues.push(issue("description-length", "warning", "`description` 超过 60 字"));
  }

  if (!hasOwn(meta, "product")) {
    issues.push(issue(
      "product",
      "error",
      hasOwn(meta, "module")
        ? "`product` 缺失（当前使用 legacy `module` 字段）"
        : "`product` 缺失或无效",
    ));
  } else if (!canonical.product) {
    issues.push(issue("product", "error", "`product` 缺失或无效"));
  }

  if (DTSTACK_PRODUCTS.has(derivedProduct) && canonical.prd_id === undefined) {
    issues.push(issue("prd-id", "warning", "`prd_id` 缺失（文件名未包含 #NNNN）"));
  }

  if (derivedVersion && !hasOwn(meta, "prd_version")) {
    issues.push(issue(
      "prd-version",
      "error",
      hasOwn(meta, "version")
        ? "`prd_version` 缺失（当前使用 legacy `version` 字段）"
        : `\`prd_version\` 缺失或与目录版本不一致（期望: ${derivedVersion}）`,
    ));
  } else if (derivedVersion && canonical.prd_version !== derivedVersion) {
    issues.push(issue(
      "prd-version",
      "error",
      "`prd_version` 缺失或与目录版本不一致"
        + `（期望: ${derivedVersion}${canonical.prd_version ? `，当前: ${canonical.prd_version}` : ""}）`,
    ));
  }

  if (!Array.isArray(canonical.tags) || tags.length === 0) {
    issues.push(issue("tags-missing", "warning", "`tags` 缺失"));
  } else if (tags.length < 3 || tags.length > 10) {
    issues.push(issue(
      "tags-count",
      "warning",
      `tags 数量为 ${tags.length}（建议 3-10 个）`,
    ));
  }

  if (!hasOwn(meta, "create_at")) {
    issues.push(issue(
      "create-at",
      "error",
      hasOwn(meta, "created_at")
        ? "`create_at` 缺失（当前使用 legacy `created_at` 字段）"
        : "`create_at` 缺失或格式错误",
    ));
  } else if (!isValidDateString(asString(canonical.create_at))) {
    issues.push(issue("create-at", "error", "`create_at` 缺失或格式错误"));
  }

  if (!hasOwn(meta, "case_count")) {
    issues.push(issue(
      "case-count-missing",
      "error",
      `case_count 缺失（实际用例数：${actualCaseCount}）`,
    ));
  } else if (existingCaseCount !== actualCaseCount) {
    issues.push(issue(
      "case-count-mismatch",
      "error",
      `case_count 不准确（frontmatter: ${existingCaseCount ?? "空"}，实际用例数：${actualCaseCount}）`,
    ));
  }

  if (!hasOwn(meta, "origin")) {
    const suffix = canonical.origin ? `（可推断为 ${canonical.origin}）` : "";
    issues.push(issue("origin", "warning", `origin 缺失${suffix}`));
  }

  if (!hasOwn(meta, "status")) {
    issues.push(issue("status", "warning", "status 缺失（将补为空字符串）"));
  }

  if (!hasOwn(meta, "health_warnings")) {
    issues.push(issue("health-warnings", "warning", "health_warnings 缺失（将补 []）"));
  }

  return issues.concat(auditArchiveBody(body));
}

function auditRequirementFrontmatter(meta, canonical, filePath, hadFrontMatter) {
  const issues = [];

  if (!hadFrontMatter) {
    issues.push(issue("missing-frontmatter", "error", "缺少 frontmatter"));
  }

  if (!hasOwn(meta, "prd_name") && !hasOwn(meta, "suite_name")) {
    issues.push(issue(
      "prd-name",
      "error",
      hasOwn(meta, "name")
        ? "`prd_name` 或 `suite_name` 缺失（当前使用 legacy `name` 字段）"
        : "`prd_name` 或 `suite_name` 缺失",
    ));
  }

  if (!hasOwn(meta, "description") || !asString(canonical.description)) {
    issues.push(issue("description", "error", "`description` 缺失"));
  }

  if (!hasOwn(meta, "product")) {
    issues.push(issue(
      "product",
      "error",
      hasOwn(meta, "module")
        ? "`product` 缺失（当前使用 legacy `module` 字段）"
        : "`product` 缺失或无效",
    ));
  } else if (!canonical.product) {
    issues.push(issue("product", "error", "`product` 缺失或无效"));
  }

  if (!hasOwn(meta, "create_at")) {
    issues.push(issue(
      "create-at",
      "error",
      hasOwn(meta, "created_at")
        ? "`create_at` 缺失（当前使用 legacy `created_at` 字段）"
        : "`create_at` 缺失或格式错误",
    ));
  } else if (!isValidDateString(asString(canonical.create_at))) {
    issues.push(issue("create-at", "error", "`create_at` 缺失或格式错误"));
  }

  if (!hasOwn(meta, "status") || !VALID_REQUIREMENT_STATUSES.has(asString(canonical.status))) {
    issues.push(issue("status", "error", "status 非 raw / elicited / formalized / enhanced"));
  }

  return issues;
}

function issue(code, severity, message, count = 1) {
  return { code, severity, message, count };
}

function formatIssue(entry) {
  return `${entry.severity === "error" ? "❌" : "⚠️"} ${entry.message}`;
}

async function processFile(filePath) {
  const docType = getDocType(filePath);
  if (!docType) return null;

  const originalContent = readFileSync(filePath, "utf8");
  const { frontMatter, body } = parseFrontMatter(originalContent);
  const hadFrontMatter = frontMatter !== null;
  const rawMeta = frontMatter || {};
  const rawBody = hadFrontMatter ? body : originalContent;
  const bodyNormalization = docType === "archive"
    ? await normalizeArchiveBody(rawBody, {
      markdownPath: filePath,
      rootDir: ROOT,
      frontMatter: rawMeta,
    })
    : null;
  const canonicalAuditBody = docType === "archive"
    ? bodyNormalization.body
    : rawBody;
  const semanticEnrichment = docType === "archive" && FIX
    ? buildArchiveSemanticEnrichment(rawMeta, filePath, canonicalAuditBody)
    : null;
  const effectiveBody = docType === "archive" && FIX
    ? bodyNormalization.body
    : rawBody;

  const canonicalFields = docType === "archive"
    ? buildArchiveCanonicalFields(rawMeta, filePath, canonicalAuditBody, semanticEnrichment)
    : buildRequirementCanonicalFields({ ...rawMeta, __body: rawBody }, filePath);

  const mergedFields = mergeOrderedFields(
    docType === "archive" ? ARCHIVE_FIELD_ORDER : REQUIREMENT_FIELD_ORDER,
    canonicalFields,
    rawMeta,
    docType === "archive" ? LEGACY_ARCHIVE_KEYS : LEGACY_REQUIREMENT_KEYS,
  );

  const rebuiltContent = buildFrontMatter(mergedFields) + effectiveBody;
  const auditBody = docType === "archive" && FIX
    ? effectiveBody
    : rawBody;
  const issues = docType === "archive"
    ? auditArchiveFrontmatter(rawMeta, canonicalFields, filePath, auditBody, hadFrontMatter)
    : auditRequirementFrontmatter(rawMeta, canonicalFields, filePath, hadFrontMatter);

  const fixCounts = collectFixCounts(
    docType,
    rawMeta,
    canonicalFields,
    mergedFields,
    filePath,
    effectiveBody,
    bodyNormalization,
  );
  const changed = rebuiltContent !== originalContent;

  if (FIX && changed) {
    writeFileSync(filePath, rebuiltContent, "utf8");
  }

  return {
    relPath: relativePath(filePath),
    docType,
    product: canonicalFields.product || extractModuleKey(filePath) || "",
    issues,
    changed,
    fixCounts,
  };
}

function collectFixCounts(
  docType,
  rawMeta,
  canonicalFields,
  mergedFields,
  filePath,
  body,
  bodyNormalization = null,
) {
  const counts = {};
  const mtimeDate = normalizeDateString(getMtimeDate(filePath));

  function add(key, value = 1) {
    counts[key] = (counts[key] || 0) + value;
  }

  if (docType === "archive") {
    if (hasOwn(rawMeta, "name")) add("legacy_name_to_suite_name");
    if (hasOwn(rawMeta, "module")) add("legacy_module_to_product");
    if (hasOwn(rawMeta, "version")) add("legacy_version_to_prd_version");
    if (hasOwn(rawMeta, "source")) add("legacy_source_to_prd_path_origin");
    if (hasOwn(rawMeta, "created_at")) add("legacy_created_at_to_create_at");

    const actualCaseCount = countArchiveCases(body);
    if (!hasOwn(rawMeta, "case_count") || toNumber(rawMeta.case_count) !== actualCaseCount) {
      add("case_count");
    }
    if (!hasOwn(rawMeta, "product") && mergedFields.product) add("product");
    if (!hasOwn(rawMeta, "prd_version") && mergedFields.prd_version) add("prd_version");
    if (!hasOwn(rawMeta, "prd_id") && mergedFields.prd_id !== undefined) add("prd_id");
    if (!hasOwn(rawMeta, "origin") && mergedFields.origin) add("origin");
    if (!hasOwn(rawMeta, "status")) add("status");
    if (!hasOwn(rawMeta, "health_warnings")) add("health_warnings");
    if (!hasOwn(rawMeta, "create_at") && mergedFields.create_at === mtimeDate) add("create_at_from_mtime");
    if (bodyNormalization?.stats?.removedTopLevelH1) add("body_h1", bodyNormalization.stats.removedTopLevelH1);
    if (bodyNormalization?.stats?.addedPriorityPrefix) add("body_title_priority", bodyNormalization.stats.addedPriorityPrefix);
    if (bodyNormalization?.stats?.insertedStepMarker) add("body_step_marker", bodyNormalization.stats.insertedStepMarker);
    if (bodyNormalization?.stats?.insertedPreconditionMarker) add("body_precondition_marker", bodyNormalization.stats.insertedPreconditionMarker);
    if (bodyNormalization?.stats?.normalizedFirstStep) add("body_first_step", bodyNormalization.stats.normalizedFirstStep);
    if (bodyNormalization?.stats?.rebuiltFromXmind) add("body_rebuilt_from_xmind", bodyNormalization.stats.rebuiltFromXmind);
    if (bodyNormalization?.stats?.rebuiltFromBulletTree) add("body_rebuilt_from_bullet_tree", bodyNormalization.stats.rebuiltFromBulletTree);
  } else {
    if (hasOwn(rawMeta, "name") || hasOwn(rawMeta, "suite_name")) add("legacy_name_to_prd_name");
    if (hasOwn(rawMeta, "module")) add("legacy_module_to_product");
    if (hasOwn(rawMeta, "version")) add("legacy_version_to_prd_version");
    if (hasOwn(rawMeta, "source")) add("legacy_source_to_prd_source");
    if (hasOwn(rawMeta, "created_at")) add("legacy_created_at_to_create_at");
    if (!hasOwn(rawMeta, "status") || !VALID_REQUIREMENT_STATUSES.has(asString(rawMeta.status))) {
      add("status");
    }
  }

  return counts;
}

function buildReport(results) {
  const groups = new Map();
  for (const result of results) {
    if (result.issues.length === 0) continue;
    const key = getGroupKey(result.relPath, result.docType, result.product);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(result);
  }

  const lines = [];
  for (const [groupKey, items] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [docType, product] = groupKey.split(":");
    lines.push(`## ${docType} / ${product}`);
    lines.push("");
    for (const item of items.sort((a, b) => a.relPath.localeCompare(b.relPath))) {
      lines.push(item.relPath);
      for (const problem of item.issues) {
        lines.push(`- ${formatIssue(problem)}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n").trim();
}

function buildSummary(results) {
  const summary = {
    totalFiles: results.length,
    withFrontMatter: 0,
    missingFrontMatter: 0,
    missingCaseCount: 0,
    incorrectCaseCount: 0,
    missingProduct: 0,
    h1ProblemFiles: new Set(),
    titlePriorityCount: 0,
    titlePriorityFiles: new Set(),
    requirementNameMissing: 0,
    requirementStatusInvalid: 0,
  };

  for (const result of results) {
    const missingFrontMatter = result.issues.some((entry) => entry.code === "missing-frontmatter");
    if (missingFrontMatter) {
      summary.missingFrontMatter++;
    } else {
      summary.withFrontMatter++;
    }

    if (result.issues.some((entry) => entry.code === "case-count-missing")) {
      summary.missingCaseCount++;
    }
    if (result.issues.some((entry) => entry.code === "case-count-mismatch")) {
      summary.incorrectCaseCount++;
    }
    if (result.issues.some((entry) => entry.code === "product")) {
      summary.missingProduct++;
    }
    if (result.issues.some((entry) => entry.code === "body-h1")) {
      summary.h1ProblemFiles.add(result.relPath);
    }

    const priorityIssue = result.issues.find((entry) => entry.code === "title-priority");
    if (priorityIssue) {
      summary.titlePriorityCount += priorityIssue.count || 1;
      summary.titlePriorityFiles.add(result.relPath);
    }

    if (result.issues.some((entry) => entry.code === "prd-name")) {
      summary.requirementNameMissing++;
    }
    if (result.issues.some((entry) => entry.code === "status") && result.docType === "requirements") {
      summary.requirementStatusInvalid++;
    }
  }

  return [
    "=== 汇总统计 ===",
    `总文件数: ${summary.totalFiles}`,
    `有 frontmatter: ${summary.withFrontMatter}`,
    `缺少 frontmatter: ${summary.missingFrontMatter}`,
    `缺少 case_count: ${summary.missingCaseCount}`,
    `case_count 不准确: ${summary.incorrectCaseCount}`,
    `缺少 product: ${summary.missingProduct}`,
    `有 H1 标题问题: ${summary.h1ProblemFiles.size}`,
    `用例标题无优先级前缀: ${summary.titlePriorityCount}（影响文件 ${summary.titlePriorityFiles.size} 个）`,
    `需求文档缺少 prd_name/suite_name: ${summary.requirementNameMissing}`,
    `需求文档 status 非法: ${summary.requirementStatusInvalid}`,
  ].join("\n");
}

function buildFixSummary(results) {
  const changedFiles = results.filter((item) => item.changed);
  const counts = {};
  for (const result of changedFiles) {
    for (const [key, value] of Object.entries(result.fixCounts)) {
      counts[key] = (counts[key] || 0) + value;
    }
  }

  const lines = [
    "=== 修复摘要 ===",
    `修复文件数: ${changedFiles.length}`,
  ];

  for (const [key, value] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`- ${key}: ${value}`);
  }

  if (changedFiles.length === 0) {
    lines.push("- 无需写回");
  }

  return lines.join("\n");
}

async function main() {
  const files = getTargetFiles();
  const results = (await Promise.all(files.map(processFile))).filter(Boolean);

  const report = buildReport(results);
  if (report) {
    console.log(report);
    console.log("");
  }

  console.log(buildSummary(results));

  if (FIX) {
    console.log("");
    console.log(buildFixSummary(results));
  } else if (DRY_RUN) {
    console.log("");
    console.log("模式: dry-run（仅审计，不写入）");
  } else {
    console.log("");
    console.log("模式: audit-only（如需自动修复，请追加 --fix）");
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
