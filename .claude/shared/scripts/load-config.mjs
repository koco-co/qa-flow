/**
 * load-config.mjs
 * 从 .claude/config.json 读取集中配置，供所有脚本共享。
 *
 * GEN-01: Generalized schema — no DTStack-specific field names.
 * GEN-02: loadConfig() validates required fields and throws descriptive errors.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "../../config.json");

let _config = null;

// ────────────────────────────────────────────────────────────────────────────
// Internal validation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Assert that all required config fields are present.
 * Throws a descriptive error naming the first missing field.
 * @param {object} config - Parsed config object
 * @param {string} configPath - Path to config file (for error messages)
 */
function assertRequiredFields(config, configPath) {
  const checks = [
    ["project", config.project],
    ["project.name", config.project?.name],
    ["modules", config.modules],
  ];

  for (const [fieldPath, value] of checks) {
    if (value === undefined || value === null || value === "") {
      throw new Error(
        `config.json missing required field: "${fieldPath}". Please check ${configPath}.`
      );
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Config loading
// ────────────────────────────────────────────────────────────────────────────

/**
 * Load and validate config from an explicit path. Exported for testability.
 * Does NOT use the module-level cache — each call reads fresh.
 * @param {string} configPath - Absolute path to config.json
 * @returns {object} Validated config object
 */
export function loadConfigFromPath(configPath) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to read config at ${configPath}: ${err.message}`);
  }
  assertRequiredFields(raw, configPath);
  return raw;
}

/**
 * 读取并缓存 config.json (from default CONFIG_PATH).
 * @returns {object} Validated config object
 */
export function loadConfig() {
  if (!_config) {
    _config = loadConfigFromPath(CONFIG_PATH);
  }
  return _config;
}

/**
 * Reset the module-level config cache. Use in tests for isolation.
 */
export function resetConfigCache() {
  _config = null;
}

// ────────────────────────────────────────────────────────────────────────────
// Module helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * 获取模块中英文映射（双向），如：
 *   { "我的模块": "my-module", "my-module": "my-module", ... }
 *
 * 对于路径包含子目录的模块（如 xymnd 路径 cases/xmind/custom/xyzh/），
 * 映射值从 xmind 路径推导：cases/xmind/<moduleDir>/ → "custom/xyzh"
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
    if (mod.zh) map[mod.zh] = moduleDir;
    map[key] = moduleDir;
    if (moduleDir !== key) map[moduleDir] = moduleDir;
  }
  return map;
}

/**
 * 获取所有模块的 key 列表（替代已删除的 getDtstackModules()）。
 * @returns {string[]} Module key array
 */
export function getModuleKeys() {
  return Object.keys(loadConfig().modules ?? {});
}

/**
 * Resolve module artifact directory path.
 * Convention: {casesRoot}{type}/{moduleKey}/
 * Override: module config's explicit type field if present.
 * When mod.versioned === true and version is provided, appends v{version}/.
 * @param {string} moduleKey
 * @param {'xmind'|'archive'|'requirements'|'history'} type
 * @param {object} [config]
 * @param {string} [version] - Optional version string (e.g. 'v6.4.10')
 * @returns {string} workspace-relative path, trailing slash included
 */
export function resolveModulePath(moduleKey, type, config = loadConfig(), version = null) {
  const mod = config.modules?.[moduleKey];
  if (!mod) {
    throw new Error(
      `Unknown module key: "${moduleKey}". Run /using-qa-flow init to configure modules.`
    );
  }
  let basePath;
  if (mod[type]) {
    basePath = mod[type].endsWith('/') ? mod[type] : mod[type] + '/';
  } else {
    const casesRoot = config.casesRoot ?? 'cases/';
    basePath = `${casesRoot}${type}/${moduleKey}/`;
  }
  if (version && mod.versioned === true) {
    const versionSegment = version.startsWith('v') ? version : `v${version}`;
    return `${basePath}${versionSegment}/`;
  }
  return basePath;
}

/**
 * Guard: require config.modules to be non-empty.
 * Throws with guidance when empty.
 * @param {object} [config]
 * @returns {string[]} Module key array
 */
export function requireNonEmptyModules(config = loadConfig()) {
  const keys = Object.keys(config.modules ?? {});
  if (keys.length === 0) {
    throw new Error(
      'config.modules is empty. Please run /using-qa-flow init to configure your project modules.'
    );
  }
  return keys;
}

// ────────────────────────────────────────────────────────────────────────────
// Path helpers
// ────────────────────────────────────────────────────────────────────────────

/** 获取工作空间根目录（绝对路径） */
export function getWorkspaceRoot() {
  return resolve(__dirname, "../../..");
}

/** 解析工作空间相对路径为绝对路径 */
export function resolveWorkspacePath(relativePath) {
  return resolve(getWorkspaceRoot(), relativePath);
}

/**
 * 获取 branch mapping 文件路径（GEN-01: 读取 config.branchMapping）。
 * Returns null if config.branchMapping is not set.
 * @returns {string|null} Absolute path or null
 */
export function getBranchMappingPath() {
  const config = loadConfig();
  // config.branchMapping is the canonical field (was config.repoBranchMapping)
  const mappingPath = config.branchMapping ?? null;
  if (!mappingPath) return null;
  return resolveWorkspacePath(mappingPath);
}

/**
 * @deprecated Use getBranchMappingPath() instead.
 * Kept as a transitional alias during migration so callers using
 * getRepoBranchMappingPath() don't break immediately.
 */
export function getRepoBranchMappingPath() {
  return getBranchMappingPath();
}

// ────────────────────────────────────────────────────────────────────────────
// Integration helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * 获取 integration 配置（如 lanhuMcp）。
 * @param {string} name - Integration name
 * @returns {object|null} Integration config or null
 */
export function getIntegrationConfig(name) {
  return loadConfig().integrations?.[name] ?? null;
}
