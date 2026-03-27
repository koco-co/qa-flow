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

export function getIntegrationConfig(name) {
  return loadConfig().integrations?.[name] ?? null;
}

export function getShortcutPath(name) {
  const shortcut = loadConfig().shortcuts?.[name];
  return shortcut ? resolveWorkspacePath(shortcut) : null;
}
