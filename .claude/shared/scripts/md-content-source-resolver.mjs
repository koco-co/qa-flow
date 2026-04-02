/**
 * md-content-source-resolver.mjs
 * 为 archive / requirements Markdown 解析上游内容来源候选。
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "fs";
import {
  basename,
  extname,
  join,
  relative,
  resolve,
} from "path";
import { loadConfig, getWorkspaceRoot, resolveModulePath } from "./load-config.mjs";
import {
  asTrimmedString,
  extractModuleKey,
  extractPrdId,
  extractVersionFromPath,
  getDocTypeFromPath,
  parseFrontMatter,
  toStringArray,
} from "./front-matter-utils.mjs";

export const CONTENT_SOURCE_RESOLUTION_STATUS = Object.freeze({
  ORIGINAL_XMIND_RESOLVED: "original-xmind-resolved",
  ORIGINAL_XMIND_MISSING: "original-xmind-missing",
  MARKDOWN_ONLY: "markdown-only",
});

// Load casesRoot once at module level for path pattern matching
const _casesRoot = (() => {
  try { return loadConfig().casesRoot ?? 'cases/'; } catch { return 'cases/'; }
})();

export function resolveMdContentSource(markdownPath, options = {}) {
  const rootDir = resolve(options.rootDir || getWorkspaceRoot());
  const config = options.config || loadConfig();
  const absMarkdownPath = toAbsolutePath(markdownPath, rootDir);
  const markdownRelPath = normalizeRelativePath(relative(rootDir, absMarkdownPath));
  const markdownContent = readFileSync(absMarkdownPath, "utf8");
  const { frontMatter, docType: frontMatterDocType } = parseFrontMatter(markdownContent);
  const meta = frontMatter || {};

  const docType = getDocTypeFromPath(markdownRelPath) || frontMatterDocType || null;
  const product = asTrimmedString(meta.product) || asTrimmedString(meta.module) || extractModuleKey(markdownRelPath) || null;
  const version = asTrimmedString(meta.prd_version) || asTrimmedString(meta.version) || extractVersionFromPath(markdownRelPath) || null;
  const prdId = toFiniteNumber(meta.prd_id)
    ?? extractPrdId(asTrimmedString(meta.suite_name) || asTrimmedString(meta.prd_name) || asTrimmedString(meta.name))
    ?? extractPrdId(basename(markdownRelPath));
  const modulePaths = resolveModulePaths(product, config);
  const explicitLegacySource = asTrimmedString(meta.source);
  const explicitPrdPath = asTrimmedString(meta.prd_path);
  const explicitPrdSource = asTrimmedString(meta.prd_source);
  const declaredOrigin = asTrimmedString(meta.origin).toLowerCase();
  const sourceOrigin = inferSourceOrigin({
    docType,
    declaredOrigin,
    legacySource: explicitLegacySource,
    prdPath: explicitPrdPath,
    prdSource: explicitPrdSource,
  });
  const nameHints = buildNameHints({ markdownRelPath, meta });

  const candidatePrdPaths = filterWorkspaceRelativePaths(rootDir, buildPrdCandidates({
    docType,
    markdownRelPath,
    explicitPrdPath,
    explicitPrdSource,
    legacySource: explicitLegacySource,
    requirementsDir: modulePaths.requirementsDir,
    version,
    nameHints,
    prdId,
    rootDir,
  }));
  const candidateXmindPaths = filterWorkspaceRelativePaths(rootDir, buildXmindCandidates({
    explicitPrdSource,
    legacySource: explicitLegacySource,
    xmindDir: modulePaths.xmindDir,
    version,
    nameHints,
    prdId,
    rootDir,
  }));
  const candidateHistoryPaths = filterWorkspaceRelativePaths(rootDir, buildHistoryCandidates({
    explicitPrdSource,
    legacySource: explicitLegacySource,
    historyDir: modulePaths.historyDir,
    version,
    nameHints,
    prdId,
    rootDir,
  }));
  const candidateRepoPaths = filterWorkspaceRelativePaths(rootDir, buildRepoCandidates({
    explicitRepos: toStringArray(meta.repos),
    product,
    config,
  }));

  const existingCandidatePrdPaths = candidatePrdPaths.filter((path) => pathExists(rootDir, path));
  const existingCandidateXmindPaths = candidateXmindPaths.filter((path) => pathExists(rootDir, path));
  const existingCandidateHistoryPaths = candidateHistoryPaths.filter((path) => pathExists(rootDir, path));
  const existingCandidateRepoPaths = candidateRepoPaths.filter((path) => pathExists(rootDir, path));

  const originalXmindFound = existingCandidateXmindPaths.length > 0;
  const sourceResolutionStatus = determineSourceResolutionStatus({
    markdownPath: markdownRelPath,
    sourceOrigin,
    originalXmindFound,
    existingCandidatePrdPaths,
    existingCandidateHistoryPaths,
  });

  return {
    markdownPath: markdownRelPath,
    docType,
    product,
    module: product,
    version,
    prdId,
    sourceOrigin,
    candidateXmindPaths,
    existingCandidateXmindPaths,
    candidatePrdPaths,
    existingCandidatePrdPaths,
    candidateHistoryPaths,
    existingCandidateHistoryPaths,
    candidateRepoPaths,
    existingCandidateRepoPaths,
    originalXmindPath: existingCandidateXmindPaths[0] || null,
    originalXmindFound,
    sourceResolutionStatus,
  };
}

function determineSourceResolutionStatus({
  markdownPath,
  sourceOrigin,
  originalXmindFound,
  existingCandidatePrdPaths,
  existingCandidateHistoryPaths,
}) {
  if (sourceOrigin === "xmind") {
    return originalXmindFound
      ? CONTENT_SOURCE_RESOLUTION_STATUS.ORIGINAL_XMIND_RESOLVED
      : CONTENT_SOURCE_RESOLUTION_STATUS.ORIGINAL_XMIND_MISSING;
  }

  const hasAlternativeSource =
    existingCandidateHistoryPaths.length > 0
    || existingCandidatePrdPaths.some((candidatePath) => candidatePath !== markdownPath);

  if (hasAlternativeSource) {
    return CONTENT_SOURCE_RESOLUTION_STATUS.ORIGINAL_XMIND_MISSING;
  }

  return CONTENT_SOURCE_RESOLUTION_STATUS.MARKDOWN_ONLY;
}

function buildPrdCandidates({
  docType,
  markdownRelPath,
  explicitPrdPath,
  explicitPrdSource,
  legacySource,
  requirementsDir,
  version,
  nameHints,
  prdId,
  rootDir,
}) {
  const candidates = createCandidateCollector();
  const explicitMarkdownCandidates = [explicitPrdPath, explicitPrdSource, legacySource]
    .filter((value) => isMarkdownPath(value))
    .map((value) => normalizeRelativePath(value));

  if (docType === "requirements") {
    // Both cases/requirements/ and cases/prds/ are "requirements" doc type
    candidates.add(markdownRelPath);
    explicitMarkdownCandidates.forEach((value) => candidates.add(value));
    return candidates.values();
  }

  explicitMarkdownCandidates.forEach((value) => candidates.add(value));
  if (explicitMarkdownCandidates.length > 0) {
    return candidates.values();
  }

  for (const guessed of buildGuessedFileCandidates(requirementsDir, version, nameHints.primary, ".md")) {
    candidates.add(guessed);
  }

  for (const matched of findExistingMatches(requirementsDir, ".md", {
    nameVariants: nameHints.search,
    prdId,
    rootDir,
  })) {
    candidates.add(matched);
  }

  return candidates.values();
}

function buildXmindCandidates({
  explicitPrdSource,
  legacySource,
  xmindDir,
  version,
  nameHints,
  prdId,
  rootDir,
}) {
  const candidates = createCandidateCollector();
  const explicitXmindCandidates = [explicitPrdSource, legacySource]
    .filter((value) => isXmindPath(value))
    .map((value) => normalizeRelativePath(value));

  explicitXmindCandidates.forEach((value) => candidates.add(value));
  if (explicitXmindCandidates.length > 0) {
    return candidates.values();
  }

  for (const guessed of buildGuessedFileCandidates(xmindDir, version, nameHints.primary, ".xmind")) {
    candidates.add(guessed);
  }

  for (const matched of findExistingMatches(xmindDir, ".xmind", {
    nameVariants: nameHints.search,
    prdId,
    rootDir,
  })) {
    candidates.add(matched);
  }

  return candidates.values();
}

function buildHistoryCandidates({
  explicitPrdSource,
  legacySource,
  historyDir,
  version,
  nameHints,
  prdId,
  rootDir,
}) {
  const candidates = createCandidateCollector();
  const explicitHistoryCandidates = [explicitPrdSource, legacySource]
    .filter((value) => isHistoryPath(value))
    .map((value) => normalizeRelativePath(value));

  explicitHistoryCandidates.forEach((value) => candidates.add(value));
  if (explicitHistoryCandidates.length > 0) {
    return candidates.values();
  }

  for (const guessed of buildGuessedFileCandidates(historyDir, version, nameHints.primary, ".csv")) {
    candidates.add(guessed);
  }

  for (const matched of findExistingMatches(historyDir, ".csv", {
    nameVariants: nameHints.search,
    prdId,
    rootDir,
  })) {
    candidates.add(matched);
  }

  return candidates.values();
}

function buildRepoCandidates({ explicitRepos, product, config }) {
  const candidates = createCandidateCollector();

  explicitRepos
    .map((value) => normalizeDirectoryPath(value))
    .filter(Boolean)
    .forEach((value) => candidates.add(value));

  const moduleConfig = product ? config?.modules?.[product] : null;
  const repoHints = moduleConfig?.repoHints || [];
  for (const repoKey of repoHints) {
    const repoPath = normalizeDirectoryPath(config?.repos?.[repoKey]);
    if (repoPath) candidates.add(repoPath);
  }

  return candidates.values();
}

function resolveModulePaths(product, config) {
  if (!product) {
    return {
      xmindDir: "",
      requirementsDir: "",
      historyDir: "",
    };
  }
  const mod = config?.modules?.[product];
  if (!mod) {
    // Unknown product: fall back to convention using casesRoot
    const casesRoot = config?.casesRoot ?? 'cases/';
    return {
      xmindDir: normalizeDirectoryPath(`${casesRoot}xmind/${product}/`),
      requirementsDir: normalizeDirectoryPath(`${casesRoot}requirements/${product}/`),
      historyDir: normalizeDirectoryPath(`${casesRoot}history/${product}/`),
    };
  }
  // Use resolveModulePath for known modules
  try {
    return {
      xmindDir: normalizeDirectoryPath(resolveModulePath(product, 'xmind', config)),
      requirementsDir: normalizeDirectoryPath(resolveModulePath(product, 'requirements', config)),
      historyDir: normalizeDirectoryPath(resolveModulePath(product, 'history', config)),
    };
  } catch {
    const casesRoot = config?.casesRoot ?? 'cases/';
    return {
      xmindDir: normalizeDirectoryPath(`${casesRoot}xmind/${product}/`),
      requirementsDir: normalizeDirectoryPath(`${casesRoot}requirements/${product}/`),
      historyDir: normalizeDirectoryPath(`${casesRoot}history/${product}/`),
    };
  }
}

function inferSourceOrigin({
  docType,
  declaredOrigin,
  legacySource,
  prdPath,
  prdSource,
}) {
  if (declaredOrigin) return declaredOrigin;

  const combined = [legacySource, prdPath, prdSource].filter(Boolean).join(" ");
  const escapedRoot = _casesRoot.replace(/[/]/g, '\\/');
  const xmindPattern = new RegExp(`${escapedRoot}xmind\\/|\\.xmind\\b`, 'i');
  const historyPattern = new RegExp(`${escapedRoot}history\\/|\\.csv\\b`, 'i');
  const requirementsPattern = new RegExp(`${escapedRoot}requirements\\/|\\.md\\b`, 'i');
  if (xmindPattern.test(combined)) return "xmind";
  if (historyPattern.test(combined)) return "csv";
  if (/\.json\b/i.test(combined)) return "json";
  if (requirementsPattern.test(combined)) return "markdown";
  if (docType === "requirements") return "markdown";
  return "";
}

function buildNameHints({ markdownRelPath, meta }) {
  const primary = createCandidateCollector();
  primary.add(stripSourceDecorators(basename(markdownRelPath, extname(markdownRelPath))));

  const rawNames = [
    basename(markdownRelPath, extname(markdownRelPath)),
    asTrimmedString(meta.suite_name),
    asTrimmedString(meta.prd_name),
    asTrimmedString(meta.name),
  ];

  const search = createCandidateCollector();
  for (const rawName of rawNames) {
    if (!rawName) continue;
    const base = stripSourceDecorators(rawName);
    search.add(base);

    const withoutPrdPrefix = base.replace(/^PRD-\d+\s*[-—]?\s*/i, "").trim();
    if (withoutPrdPrefix) search.add(withoutPrdPrefix);
  }

  return {
    primary: primary.values(),
    search: search.values(),
  };
}

function stripSourceDecorators(value) {
  return asTrimmedString(value)
    .replace(/\.(md|xmind|csv|json)$/i, "")
    .replace(/\s*(?:（|\()(?:xmind|XMind)(?:）|\))\s*$/i, "")
    .replace(/-(enhanced|formalized|raw)$/i, "")
    .trim();
}

function buildGuessedFileCandidates(baseDir, version, nameVariants, extension) {
  if (!baseDir) return [];
  const candidates = createCandidateCollector();
  const resolvedBaseDir = version ? join(baseDir, version) : baseDir;

  for (const name of nameVariants) {
    candidates.add(joinNormalized(resolvedBaseDir, `${stripSourceDecorators(name)}${extension}`));
  }

  return candidates.values();
}

function findExistingMatches(baseDir, extension, { nameVariants, prdId, rootDir }) {
  if (!baseDir) return [];
  if (!isPathWithinRoot(rootDir, baseDir)) return [];
  const absoluteDir = resolve(rootDir, baseDir);
  if (!existsSync(absoluteDir)) return [];

  const normalizedNeedles = nameVariants
    .map((value) => normalizeNameForComparison(value))
    .filter(Boolean);
  const matches = [];

  for (const filePath of walkFiles(absoluteDir)) {
    if (extname(filePath).toLowerCase() !== extension) continue;

    const relPath = normalizeRelativePath(relative(rootDir, filePath));
    const score = scoreSourceCandidate(relPath, {
      normalizedNeedles,
      prdId,
    });
    if (score <= 0) continue;

    matches.push({ relPath, score });
  }

  return matches
    .sort((left, right) => right.score - left.score || left.relPath.localeCompare(right.relPath))
    .map((entry) => entry.relPath);
}

function scoreSourceCandidate(relPath, { normalizedNeedles, prdId }) {
  const fileBase = normalizeNameForComparison(basename(relPath, extname(relPath)));
  let score = 0;

  if (normalizedNeedles.some((needle) => needle === fileBase)) {
    score += 1000;
  } else if (normalizedNeedles.some((needle) => needle && (fileBase.includes(needle) || needle.includes(fileBase)))) {
    score += 250;
  }

  if (typeof prdId === "number" && Number.isFinite(prdId) && new RegExp(`(?:^|[^\\d])${prdId}(?:[^\\d]|$)`).test(relPath)) {
    score += 500;
  }

  return score;
}

function walkFiles(dirPath) {
  const results = [];
  let entries = [];

  try {
    entries = readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

function createCandidateCollector() {
  const values = [];
  const seen = new Set();

  return {
    add(value) {
      const normalized = normalizeRelativePath(value);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      values.push(normalized);
    },
    values() {
      return values;
    },
  };
}

function toAbsolutePath(pathLike, rootDir) {
  return normalizeFsPath(pathLike).startsWith("/")
    ? resolve(pathLike)
    : resolve(rootDir, pathLike);
}

function normalizeRelativePath(pathLike) {
  if (!pathLike) return "";
  const normalized = normalizeFsPath(pathLike).replace(/^\.\//, "");
  return normalized === "." ? "" : normalized;
}

function normalizeDirectoryPath(pathLike) {
  const normalized = normalizeRelativePath(pathLike);
  if (!normalized) return "";
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function normalizeFsPath(pathLike) {
  return String(pathLike || "").replace(/\\/g, "/");
}

function normalizeNameForComparison(value) {
  return stripSourceDecorators(value)
    .replace(/^PRD-\d+\s*[-—]?\s*/i, "")
    .replace(/\(#\d+\)|（#\d+）/g, "")
    .replace(/[【】()[\]（）]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

function pathExists(rootDir, relativePath) {
  if (!isPathWithinRoot(rootDir, relativePath)) return false;
  return existsSync(resolve(rootDir, relativePath));
}

function filterWorkspaceRelativePaths(rootDir, candidatePaths) {
  return candidatePaths.filter((candidatePath) => isPathWithinRoot(rootDir, candidatePath));
}

function isPathWithinRoot(rootDir, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) return false;

  const relativeToRoot = normalizeFsPath(relative(rootDir, resolve(rootDir, normalized)));
  return relativeToRoot !== ".." && !relativeToRoot.startsWith("../");
}

function isMarkdownPath(value) {
  return /\.md\b/i.test(asTrimmedString(value));
}

function isXmindPath(value) {
  const str = asTrimmedString(value);
  return /\.xmind\b/i.test(str) || str.includes(`${_casesRoot}xmind/`);
}

function isHistoryPath(value) {
  const str = asTrimmedString(value);
  return /\.csv\b/i.test(str) || str.includes(`${_casesRoot}history/`);
}

function joinNormalized(...parts) {
  return normalizeRelativePath(join(...parts.filter(Boolean)));
}

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
