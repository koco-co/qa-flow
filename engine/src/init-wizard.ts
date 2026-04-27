#!/usr/bin/env bun
/**
 * init-wizard.ts — kata 环境检查工具
 *
 * Subcommands:
 *   scan    — check project environment, output JSON
 *   verify  — same checks as status table JSON
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { initEnv } from "./lib/env.ts";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function repoRoot(): string {
  // This file is at .claude/scripts/init-wizard.ts
  // 3 levels up → repo root
  return resolve(fileURLToPath(import.meta.url), "../../..");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PluginJson {
  name: string;
  description?: string;
  env_required?: string[];
  env_required_any?: string[];
}

interface PluginStatus {
  name: string;
  active: boolean;
  env_missing?: string[];
}

interface RepoEntry {
  group: string;
  repo: string;
  path: string;
}

interface ScanResult {
  node_version: string;
  node_ok: boolean;
  deps_installed: boolean;
  workspace_exists: boolean;
  env_configured: boolean;
  plugins: PluginStatus[];
  repos: RepoEntry[];
  projects: string[];
  issues: string[];
}

interface CheckEntry {
  name: string;
  status: "pass" | "fail" | "skip";
  detail: string;
}

interface VerifyResult {
  checks: CheckEntry[];
  all_pass: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseNodeMajor(version: string): number {
  // version looks like "v22.0.0"
  const match = version.match(/^v?(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function scanPlugins(root: string): PluginStatus[] {
  const pluginsPath = join(root, "plugins");
  if (!existsSync(pluginsPath)) return [];

  const results: PluginStatus[] = [];

  let entries: string[] = [];
  try {
    entries = readdirSync(pluginsPath);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const pluginJsonPath = join(pluginsPath, entry, "plugin.json");
    if (!existsSync(pluginJsonPath)) continue;

    let plugin: PluginJson;
    try {
      plugin = JSON.parse(readFileSync(pluginJsonPath, "utf8")) as PluginJson;
    } catch {
      process.stderr.write(`[warn] Failed to parse ${pluginJsonPath}\n`);
      continue;
    }

    const name = plugin.name ?? entry;

    // Check env_required — ALL must be set and non-empty
    if (plugin.env_required && plugin.env_required.length > 0) {
      const missing = plugin.env_required.filter((k) => !process.env[k]);
      if (missing.length > 0) {
        results.push({ name, active: false, env_missing: missing });
        continue;
      }
      results.push({ name, active: true });
      continue;
    }

    // Check env_required_any — ANY one must be set and non-empty
    if (plugin.env_required_any && plugin.env_required_any.length > 0) {
      const anySet = plugin.env_required_any.some((k) => !!process.env[k]);
      if (!anySet) {
        results.push({
          name,
          active: false,
          env_missing: plugin.env_required_any,
        });
        continue;
      }
      results.push({ name, active: true });
      continue;
    }

    // No env requirements → always active
    results.push({ name, active: true });
  }

  return results;
}

function scanRepos(root: string): RepoEntry[] {
  const reposPath = join(root, "workspace", ".repos");
  if (!existsSync(reposPath)) return [];

  const repos: RepoEntry[] = [];

  let groups: string[] = [];
  try {
    groups = readdirSync(reposPath);
  } catch {
    return [];
  }

  for (const group of groups) {
    const groupPath = join(reposPath, group);
    try {
      if (!statSync(groupPath).isDirectory()) continue;
    } catch {
      continue;
    }

    let repoNames: string[] = [];
    try {
      repoNames = readdirSync(groupPath);
    } catch {
      continue;
    }

    for (const repo of repoNames) {
      const repoPath = join(groupPath, repo);
      try {
        if (!statSync(repoPath).isDirectory()) continue;
      } catch {
        continue;
      }
      repos.push({ group, repo, path: repoPath });
    }
  }

  return repos;
}

function isEnvConfigured(root: string): boolean {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return false;
  try {
    const content = readFileSync(envPath, "utf8").trim();
    return content.length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// scan subcommand
// ---------------------------------------------------------------------------

function runScan(): ScanResult {
  const root = repoRoot();

  // Load .env before checking plugin env vars
  try {
    initEnv(join(root, ".env"));
  } catch {
    // .env might not exist — that's fine, it's one of the checks
  }

  const nodeVersion = process.version;
  const nodeMajor = parseNodeMajor(nodeVersion);
  const nodeOk = nodeMajor >= 22;

  const depsInstalled = existsSync(join(root, "node_modules"));
  const wsDir = join(root, "workspace");
  const workspaceExists = existsSync(wsDir);
  const projects = workspaceExists
    ? readdirSync(wsDir).filter((name) => {
        if (name.startsWith(".")) return false;
        try {
          return statSync(join(wsDir, name)).isDirectory();
        } catch {
          return false;
        }
      })
    : [];
  const envConfigured = isEnvConfigured(root);

  const plugins = scanPlugins(root);
  const repos = scanRepos(root);

  const issues: string[] = [];
  if (!nodeOk) {
    issues.push(`Node.js ${nodeVersion} is below the required v22`);
  }
  if (!depsInstalled) {
    issues.push("node_modules/ not found — run: bun install");
  }
  if (!workspaceExists) {
    issues.push("workspace/ directory not found — see INSTALL.md for setup instructions");
  }
  if (!envConfigured) {
    issues.push(
      ".env file is missing or empty — copy .env.example and fill in values",
    );
  }

  return {
    node_version: nodeVersion,
    node_ok: nodeOk,
    deps_installed: depsInstalled,
    workspace_exists: workspaceExists,
    env_configured: envConfigured,
    plugins,
    repos,
    projects,
    issues,
  };
}

// ---------------------------------------------------------------------------
// verify subcommand
// ---------------------------------------------------------------------------

function runVerify(): VerifyResult {
  const scan = runScan();

  const checks: CheckEntry[] = [
    {
      name: "Node.js",
      status: scan.node_ok ? "pass" : "fail",
      detail: scan.node_ok
        ? scan.node_version
        : `${scan.node_version}（需要 v22+）`,
    },
    {
      name: "依赖安装",
      status: scan.deps_installed ? "pass" : "fail",
      detail: scan.deps_installed
        ? "node_modules/ 存在"
        : "node_modules/ 不存在，请运行 bun install",
    },
    {
      name: "工作区",
      status: scan.workspace_exists ? "pass" : "fail",
      detail: scan.workspace_exists
        ? "workspace/ 存在"
        : "workspace/ 不存在，请参考 INSTALL.md",
    },
    {
      name: ".env 配置",
      status: scan.env_configured ? "pass" : "fail",
      detail: scan.env_configured
        ? ".env 文件已配置"
        : ".env 文件缺失或为空，请参考 .env.example",
    },
  ];

  // Plugin checks — optional (skip is not used here, but inactive is a soft warning)
  for (const plugin of scan.plugins) {
    checks.push({
      name: `插件: ${plugin.name}`,
      status: plugin.active ? "pass" : "skip",
      detail: plugin.active
        ? "已激活"
        : `未激活（缺少环境变量：${(plugin.env_missing ?? []).join(", ")}）`,
    });
  }

  // Repos — informational
  if (scan.repos.length > 0) {
    checks.push({
      name: "源码仓库",
      status: "pass",
      detail: `已挂载 ${scan.repos.length} 个仓库：${scan.repos.map((r) => `${r.group}/${r.repo}`).join(", ")}`,
    });
  } else {
    checks.push({
      name: "源码仓库",
      status: "skip",
      detail: "workspace/{project}/.repos/ 下无仓库（可选）",
    });
  }

  // all_pass: only mandatory checks (first 4) must pass
  const mandatory = checks.slice(0, 4);
  const allPass = mandatory.every((c) => c.status === "pass");

  return { checks, all_pass: allPass };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name("init-wizard")
  .description("kata v2.0 环境检查工具")
  .version("2.0.0");

program
  .command("scan")
  .description("扫描项目环境并输出 JSON 结果")
  .action(() => {
    try {
      const result = runScan();
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } catch (error) {
      process.stderr.write(`[error] scan failed: ${String(error)}\n`);
      process.exit(1);
    }
  });

program
  .command("verify")
  .description("以状态表格式输出环境检查结果")
  .action(() => {
    try {
      const result = runVerify();
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } catch (error) {
      process.stderr.write(`[error] verify failed: ${String(error)}\n`);
      process.exit(1);
    }
  });

program.parse(process.argv);
