/**
 * load-config.mjs
 * 从 .claude/config.json 读取集中配置，供所有脚本共享
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "../config.json");

let _config = null;

/** 读取并缓存 config.json */
export function loadConfig() {
  if (!_config) {
    _config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  }
  return _config;
}

/**
 * 获取模块中英文映射（双向），如：
 *   { "离线开发": "batch-works", "batch-works": "batch-works", ... }
 *
 * 对于 custom 类型模块（如 xyzh），映射值从 xmind 路径推导：
 *   cases/xmind/custom/xyzh/ → "custom/xyzh"
 * 这确保路径拼接 cases/xmind/{value} 和 cases/archive/{value} 正确。
 */
export function getModuleMap() {
  const config = loadConfig();
  const map = {};
  for (const [key, mod] of Object.entries(config.modules || {})) {
    // 从 xmind 路径提取模块目录段：cases/xmind/<moduleDir>/
    let moduleDir = key;
    if (mod.xmind) {
      const match = mod.xmind.match(/cases\/xmind\/(.+?)\/?$/);
      if (match) moduleDir = match[1];
    }
    map[mod.zh] = moduleDir;
    map[key] = moduleDir;
    if (moduleDir !== key) map[moduleDir] = moduleDir;
  }
  return map;
}

/**
 * 获取 DTStack 模块列表（排除 custom 类型）
 * @returns {{ zh: string[], en: string[] }}
 */
export function getDtstackModules() {
  const config = loadConfig();
  const zh = [];
  const en = [];
  for (const [key, mod] of Object.entries(config.modules || {})) {
    if (mod.type !== "custom") {
      zh.push(mod.zh);
      en.push(key);
    }
  }
  return { zh, en };
}

/** 获取工作空间根目录 */
export function getWorkspaceRoot() {
  return resolve(__dirname, "../..");
}

export function resolveWorkspacePath(relativePath) {
  return resolve(getWorkspaceRoot(), relativePath);
}

export function getRepoBranchMappingPath() {
  return resolveWorkspacePath("config/repo-branch-mapping.yaml");
}

export function getIntegrationConfig(name) {
  return loadConfig().integrations?.[name] ?? null;
}

export function getHarnessConfig() {
  return loadConfig().harness ?? null;
}

export function getHarnessPaths() {
  const harness = getHarnessConfig();
  if (!harness) {
    return null;
  }

  const workflows = {};
  for (const [name, relativePath] of Object.entries(harness.workflows ?? {})) {
    workflows[name] = resolveWorkspacePath(relativePath);
  }

  return {
    root: resolveWorkspacePath(harness.root),
    workflowDir: resolveWorkspacePath(harness.workflowDir),
    delegates: resolveWorkspacePath(harness.delegates),
    hooks: resolveWorkspacePath(harness.hooks),
    contracts: resolveWorkspacePath(harness.contracts),
    workflows,
  };
}

function loadJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function loadHarnessDelegates() {
  const harnessPaths = getHarnessPaths();
  if (!harnessPaths) {
    return null;
  }
  return loadJsonFile(harnessPaths.delegates).delegates ?? null;
}

export function loadHarnessContracts() {
  const harnessPaths = getHarnessPaths();
  if (!harnessPaths) {
    return null;
  }
  return loadJsonFile(harnessPaths.contracts);
}

export function loadHarnessHooks() {
  const harnessPaths = getHarnessPaths();
  if (!harnessPaths) {
    return null;
  }
  return loadJsonFile(harnessPaths.hooks);
}

export function loadHarnessWorkflow(name) {
  const harnessPaths = getHarnessPaths();
  const workflowPath = harnessPaths?.workflows?.[name];
  return workflowPath ? loadJsonFile(workflowPath) : null;
}

export function resolveHarnessHook(type, name) {
  const hooks = loadHarnessHooks();
  if (!hooks) {
    return null;
  }

  const typeMap = {
    precheck: "prechecks",
    prechecks: "prechecks",
    condition: "conditions",
    conditions: "conditions",
    recovery: "recovery",
    convergence: "convergence",
  };

  const group = typeMap[type] ?? type;
  return hooks[group]?.[name] ?? null;
}

export function getShortcutPath(name) {
  const shortcut = loadConfig().shortcuts?.[name];
  return shortcut ? resolveWorkspacePath(shortcut) : null;
}

/**
 * 从 workflow + delegates 联合查找步骤的 delegate 配置
 * @param {string} workflowName - workflow key (e.g., "testCaseGeneration")
 * @param {string} stepId - step id (e.g., "prd-enhancer")
 * @returns {{ id: string, kind: string, entry: string, purpose: string } | null}
 */
export function resolveStepDelegate(workflowName, stepId) {
  const workflow = loadHarnessWorkflow(workflowName);
  const delegates = loadHarnessDelegates();
  if (!workflow || !delegates) return null;

  const step = (workflow.steps ?? []).find((s) => s.id === stepId);
  if (!step) return null;

  const delegateId = step.delegate;
  const delegate = delegates[delegateId];
  if (!delegate) return null;

  return { id: delegateId, ...delegate };
}

/**
 * 返回拓扑排序后的步骤列表（按 dependsOn 依赖顺序）
 * @param {string} workflowName
 * @returns {Array<{id: string, delegate: string, dependsOn: string[], [key: string]: any}>}
 */
export function getWorkflowStepOrder(workflowName) {
  const workflow = loadHarnessWorkflow(workflowName);
  if (!workflow) return [];

  const steps = workflow.steps ?? [];
  const stepMap = new Map(steps.map((s) => [s.id, s]));
  const completed = new Set();
  const inProgress = new Set();
  const ordered = [];

  function visit(stepId) {
    if (completed.has(stepId)) return;
    if (inProgress.has(stepId)) {
      throw new Error(`Cycle detected in workflow "${workflowName}": step "${stepId}" is part of a circular dependency`);
    }
    inProgress.add(stepId);
    const step = stepMap.get(stepId);
    if (!step) {
      inProgress.delete(stepId);
      return;
    }
    for (const dep of step.dependsOn ?? []) {
      visit(dep);
    }
    inProgress.delete(stepId);
    completed.add(stepId);
    ordered.push(step);
  }

  for (const step of steps) {
    visit(step.id);
  }

  return ordered;
}

/**
 * 评估步骤在给定条件集下是否应跳过
 * @param {string} workflowName
 * @param {string} stepId
 * @param {string[]} activeConditions - 当前激活的条件 key 列表 (e.g., ["quick-mode"])
 * @returns {{ skip: boolean, reason: string | null }}
 */
export function evaluateStepConditions(workflowName, stepId, activeConditions) {
  const workflow = loadHarnessWorkflow(workflowName);
  if (!workflow) return { skip: false, reason: null };

  const step = (workflow.steps ?? []).find((s) => s.id === stepId);
  if (!step) return { skip: false, reason: null };

  const skippableWhen = step.skippableWhen ?? [];
  for (const condition of skippableWhen) {
    if (activeConditions.includes(condition)) {
      return { skip: true, reason: condition };
    }
  }

  return { skip: false, reason: null };
}
