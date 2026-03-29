import { existsSync, readFileSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { getRepoBranchMappingPath, getWorkspaceRoot, loadConfig } from "../../../shared/scripts/load-config.mjs";

export { getRepoBranchMappingPath } from "../../../shared/scripts/load-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedMapping = null;

function runPythonYamlLoader(filePath) {
  const pythonScript = [
    "import json",
    "import sys",
    "import yaml",
    "with open(sys.argv[1], 'r', encoding='utf-8') as fh:",
    "    data = yaml.safe_load(fh) or {}",
    "print(json.dumps(data, ensure_ascii=False))",
  ].join("\n");

  const result = spawnSync("python3", ["-c", pythonScript, filePath], {
    cwd: __dirname,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  if ((result.status ?? 0) !== 0) {
    throw new Error(result.stderr.trim() || "加载 repo-branch-mapping.yaml 失败");
  }

  return JSON.parse(result.stdout);
}

export function loadRepoBranchMapping() {
  if (cachedMapping) {
    return cachedMapping;
  }

  const mappingPath = getRepoBranchMappingPath();
  if (!existsSync(mappingPath)) {
    throw new Error(`未找到 repo-branch-mapping.yaml: ${mappingPath}`);
  }

  cachedMapping = runPythonYamlLoader(mappingPath);
  return cachedMapping;
}

export function resolveRepoWorkingPath(repoPath) {
  if (!repoPath) {
    return null;
  }
  return resolve(getWorkspaceRoot(), repoPath);
}

export function extractReleaseVersion(...sources) {
  for (const source of sources) {
    const text = `${source ?? ""}`;
    const match = text.match(/(?:版本[：:\s]*)?[Vv](\d+\.\d+\.\d+)/) || text.match(/(\d+\.\d+\.\d+)/);
    if (match?.[1]) {
      return `v${match[1]}`;
    }
  }
  return null;
}

function extractRequirementTitle(rawText = "") {
  const lineMatchers = [
    /(?:页面名称|需求名称|功能名称)[：:]\s*([^\n\r]+)/,
    /((?:【[^】]+】)[^\n\r]+)/,
  ];

  for (const matcher of lineMatchers) {
    const match = rawText.match(matcher);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return null;
}

function extractDevelopmentVersion(rawText = "", mapping = loadRepoBranchMapping()) {
  const explicitLine = rawText.match(/开发版本[：:]\s*([^\n\r]+)/);
  if (explicitLine?.[1]?.trim()) {
    return explicitLine[1].trim();
  }

  for (const rule of mapping.developmentVersionRules ?? []) {
    const keywords = rule?.match?.keywords ?? [];
    if (keywords.some((keyword) => keyword && rawText.includes(keyword))) {
      return rule.name;
    }
  }

  return null;
}

function findDevelopmentRule(developmentVersion, rawText = "", mapping = loadRepoBranchMapping()) {
  if (!developmentVersion && !rawText) {
    return null;
  }

  for (const rule of mapping.developmentVersionRules ?? []) {
    if (developmentVersion && rule.name === developmentVersion) {
      return rule;
    }

    const keywords = rule?.match?.keywords ?? [];
    if (keywords.some((keyword) => keyword && rawText.includes(keyword))) {
      return rule;
    }
  }

  return null;
}

function applyBranchTemplate(template, branch) {
  if (!branch) {
    return null;
  }
  return (template || "{branch}").replaceAll("{branch}", branch);
}

function resolveRepoEntries(entries = [], branch, configRepos = {}) {
  return entries.map((entry) => ({
    role: entry.role || entry.repoKey,
    repoKey: entry.repoKey,
    path: configRepos[entry.repoKey] || null,
    branch: applyBranchTemplate(entry.branchTemplate, branch),
  }));
}

export function resolveRepoBranchPlan({
  moduleKey,
  rawText = "",
  requirementName = "",
  developmentVersion = null,
} = {}) {
  const mapping = loadRepoBranchMapping();
  const config = loadConfig();
  const moduleConfig = mapping.modules?.[moduleKey];

  if (!moduleConfig) {
    throw new Error(`repo-branch-mapping.yaml 未声明模块: ${moduleKey}`);
  }

  const resolvedDevelopmentVersion = developmentVersion || extractDevelopmentVersion(rawText, mapping);
  const matchedRule = findDevelopmentRule(resolvedDevelopmentVersion, rawText, mapping);
  const repoProfileKey = matchedRule?.repoProfileKey || moduleConfig.repoProfileKey;
  const repoProfile = mapping.repoProfiles?.[repoProfileKey];

  if (!repoProfile) {
    throw new Error(`repo-branch-mapping.yaml 未声明 repo profile: ${repoProfileKey}`);
  }

  const releaseVersion = extractReleaseVersion(rawText, requirementName);
  const requirementTitle = extractRequirementTitle(rawText) || requirementName || null;
  const backendBranch = matchedRule?.branches?.backend || null;
  const frontendBranch = matchedRule?.branches?.frontend || null;

  return {
    moduleKey,
    standard: moduleConfig.standard || null,
    repoProfileKey,
    developmentVersion: resolvedDevelopmentVersion,
    releaseVersion,
    requirementTitle,
    matchedRule: matchedRule?.name || null,
    backend: resolveRepoEntries(repoProfile.backend, backendBranch, config.repos),
    frontend: resolveRepoEntries(repoProfile.frontend, frontendBranch, config.repos),
  };
}

export function writeRepoBranchPlanToState(stateFilePath, plan) {
  const existing = existsSync(stateFilePath)
    ? JSON.parse(readFileSync(stateFilePath, "utf8"))
    : {};

  const sourceContext = {
    module_key: plan.moduleKey,
    repo_profile_key: plan.repoProfileKey,
    development_version: plan.developmentVersion,
    release_version: plan.releaseVersion,
    requirement_title: plan.requirementTitle,
    backend: plan.backend,
    frontend: plan.frontend,
  };

  const nextState = {
    ...existing,
    source_context: sourceContext,
  };

  writeFileSync(stateFilePath, JSON.stringify(nextState, null, 2), "utf8");
  return nextState;
}
