import { existsSync } from "fs";
import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import {
  resolveRepoWorkingPath,
  resolveRepoBranchPlan,
  writeRepoBranchPlanToState,
} from "./repo-branch-mapping.mjs";

function parseArgs(argv) {
  const options = {
    sync: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--sync") {
      options.sync = true;
      continue;
    }
    if (arg.startsWith("--")) {
      options[arg.slice(2)] = argv[i + 1];
      i++;
    }
  }

  return options;
}

function runGit(repoPath, args) {
  return spawnSync("git", ["-C", repoPath, ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function syncRepo(repo) {
  if (!repo.path) {
    throw new Error(`repoKey=${repo.repoKey} 未在 .claude/config.json 中配置路径`);
  }
  const repoPath = resolveRepoWorkingPath(repo.path);
  if (!existsSync(repoPath)) {
    throw new Error(`repo 路径不存在: ${repo.path}`);
  }
  if (!repo.branch) {
    return {
      ...repo,
      synced: false,
      skipped: true,
      reason: "未解析到目标分支",
    };
  }

  const commands = [
    ["fetch", "--all", "--prune"],
    ["checkout", repo.branch],
    ["pull", "--ff-only", "origin", repo.branch],
  ];

  for (const args of commands) {
    const result = runGit(repoPath, args);
    if ((result.status ?? 0) !== 0) {
      throw new Error(
        `[${repo.repoKey}] git ${args.join(" ")} 失败: ${result.stderr.trim() || result.stdout.trim()}`,
      );
    }
  }

    return {
      ...repo,
      path: repoPath,
      synced: true,
    };
}

const options = parseArgs(process.argv.slice(2));

if (!options.module) {
  console.error("Usage: node sync-source-repos.mjs --module <moduleKey> [--prd-path <file>] [--raw-text <text>] [--state-file <path>] [--sync]");
  process.exit(1);
}

const rawText = options["raw-text"]
  || (options["prd-path"] ? readFileSync(options["prd-path"], "utf8") : "");

try {
  const plan = resolveRepoBranchPlan({
    moduleKey: options.module,
    rawText,
    requirementName: options["requirement-name"] || "",
    developmentVersion: options["development-version"] || null,
  });

  let output = plan;

  if (options["state-file"]) {
    writeRepoBranchPlanToState(options["state-file"], plan);
  }

  if (options.sync) {
    output = {
      ...plan,
      backend: plan.backend.map(syncRepo),
      frontend: plan.frontend.map(syncRepo),
    };
  }

  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
