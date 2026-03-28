import { existsSync, readdirSync, statSync } from "fs";
import { basename, extname, join, resolve } from "path";
import { loadConfig, loadHarnessContracts } from "./load-config.mjs";

const REQUIRED_PATTERN_KEYS = {
  xmind: ["prdLevel", "storyLevel"],
  archive: ["prdLevelFromPrd", "prdLevelFromXmind", "storyLevel"],
};

const OUTPUT_EXTENSIONS = {
  xmind: ".xmind",
  archive: ".md",
};

const TEMPLATE_EXAMPLES = [
  ["YYYYMMDD", "20260322"],
  ["YYYYMM", "202603"],
  ["XX", "26"],
  ["<功能名>", "示例功能"],
];

function getOutputNamingConfig(contracts = loadHarnessContracts()) {
  return contracts?.outputNaming ?? null;
}

function materializeTemplate(template) {
  return TEMPLATE_EXAMPLES.reduce(
    (output, [token, example]) => output.replaceAll(token, example),
    template,
  );
}

function compilePattern(regexSource) {
  return new RegExp(regexSource);
}

function getContractSection(kind, contracts = loadHarnessContracts()) {
  const outputNaming = getOutputNamingConfig(contracts);
  const contractSection = outputNaming?.[kind];
  if (!contractSection) {
    throw new Error(`contracts.outputNaming.${kind} 缺失`);
  }
  return contractSection;
}

function getPatternDescriptors(kind, contracts = loadHarnessContracts()) {
  const contractSection = getContractSection(kind, contracts);
  return Object.entries(contractSection.acceptedPatterns ?? {}).map(([key, descriptor]) => ({
    key,
    template: descriptor.template,
    regex: compilePattern(descriptor.regex),
  }));
}

function getPrdLikeBaseName(baseName) {
  const strippedBaseName = stripKnownOutputSuffixes(baseName);
  if (!/^PRD-\d+(?:-|_).+/i.test(strippedBaseName)) {
    return null;
  }
  return sanitizeFileName(strippedBaseName);
}

function getCanonicalArchiveBaseName(baseName) {
  if (
    matchesBaseName("archive", baseName, ["prdLevelFromPrd", "prdLevelFromXmind", "storyLevel"]) ||
    matchesBaseName("xmind", baseName, ["prdLevel", "storyLevel"])
  ) {
    return sanitizeFileName(baseName);
  }
  return null;
}

export function sanitizeFileName(name) {
  return (name || "unnamed")
    .replace(/[\/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "-");
}

export function stripKnownOutputSuffixes(baseName) {
  return (baseName || "").replace(/(?:-(?:enhanced|final|reviewed|cases|output))+$/i, "");
}

function getDtstackPreferredArchiveBaseName(meta = {}) {
  if (meta.source_standard !== "dtstack") {
    return null;
  }

  const preferredTitle = meta.archive_file_name || meta.requirement_title || meta.page_title || "";
  if (!preferredTitle.trim()) {
    return null;
  }

  return sanitizeFileName(preferredTitle.trim());
}

export function getReservedBasenames(kind, contracts = loadHarnessContracts()) {
  return [...(getContractSection(kind, contracts).reservedBasenames ?? [])];
}

export function matchOutputNamingPattern(kind, fileName, contracts = loadHarnessContracts()) {
  const normalizedFileName = basename(fileName);
  return (
    getPatternDescriptors(kind, contracts).find(({ regex }) => regex.test(normalizedFileName)) ?? null
  );
}

export function matchesBaseName(kind, baseName, patternKeys = null, contracts = loadHarnessContracts()) {
  const extension = OUTPUT_EXTENSIONS[kind];
  const fileName = `${baseName}${extension}`;
  const match = matchOutputNamingPattern(kind, fileName, contracts);
  if (!match) {
    return false;
  }
  return Array.isArray(patternKeys) ? patternKeys.includes(match.key) : true;
}

export function describeOutputNamingPatterns(kind, contracts = loadHarnessContracts()) {
  return getPatternDescriptors(kind, contracts).map(({ template }) => template).join(" 或 ");
}

export function validateOutputNamingContracts(
  contracts = loadHarnessContracts(),
  config = loadConfig(),
) {
  const errors = [];
  const outputNaming = getOutputNamingConfig(contracts);

  if (!outputNaming || typeof outputNaming !== "object") {
    return ["contracts.outputNaming 缺失"];
  }

  for (const kind of Object.keys(REQUIRED_PATTERN_KEYS)) {
    const contractSection = outputNaming[kind];
    if (!contractSection || typeof contractSection !== "object") {
      errors.push(`contracts.outputNaming.${kind} 缺失`);
      continue;
    }

    if (typeof contractSection.legacyPolicy !== "string" || contractSection.legacyPolicy.length === 0) {
      errors.push(`contracts.outputNaming.${kind}.legacyPolicy 缺失`);
    }

    if (!contractSection.acceptedPatterns || typeof contractSection.acceptedPatterns !== "object") {
      errors.push(`contracts.outputNaming.${kind}.acceptedPatterns 缺失`);
      continue;
    }

    for (const patternKey of REQUIRED_PATTERN_KEYS[kind]) {
      const descriptor = contractSection.acceptedPatterns[patternKey];
      if (!descriptor || typeof descriptor !== "object") {
        errors.push(`contracts.outputNaming.${kind}.acceptedPatterns.${patternKey} 缺失`);
        continue;
      }
      if (typeof descriptor.template !== "string" || descriptor.template.length === 0) {
        errors.push(`contracts.outputNaming.${kind}.acceptedPatterns.${patternKey}.template 缺失`);
      }
      if (typeof descriptor.regex !== "string" || descriptor.regex.length === 0) {
        errors.push(`contracts.outputNaming.${kind}.acceptedPatterns.${patternKey}.regex 缺失`);
        continue;
      }

      let compiled = null;
      try {
        compiled = compilePattern(descriptor.regex);
      } catch (error) {
        errors.push(`contracts.outputNaming.${kind}.acceptedPatterns.${patternKey}.regex 非法: ${error.message}`);
        continue;
      }

      const example = materializeTemplate(descriptor.template);
      if (!compiled.test(example)) {
        errors.push(
          `contracts.outputNaming.${kind}.acceptedPatterns.${patternKey}.regex 未匹配模板示例: ${example}`,
        );
      }
      if (!example.endsWith(OUTPUT_EXTENSIONS[kind])) {
        errors.push(
          `contracts.outputNaming.${kind}.acceptedPatterns.${patternKey}.template 扩展名应为 ${OUTPUT_EXTENSIONS[kind]}`,
        );
      }
    }
  }

  const latestXmind = config?.shortcuts?.latestXmind ?? contracts?.shortcuts?.latestXmind;
  if (latestXmind) {
    const reservedBasenames = outputNaming.xmind?.reservedBasenames ?? [];
    if (!reservedBasenames.includes(latestXmind)) {
      errors.push("contracts.outputNaming.xmind.reservedBasenames 必须包含 latest-output.xmind");
    }

    for (const patternKey of REQUIRED_PATTERN_KEYS.xmind) {
      const descriptor = outputNaming.xmind?.acceptedPatterns?.[patternKey];
      if (!descriptor?.regex) {
        continue;
      }
      try {
        if (compilePattern(descriptor.regex).test(latestXmind)) {
          errors.push(`contracts.outputNaming.xmind.acceptedPatterns.${patternKey} 不应匹配保留文件名 ${latestXmind}`);
        }
      } catch {
      }
    }
  }

  return errors;
}

export function assertNewOutputPathMatchesContract(
  kind,
  outputPath,
  {
    allowExistingTarget = false,
    reservedBasenames = null,
    reservedMessage,
  } = {},
) {
  const normalizedFileName = basename(outputPath);
  const effectiveReservedBasenames = reservedBasenames ?? getReservedBasenames(kind);

  if (effectiveReservedBasenames.includes(normalizedFileName)) {
    throw new Error(
      reservedMessage ??
        `${normalizedFileName} 是保留输出文件名，仅供仓库根目录的最近输出快捷链接使用`,
    );
  }

  if (allowExistingTarget && existsSync(resolve(outputPath))) {
    return { mode: "existing-target" };
  }

  const match = matchOutputNamingPattern(kind, normalizedFileName);
  if (match) {
    return { mode: "contract", pattern: match.key };
  }

  const outputLabel = kind === "xmind" ? "XMind" : "Archive";
  throw new Error(
    `新的 ${outputLabel} 输出文件名需符合命名 contract：${describeOutputNamingPatterns(kind)}；如需写回历史遗留文件名，请使用已存在的目标文件路径`,
  );
}

export function deriveArchiveBaseName(inputPath, meta = {}) {
  const inputBaseName = basename(inputPath, extname(inputPath));
  const dtstackPreferredArchiveBaseName = getDtstackPreferredArchiveBaseName(meta);
  if (dtstackPreferredArchiveBaseName) {
    return dtstackPreferredArchiveBaseName;
  }

  const inputPrdBaseName = getPrdLikeBaseName(inputBaseName);
  if (inputPrdBaseName) {
    return inputPrdBaseName;
  }

  const canonicalInputBaseName = getCanonicalArchiveBaseName(inputBaseName);
  if (canonicalInputBaseName) {
    return canonicalInputBaseName;
  }

  const prdPathBaseName = meta.prd_path
    ? getPrdLikeBaseName(basename(meta.prd_path, extname(meta.prd_path)))
    : null;
  if (prdPathBaseName) {
    return prdPathBaseName;
  }

  const normalizedRequirementName = sanitizeFileName(meta.requirement_name || "");
  const requirementNamePrdBaseName = getPrdLikeBaseName(normalizedRequirementName);
  if (requirementNamePrdBaseName) {
    return requirementNamePrdBaseName;
  }

  const canonicalRequirementName = getCanonicalArchiveBaseName(normalizedRequirementName);
  if (canonicalRequirementName) {
    return canonicalRequirementName;
  }

  const requirementId = (meta.requirement_id || "").trim();
  if (/^PRD-\d+$/i.test(requirementId) && normalizedRequirementName) {
    return sanitizeFileName(`${requirementId}-${meta.requirement_name}`);
  }

  return normalizedRequirementName || sanitizeFileName(inputBaseName);
}

export function deriveArchiveBaseNameFromXmind(inputPath, resultTitle, totalResults) {
  const inputBaseName = basename(inputPath, extname(inputPath));
  if (totalResults === 1 && matchesBaseName("xmind", inputBaseName, ["prdLevel", "storyLevel"])) {
    return sanitizeFileName(inputBaseName);
  }
  return sanitizeFileName(resultTitle || inputBaseName);
}

/**
 * 审计 Archive 目录，返回命名约定警告
 * @param {string} dirPath - cases/archive/<module>/ 绝对路径
 * @returns {{ warnings: string[], suggestions: string[] }}
 */
export function auditArchiveDirectory(dirPath) {
  const warnings = [];
  const suggestions = [];

  let entries;
  try {
    entries = readdirSync(dirPath);
  } catch {
    return { warnings, suggestions };
  }

  const VERSION_DIR_RE = /^v\d+\.\d+/;
  const BARE_VERSION_DIR_RE = /^\d+\.\d+/;
  const CHINESE_RE = /[\u4e00-\u9fff]/;

  for (const entry of entries) {
    const entryPath = join(dirPath, entry);
    let stat;
    try {
      stat = statSync(entryPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      if (CHINESE_RE.test(entry)) {
        warnings.push(
          `子目录 "${entry}" 使用了中文命名；建议改用英文路径别名（如版本号 vX.Y.Z 或模块 key）`,
        );
      }
      if (BARE_VERSION_DIR_RE.test(entry) && !VERSION_DIR_RE.test(entry)) {
        warnings.push(
          `版本目录 "${entry}" 缺少 "v" 前缀；建议重命名为 "v${entry}"`,
        );
      }
    }

    if (stat.isFile() && entry.endsWith(".md")) {
      const sizeKb = stat.size / 1024;
      if (sizeKb > 200) {
        const baseName = basename(entry, ".md");
        const siblingVersionDir = entries.find(
          (e) => e !== entry && VERSION_DIR_RE.test(e) && statSync(join(dirPath, e)).isDirectory(),
        );
        if (!siblingVersionDir) {
          suggestions.push(
            `文件 "${entry}" 超过 200 KB（${sizeKb.toFixed(0)} KB），且同级目录中无对应版本子目录；建议拆分为多个 PRD 级文件或使用 split-archive 命令`,
          );
        }
      }
    }
  }

  return { warnings, suggestions };
}
