import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";
import { basename, dirname, relative, resolve } from "path";
import { fileURLToPath } from "url";
import { getWorkspaceRoot, loadConfig } from "./load-config.mjs";
import {
  buildCanonicalFrontMatter,
  coerceStringArray,
  extractModuleKey,
  extractVersionFromPath,
  hasLegacyFrontMatterKeys,
  inferTags,
  normalizeDate,
  normalizeDocumentTitle,
  parseFrontMatter,
  pickFirstNonEmpty,
} from "./front-matter-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(__dirname, "../../..");
const REQUIREMENTS_SKIP_NAMES = new Set(["HANDOFF.md", "README.md"]);
const REQUIREMENT_STATUSES = new Set(["raw", "formalized", "enhanced"]);

export function runMarkdownFrontmatterAudit(options = {}) {
  const root = resolve(options.root || DEFAULT_ROOT);
  const includeArchive = options.includeArchive ?? (!options.includeRequirements);
  const includeRequirements = options.includeRequirements ?? (!options.includeArchive);
  const fix = Boolean(options.fix);
  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);
  const targetPaths = normalizeTargetPaths(options.paths || options.path || [], root);
  const context = buildAuditContext(root);
  const filePlans = [];

  if (includeArchive) {
    const archiveFiles = resolveDocTargets({
      root,
      docType: "archive",
      targetPaths,
      defaultDir: resolve(root, "cases/archive"),
    });

    for (const filePath of archiveFiles) {
      filePlans.push(
        analyzeArchiveFile(filePath, context, {
          root,
          fix,
          dryRun,
          force,
        }),
      );
    }
  }

  if (includeRequirements) {
    const requirementFiles = resolveDocTargets({
      root,
      docType: "requirements",
      targetPaths,
      defaultDir: resolve(root, "cases/requirements"),
      skipNames: REQUIREMENTS_SKIP_NAMES,
    });

    for (const filePath of requirementFiles) {
      filePlans.push(
        analyzeRequirementFile(filePath, context, {
          root,
          fix,
          dryRun,
          force,
        }),
      );
    }
  }

  const summary = summarizePlans(filePlans, { fix, dryRun });
  const report = formatAuditReport(filePlans, summary, { root, fix, dryRun });
  const exitCode = fix
    ? (summary.remainingErrors > 0 ? 1 : 0)
    : (summary.errorCount > 0 || summary.warningCount > 0 ? 1 : 0);

  return {
    root,
    files: filePlans,
    summary,
    report,
    exitCode,
  };
}

function buildAuditContext(root) {
  const config = loadConfig();
  const requirementFiles = collectMarkdownFiles(resolve(root, "cases/requirements"), {
    skipNames: REQUIREMENTS_SKIP_NAMES,
  });

  return {
    config,
    modules: config.modules || {},
    requirementEntries: requirementFiles.map((filePath) => buildRequirementEntry(filePath, root)),
  };
}

function analyzeArchiveFile(filePath, context, options) {
  const relPath = toRelativePath(options.root, filePath);
  const stat = statSync(filePath);
  const content = readFileSync(filePath, "utf8");
  const { frontMatter, body } = parseFrontMatter(content);
  const legacySignals = extractArchiveSignals(body, filePath);
  const observed = frontMatter || {};
  const productFromPath = extractModuleKey(relPath) || extractModuleKey(filePath) || "";
  const product = String(
    pickFirstNonEmpty(observed.product, observed.module, productFromPath),
  ).trim();
  const versionFromPath = pickFirstNonEmpty(
    extractVersionFromPath(filePath),
    extractVersionFromPath(legacySignals.source),
    observed.prd_version,
    observed.version,
  );
  const currentTitle = pickFirstNonEmpty(
    observed.suite_name,
    observed.name,
    legacySignals.heading,
    basename(filePath, ".md"),
  );
  const inferredPrdId = pickFirstNonEmpty(
    normalizePrdId(observed.prd_id),
    extractPrdIdFromText(basename(filePath, ".md")),
    extractPrdIdFromText(currentTitle),
    extractPrdIdFromText(legacySignals.heading),
  );
  const requirementMatch = findRequirementMatch(context.requirementEntries, {
    product,
    version: String(versionFromPath || "").trim(),
    prdId: normalizePrdId(inferredPrdId),
    title: normalizeDocumentTitle(String(currentTitle || "")),
  });
  const suiteName = requirementMatch?.title
    || normalizeDocumentTitle(String(currentTitle || ""));
  const description = String(
    pickFirstNonEmpty(observed.description, suiteName),
  ).trim();
  const prdPath = normalizeRelativeDocumentPath(
    pickFirstNonEmpty(
      observed.prd_path,
      inferRequirementsPathFromSource(legacySignals.source),
      requirementMatch?.relPath,
      "",
    ),
  );
  const canInferPrdPath = Boolean(
    inferRequirementsPathFromSource(legacySignals.source) || requirementMatch?.relPath,
  );
  const tags = (() => {
    const existing = coerceStringArray(observed.tags);
    if (existing.length > 0) return existing;
    return inferTags({
      title: suiteName,
      headings: legacySignals.headings,
      modulePath: relPath,
      meta: {
        product,
        requirement_name: suiteName,
      },
    });
  })();
  const createAt = normalizeDate(
    pickFirstNonEmpty(observed.create_at, observed.created_at, stat.mtime),
  );
  const plannedPrdId = normalizePrdId(inferredPrdId);
  const plannedFields = {
    suite_name: suiteName,
    description,
    prd_id: plannedPrdId === "" ? "" : plannedPrdId,
    prd_version: String(versionFromPath || "").trim(),
    prd_path: prdPath || "",
    prd_url: String(observed.prd_url || "").trim(),
    product,
    dev_version: String(pickFirstNonEmpty(observed.dev_version, legacySignals.devVersion, "")).trim(),
    tags,
    create_at: createAt,
    update_at: normalizeDate(observed.update_at),
    status: String(observed.status || "").trim(),
    health_warnings: coerceStringArray(observed.health_warnings),
    repos: coerceStringArray(observed.repos),
    case_count: legacySignals.caseCount,
  };

  const origin = String(observed.origin || inferArchiveOrigin(observed, legacySignals, relPath)).trim();
  if (origin) {
    plannedFields.origin = origin;
  }

  const errors = [];
  const warnings = [];
  const legacyKeys = collectLegacyKeys(observed);

  if (!frontMatter) {
    errors.push("missing frontmatter");
  }
  if (legacyKeys.length > 0) {
    errors.push(`legacy frontmatter keys: ${legacyKeys.join(", ")}`);
  }
  if (!String(observed.suite_name || "").trim()) {
    errors.push("missing suite_name");
  }

  const currentDescription = String(observed.description || "").trim();
  if (!currentDescription) {
    errors.push("missing description");
  } else if (currentDescription.length > 60) {
    warnings.push(`description exceeds 60 chars (${currentDescription.length})`);
  }

  if (!String(observed.product || "").trim()) {
    errors.push(`missing product${productFromPath ? ` (expected ${productFromPath})` : ""}`);
  } else if (productFromPath && String(observed.product).trim() !== productFromPath) {
    errors.push(`product mismatch (current ${String(observed.product).trim()}, expected ${productFromPath})`);
  }

  const currentPrdPath = String(observed.prd_path || "").trim();
  if (!currentPrdPath && canInferPrdPath) {
    errors.push("missing prd_path");
  }

  if (isDtstackProduct(product, context.modules)) {
    if (normalizePrdId(observed.prd_id) === "") {
      errors.push("missing prd_id");
    }
  }

  const currentPrdVersion = String(pickFirstNonEmpty(observed.prd_version, observed.version, "")).trim();
  if (versionFromPath) {
    if (!currentPrdVersion) {
      errors.push(`missing prd_version (expected ${versionFromPath})`);
    } else if (currentPrdVersion !== String(versionFromPath)) {
      errors.push(`prd_version mismatch (current ${currentPrdVersion}, expected ${versionFromPath})`);
    }
  }

  const currentTags = coerceStringArray(observed.tags);
  if (currentTags.length === 0) {
    errors.push("missing tags");
  } else if (currentTags.length < 3 || currentTags.length > 10) {
    warnings.push(`tags count outside 3-10 range (${currentTags.length})`);
  }

  if (!normalizeDate(pickFirstNonEmpty(observed.create_at, observed.created_at, ""))) {
    errors.push("missing create_at");
  }

  if (!Object.prototype.hasOwnProperty.call(observed, "case_count")) {
    errors.push(`missing case_count (expected ${legacySignals.caseCount})`);
  } else if (Number(observed.case_count) !== legacySignals.caseCount) {
    errors.push(`case_count mismatch (current ${observed.case_count}, expected ${legacySignals.caseCount})`);
  }

  warnings.push(...inspectArchiveBody(body));

  const needsRewrite = options.fix && (options.force || !frontMatter || legacyKeys.length > 0 || hasCanonicalDiff(observed, plannedFields));
  const writeResult = needsRewrite
    ? maybeWriteCanonicalFrontMatter(filePath, body, plannedFields, "archive", options)
    : { changed: false, verified: true, verificationErrors: [] };

  const remainingErrors = buildArchiveRemainingErrors(plannedFields, context, productFromPath);
  return {
    docType: "archive",
    path: filePath,
    relPath,
    bucket: buildBucket(relPath, "archive"),
    errors,
    warnings,
    plannedFrontMatter: buildCanonicalFrontMatter(plannedFields, "archive"),
    changed: writeResult.changed,
    verificationErrors: writeResult.verificationErrors,
    remainingErrors,
  };
}

function analyzeRequirementFile(filePath, context, options) {
  const relPath = toRelativePath(options.root, filePath);
  const stat = statSync(filePath);
  const content = readFileSync(filePath, "utf8");
  const { frontMatter, body } = parseFrontMatter(content);
  const legacySignals = extractRequirementSignals(body, filePath);
  const observed = frontMatter || {};
  const productFromPath = extractModuleKey(relPath) || extractModuleKey(filePath) || "";
  const product = String(
    pickFirstNonEmpty(observed.product, observed.module, productFromPath),
  ).trim();
  const prdName = normalizeDocumentTitle(String(
    pickFirstNonEmpty(
      observed.prd_name,
      observed.suite_name,
      observed.name,
      legacySignals.heading,
      basename(filePath, ".md"),
    ),
  ));
  const description = String(
    pickFirstNonEmpty(observed.description, legacySignals.description, prdName),
  ).trim();
  const plannedPrdId = normalizePrdId(
    pickFirstNonEmpty(
      observed.prd_id,
      extractPrdIdFromText(basename(filePath, ".md")),
      extractPrdIdFromText(legacySignals.heading),
      extractPrdIdFromText(observed.name),
    ),
  );
  const plannedFields = {
    prd_name: prdName,
    description,
    prd_id: plannedPrdId === "" ? "" : plannedPrdId,
    prd_version: String(
      pickFirstNonEmpty(
        observed.prd_version,
        observed.version,
        extractVersionFromPath(filePath),
        extractVersionFromPath(legacySignals.source),
        "",
      ),
    ).trim(),
    prd_source: String(pickFirstNonEmpty(observed.prd_source, observed.source, legacySignals.source, "")).trim(),
    prd_url: String(observed.prd_url || "").trim(),
    product,
    dev_version: String(pickFirstNonEmpty(observed.dev_version, legacySignals.devVersion, "")).trim(),
    tags: coerceStringArray(observed.tags),
    create_at: normalizeDate(pickFirstNonEmpty(observed.create_at, observed.created_at, legacySignals.importedAt, stat.mtime)),
    update_at: normalizeDate(pickFirstNonEmpty(observed.update_at, legacySignals.enhancedAt, "")),
    status: normalizeRequirementStatus(pickFirstNonEmpty(observed.status, inferRequirementStatus(filePath), "raw")),
    health_warnings: inferRequirementHealthWarnings(observed.health_warnings, body),
    repos: coerceStringArray(observed.repos),
    case_path: String(observed.case_path || "").trim(),
  };

  const errors = [];
  const warnings = [];
  const legacyKeys = collectLegacyKeys(observed);

  if (!frontMatter) {
    errors.push("missing frontmatter");
  }
  if (legacyKeys.length > 0) {
    errors.push(`legacy frontmatter keys: ${legacyKeys.join(", ")}`);
  }
  if (!String(pickFirstNonEmpty(observed.prd_name, observed.suite_name, "")).trim()) {
    errors.push("missing prd_name or suite_name");
  }
  if (!String(observed.description || "").trim()) {
    errors.push("missing description");
  }
  if (!String(observed.product || "").trim()) {
    errors.push(`missing product${productFromPath ? ` (expected ${productFromPath})` : ""}`);
  } else if (productFromPath && String(observed.product).trim() !== productFromPath) {
    errors.push(`product mismatch (current ${String(observed.product).trim()}, expected ${productFromPath})`);
  }
  if (!normalizeDate(pickFirstNonEmpty(observed.create_at, observed.created_at, ""))) {
    errors.push("missing create_at");
  }

  const currentStatus = normalizeRequirementStatus(observed.status);
  if (!currentStatus || !REQUIREMENT_STATUSES.has(currentStatus)) {
    errors.push("invalid status (expected raw/formalized/enhanced)");
  }

  const needsRewrite = options.fix && (options.force || !frontMatter || legacyKeys.length > 0 || hasCanonicalDiff(observed, plannedFields));
  const writeResult = needsRewrite
    ? maybeWriteCanonicalFrontMatter(filePath, body, plannedFields, "prd", options)
    : { changed: false, verified: true, verificationErrors: [] };

  const remainingErrors = buildRequirementRemainingErrors(plannedFields, productFromPath);
  return {
    docType: "requirements",
    path: filePath,
    relPath,
    bucket: buildBucket(relPath, "requirements"),
    errors,
    warnings,
    plannedFrontMatter: buildCanonicalFrontMatter(plannedFields, "prd"),
    changed: writeResult.changed,
    verificationErrors: writeResult.verificationErrors,
    remainingErrors,
  };
}

function maybeWriteCanonicalFrontMatter(filePath, body, plannedFields, docType, options) {
  const canonicalFrontMatter = buildCanonicalFrontMatter(plannedFields, docType === "prd" ? "prd" : "archive");
  if (options.dryRun) {
    return {
      changed: true,
      verified: true,
      verificationErrors: [],
      content: canonicalFrontMatter + body,
    };
  }

  writeFileSync(filePath, canonicalFrontMatter + body, "utf8");

  const verificationErrors = [];
  const verifiedContent = readFileSync(filePath, "utf8");
  const { frontMatter: verifiedFrontMatter, body: verifiedBody } = parseFrontMatter(verifiedContent);
  if (!verifiedFrontMatter) {
    verificationErrors.push("frontmatter missing after write");
  } else if (hasLegacyFrontMatterKeys(verifiedFrontMatter)) {
    verificationErrors.push("legacy keys remained after write");
  }

  if (docType === "archive") {
    const expectedCaseCount = countArchiveCases(body);
    const actualCaseCount = countArchiveCases(verifiedBody);
    if (actualCaseCount !== expectedCaseCount) {
      verificationErrors.push(`case_count verification failed (expected ${expectedCaseCount}, got ${actualCaseCount})`);
    }
    if (Number(verifiedFrontMatter?.case_count) !== expectedCaseCount) {
      verificationErrors.push(`frontmatter case_count verification failed (expected ${expectedCaseCount}, got ${verifiedFrontMatter?.case_count})`);
    }
  }

  if (docType === "prd") {
    if (!REQUIREMENT_STATUSES.has(normalizeRequirementStatus(verifiedFrontMatter?.status))) {
      verificationErrors.push("status verification failed after write");
    }
  }

  return {
    changed: true,
    verified: verificationErrors.length === 0,
    verificationErrors,
  };
}

function buildArchiveRemainingErrors(plannedFields, context, productFromPath) {
  const remaining = [];
  if (!String(plannedFields.suite_name || "").trim()) {
    remaining.push("missing suite_name");
  }
  if (!String(plannedFields.description || "").trim()) {
    remaining.push("missing description");
  }
  if (!String(plannedFields.product || "").trim()) {
    remaining.push("missing product");
  }
  if (productFromPath && String(plannedFields.product).trim() !== productFromPath) {
    remaining.push("product mismatch");
  }
  if (isDtstackProduct(plannedFields.product, context.modules) && normalizePrdId(plannedFields.prd_id) === "") {
    remaining.push("missing prd_id");
  }
  if (!String(plannedFields.create_at || "").trim()) {
    remaining.push("missing create_at");
  }
  if (!Array.isArray(plannedFields.tags) || plannedFields.tags.length === 0) {
    remaining.push("missing tags");
  }
  return remaining;
}

function buildRequirementRemainingErrors(plannedFields, productFromPath) {
  const remaining = [];
  if (!String(plannedFields.prd_name || plannedFields.suite_name || "").trim()) {
    remaining.push("missing prd_name");
  }
  if (!String(plannedFields.description || "").trim()) {
    remaining.push("missing description");
  }
  if (!String(plannedFields.product || "").trim()) {
    remaining.push("missing product");
  }
  if (productFromPath && String(plannedFields.product).trim() !== productFromPath) {
    remaining.push("product mismatch");
  }
  if (!String(plannedFields.create_at || "").trim()) {
    remaining.push("missing create_at");
  }
  if (!REQUIREMENT_STATUSES.has(normalizeRequirementStatus(plannedFields.status))) {
    remaining.push("invalid status");
  }
  return remaining;
}

function summarizePlans(filePlans, options) {
  let errorCount = 0;
  let warningCount = 0;
  let filesWithErrors = 0;
  let filesWithWarnings = 0;
  let changedFiles = 0;
  let remainingErrors = 0;

  for (const plan of filePlans) {
    errorCount += plan.errors.length + plan.verificationErrors.length;
    warningCount += plan.warnings.length;
    if (plan.errors.length > 0 || plan.verificationErrors.length > 0) {
      filesWithErrors += 1;
    }
    if (plan.warnings.length > 0) {
      filesWithWarnings += 1;
    }
    if (plan.changed) {
      changedFiles += 1;
    }
    remainingErrors += plan.remainingErrors.length + plan.verificationErrors.length;
  }

  return {
    totalFiles: filePlans.length,
    changedFiles,
    filesWithErrors,
    filesWithWarnings,
    errorCount,
    warningCount,
    remainingErrors: options.fix ? remainingErrors : errorCount,
  };
}

function formatAuditReport(filePlans, summary, options) {
  const lines = [];
  lines.push(options.fix ? "Markdown frontmatter fix report" : "Markdown frontmatter audit report");
  lines.push(`Root: ${options.root}`);
  lines.push("");

  const buckets = new Map();
  for (const plan of filePlans) {
    const key = `${plan.docType}:${plan.bucket}`;
    if (!buckets.has(key)) {
      buckets.set(key, { bucket: plan.bucket, docType: plan.docType, files: [] });
    }
    buckets.get(key).files.push(plan);
  }

  for (const group of [...buckets.values()].sort((left, right) => {
    if (left.docType === right.docType) return left.bucket.localeCompare(right.bucket);
    return left.docType.localeCompare(right.docType);
  })) {
    lines.push(`## ${group.bucket} (${group.docType})`);
    for (const plan of group.files.sort((left, right) => left.relPath.localeCompare(right.relPath))) {
      lines.push(`- ${plan.relPath}`);
      if (options.fix && plan.changed) {
        lines.push(`  ✅ frontmatter ${options.dryRun ? "would be rewritten" : "rewritten"}`);
      }
      if (plan.errors.length === 0 && plan.warnings.length === 0 && plan.verificationErrors.length === 0) {
        lines.push("  ✅ no issues");
      }
      for (const error of plan.errors) {
        lines.push(`  ❌ ${error}`);
      }
      for (const warning of plan.warnings) {
        lines.push(`  ⚠️ ${warning}`);
      }
      for (const verificationError of plan.verificationErrors) {
        lines.push(`  ❌ ${verificationError}`);
      }
    }
    lines.push("");
  }

  lines.push("Summary:");
  lines.push(`- files scanned: ${summary.totalFiles}`);
  lines.push(`- files changed: ${summary.changedFiles}`);
  lines.push(`- files with errors: ${summary.filesWithErrors}`);
  lines.push(`- files with warnings: ${summary.filesWithWarnings}`);
  lines.push(`- error count: ${summary.errorCount}`);
  lines.push(`- warning count: ${summary.warningCount}`);
  if (options.fix) {
    lines.push(`- remaining errors after fix: ${summary.remainingErrors}`);
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function formatBackfillRun(result, { dryRun = false, verbose = false } = {}) {
  const lines = [];
  const stats = { changed: 0, skipped: 0, error: 0 };

  for (const file of result.files) {
    if (file.changed) {
      stats.changed += 1;
      if (dryRun) {
        lines.push(`[dry-run] ${file.relPath}`);
        lines.push(file.plannedFrontMatter.trimEnd());
      } else {
        lines.push(`✅ ${file.relPath}`);
      }
      continue;
    }

    if (file.verificationErrors.length > 0 || file.remainingErrors.length > 0) {
      stats.error += 1;
      lines.push(`❌ ${file.relPath}`);
      for (const message of [...file.verificationErrors, ...file.remainingErrors]) {
        lines.push(`  - ${message}`);
      }
      continue;
    }

    stats.skipped += 1;
    if (verbose) {
      lines.push(`⏭  ${file.relPath} (already canonical)`);
    }
  }

  lines.push("");
  lines.push(`完成：处理 ${result.summary.totalFiles} 个文件`);
  if (dryRun) {
    lines.push(`  预览：${stats.changed} 个`);
  } else {
    lines.push(`  写入：${stats.changed} 个`);
    lines.push(`  跳过：${stats.skipped} 个`);
  }
  if (stats.error > 0) {
    lines.push(`  失败：${stats.error} 个`);
  }

  return lines.join("\n") + "\n";
}

function resolveDocTargets({ root, docType, targetPaths, defaultDir, skipNames }) {
  const allFiles = [];

  if (!targetPaths.length) {
    return collectMarkdownFiles(defaultDir, { skipNames });
  }

  for (const targetPath of targetPaths) {
    if (!existsSync(targetPath)) continue;
    const normalized = targetPath.replace(/\\/g, "/");
    const docSegment = docType === "archive" ? "/cases/archive/" : "/cases/requirements/";
    if (!normalized.includes(docSegment)) continue;

    const stat = statSync(targetPath);
    if (stat.isDirectory()) {
      allFiles.push(...collectMarkdownFiles(targetPath, { skipNames }));
    } else if (stat.isFile() && targetPath.endsWith(".md")) {
      if (!skipNames || !skipNames.has(basename(targetPath))) {
        allFiles.push(targetPath);
      }
    }
  }

  return [...new Set(allFiles)].sort();
}

function collectMarkdownFiles(dir, options = {}) {
  if (!existsSync(dir)) return [];

  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(filePath, options));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (options.skipNames && options.skipNames.has(entry.name)) continue;
    files.push(filePath);
  }

  return files.sort();
}

function normalizeTargetPaths(value, root) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter(Boolean)
    .map((item) => (/^\//.test(item) ? item : resolve(root, item)));
}

function buildRequirementEntry(filePath, root) {
  const content = readFileSync(filePath, "utf8");
  const { frontMatter, body } = parseFrontMatter(content);
  const observed = frontMatter || {};
  const heading = extractFirstHeading(body);
  const title = normalizeDocumentTitle(String(
    pickFirstNonEmpty(
      observed.prd_name,
      observed.suite_name,
      observed.name,
      heading,
      basename(filePath, ".md"),
    ),
  ));

  return {
    path: filePath,
    relPath: toRelativePath(root, filePath),
    product: String(pickFirstNonEmpty(observed.product, observed.module, extractModuleKey(filePath), "")).trim(),
    version: String(pickFirstNonEmpty(observed.prd_version, observed.version, extractVersionFromPath(filePath), "")).trim(),
    prdId: normalizePrdId(
      pickFirstNonEmpty(
        observed.prd_id,
        extractPrdIdFromText(basename(filePath, ".md")),
        extractPrdIdFromText(heading),
        extractPrdIdFromText(observed.name),
      ),
    ),
    title,
    normalizedTitle: normalizeDocumentTitle(title),
  };
}

function findRequirementMatch(entries, target) {
  const normalizedTitle = normalizeDocumentTitle(target.title || "");
  const byId = target.prdId
    ? entries.filter((entry) => entry.prdId && entry.prdId === target.prdId)
    : [];

  const candidates = byId.length > 0 ? byId : entries.filter((entry) => {
    if (target.product && entry.product && entry.product !== target.product) return false;
    if (target.version && entry.version && entry.version !== target.version) return false;
    return entry.normalizedTitle === normalizedTitle;
  });

  if (candidates.length === 1) {
    return candidates[0];
  }

  if (candidates.length > 1 && target.product) {
    const exact = candidates.filter((entry) => entry.product === target.product);
    if (exact.length === 1) return exact[0];
  }

  return null;
}

function extractArchiveSignals(body, filePath) {
  return {
    heading: extractFirstHeading(body),
    source: pickFirstNonEmpty(extractPrefixedLine(body, /^>\s*来源：\s*(.+)$/m), extractSplitFromComment(body), ""),
    devVersion: extractPrefixedLine(body, /^>\s*开发版本：\s*(.+)$/m),
    caseCount: countArchiveCases(body),
    headings: extractHeadings(body, 2, 3),
    filePath,
  };
}

function extractRequirementSignals(body, filePath) {
  return {
    heading: extractFirstHeading(body),
    source: extractPrefixedLine(body, /^>\s*来源：\s*(.+)$/m),
    importedAt: extractPrefixedLine(body, /^>\s*导入日期：\s*(.+)$/m),
    devVersion: pickFirstNonEmpty(
      extractPrefixedLine(body, /^>\s*开发版本：\s*(.+)$/m),
      extractPrefixedLine(body, /^开发版本：\s*(.+)$/m),
      "",
    ),
    enhancedAt: extractEnhancedAt(body),
    description: inferRequirementDescription(body, filePath),
  };
}

function inferRequirementDescription(body, filePath) {
  const heading = extractFirstHeading(body);
  for (const rawLine of body.split(/\r?\n/)) {
    const line = normalizeInlineText(rawLine);
    if (!line) continue;
    if (/^#/.test(line)) continue;
    if (/^---+$/.test(line)) continue;
    if (/^!\[/.test(line)) continue;
    if (/^\|/.test(line)) continue;
    if (/^<!--/.test(line)) continue;
    if (/^(来源|文档ID|导入日期|开发版本|模块|增强日期)：/.test(line)) continue;
    if (heading && normalizeDocumentTitle(line) === normalizeDocumentTitle(heading)) continue;
    return line.slice(0, 60);
  }
  return normalizeDocumentTitle(heading || basename(filePath, ".md"));
}

function inferRequirementHealthWarnings(existingValue, body) {
  const existing = coerceStringArray(existingValue);
  if (existing.length > 0) return existing;

  const warnings = [];
  for (const match of body.matchAll(/^\s*>\s*⚠️\s*\[([A-Z]\d+)\]\s*(.+)$/gm)) {
    warnings.push(`${match[1]}: ${match[2].trim()}`);
  }
  return warnings;
}

function inspectArchiveBody(body) {
  const warnings = [];
  if (/^#\s+/m.test(body)) {
    warnings.push("body contains H1 heading");
  }

  const caseBlocks = splitArchiveCaseBlocks(body);
  for (const block of caseBlocks) {
    if (!/^【P\d+】/.test(block.title)) {
      warnings.push(`case \"${block.title}\" missing priority prefix`);
    }

    const useCaseMarkerIndex = block.lines.findIndex((line) => line.trim() === "> 用例步骤");
    if (useCaseMarkerIndex === -1) {
      warnings.push(`case \"${block.title}\" missing > 用例步骤`);
      continue;
    }

    const beforeUseCase = block.lines.slice(0, useCaseMarkerIndex);
    const hasPreconditionMarker = beforeUseCase.some((line) => line.trim() === "> 前置条件");
    const hasPreconditionContent = beforeUseCase.some((line) => {
      const trimmed = line.trim();
      return trimmed
        && trimmed !== "> 前置条件"
        && trimmed !== "```"
        && !/^<!--/.test(trimmed);
    });

    if (hasPreconditionContent && !hasPreconditionMarker) {
      warnings.push(`case \"${block.title}\" missing > 前置条件 marker`);
    }

    const firstStep = extractFirstCaseStep(block.lines.slice(useCaseMarkerIndex + 1));
    if (firstStep && !firstStep.startsWith("进入【")) {
      warnings.push(`case \"${block.title}\" first step does not start with 进入【`);
    }
  }

  return warnings;
}

function splitArchiveCaseBlocks(body) {
  const lines = body.split(/\r?\n/);
  const blocks = [];
  let current = null;

  lines.forEach((line) => {
    const match = line.match(/^#####\s+(.+)$/);
    if (match) {
      if (current) blocks.push(current);
      current = { title: match[1].trim(), lines: [] };
      return;
    }
    if (current) current.lines.push(line);
  });

  if (current) blocks.push(current);
  return blocks;
}

function extractFirstCaseStep(lines) {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "```") continue;

    if (/^\|/.test(trimmed)) {
      const cells = trimmed
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
      if (cells.length < 2) continue;
      if (cells[0] === "编号" || /^-+$/.test(cells[0])) continue;
      if (/^\d+$/.test(cells[0])) {
        return cells[1] || "";
      }
      continue;
    }

    const listMatch = trimmed.match(/^(?:\d+[、.．]\s*|-\s+)(.+)$/);
    if (listMatch) {
      return listMatch[1].trim();
    }
  }

  return "";
}

function countArchiveCases(body) {
  return (body.match(/^#####\s+/gm) || []).length;
}

function extractHeadings(body, minLevel, maxLevel) {
  return body
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{1,6})\s+(.+)$/))
    .filter(Boolean)
    .filter((match) => match[1].length >= minLevel && match[1].length <= maxLevel)
    .map((match) => match[2].trim());
}

function extractFirstHeading(body) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function extractPrefixedLine(body, pattern) {
  const match = body.match(pattern);
  return match ? match[1].trim() : "";
}

function extractSplitFromComment(body) {
  const match = body.match(/<!--\s*split-from:\s*([^|>]+).*?-->/);
  return match ? match[1].trim() : "";
}

function extractEnhancedAt(body) {
  const match = body.match(/enhanced-at:\s*([^\s|]+)/);
  return match ? match[1].trim() : "";
}

function extractPrdIdFromText(value) {
  if (!value) return "";
  const text = String(value);
  const patterns = [
    /\(#(\d+)\)/,
    /（#(\d+)）/,
    /\bPRD[-\s_]*(\d+)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return "";
}

function normalizePrdId(value) {
  if (value === null || value === undefined) return "";
  const normalized = String(value).trim();
  if (!normalized) return "";
  const digits = normalized.match(/^(\d+)$/);
  return digits ? Number(digits[1]) : "";
}

function normalizeRequirementStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function inferRequirementStatus(filePath) {
  const baseName = basename(filePath, ".md").toLowerCase();
  if (baseName.endsWith("-enhanced")) return "enhanced";
  if (baseName.endsWith("-formalized")) return "formalized";
  return "raw";
}

function inferRequirementsPathFromSource(source) {
  const normalized = String(source || "").replace(/\\/g, "/").trim();
  return normalized.startsWith("cases/requirements/") ? normalized : "";
}

function inferArchiveOrigin(observed, legacySignals, relPath) {
  const candidates = [
    String(observed.source || "").trim(),
    String(observed.prd_path || "").trim(),
    String(legacySignals.source || "").trim(),
    String(observed.name || "").trim(),
    relPath,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate.endsWith(".json")) return "json";
    if (candidate.endsWith(".xmind") || /（XMind）/.test(candidate) || /\(XMind\)/i.test(candidate)) return "xmind";
    if (candidate.endsWith(".csv")) return "csv";
    if (/split-from:/i.test(candidate)) return "split";
  }

  if (/<!--\s*split-from:/i.test(readFileSync(legacySignals.filePath, "utf8"))) {
    return "split";
  }

  return "";
}

function collectLegacyKeys(frontMatter) {
  return Object.keys(frontMatter || {}).filter((key) => hasLegacyFrontMatterKeys({ [key]: frontMatter[key] }));
}

function hasCanonicalDiff(observed, plannedFields) {
  const currentRelevant = {};
  for (const key of Object.keys(plannedFields)) {
    if (Object.prototype.hasOwnProperty.call(observed, key)) {
      currentRelevant[key] = normalizeComparableValue(observed[key]);
    }
  }

  const plannedRelevant = {};
  for (const [key, value] of Object.entries(plannedFields)) {
    plannedRelevant[key] = normalizeComparableValue(value);
  }

  for (const [key, value] of Object.entries(plannedRelevant)) {
    if (!Object.prototype.hasOwnProperty.call(currentRelevant, key)) {
      return true;
    }
    if (JSON.stringify(currentRelevant[key]) !== JSON.stringify(value)) {
      return true;
    }
  }

  return false;
}

function normalizeComparableValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeComparableValue(nestedValue)]),
    );
  }
  return value;
}

function isDtstackProduct(product, modules) {
  const moduleConfig = modules?.[product];
  if (!moduleConfig) return false;
  return moduleConfig.type !== "custom";
}

function buildBucket(relPath, docType) {
  const segments = relPath.replace(/\\/g, "/").split("/");
  const baseIndex = docType === "archive"
    ? segments.indexOf("archive")
    : segments.indexOf("requirements");
  if (baseIndex === -1) return dirname(relPath).replace(/\\/g, "/");
  return segments.slice(baseIndex + 1, -1).join("/") || ".";
}

function normalizeRelativeDocumentPath(value) {
  return String(value || "").replace(/\\/g, "/").trim();
}

function normalizeInlineText(rawLine) {
  return String(rawLine || "")
    .trim()
    .replace(/^>\s*/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+[、.．]\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function toRelativePath(root, filePath) {
  return relative(root, filePath).replace(/\\/g, "/");
}
