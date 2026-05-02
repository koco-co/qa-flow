#!/usr/bin/env bun
/**
 * task-state-cli.ts — .task-state.json CLI 工具
 *
 * 供 script-case-agent 从 Bash 调用，读取/认领/更新任务状态。
 *
 * 用法：
 *   bun run engine/src/ui-autotest/task-state-cli.ts read <tests_dir>
 *   bun run engine/src/ui-autotest/task-state-cli.ts claim <tests_dir> <agent_name>
 *   bun run engine/src/ui-autotest/task-state-cli.ts update <tests_dir> <task_id> <json_patch>
 *   bun run engine/src/ui-autotest/task-state-cli.ts resume <tests_dir>
 *   bun run engine/src/ui-autotest/task-state-cli.ts stats <tests_dir>
 */

import { readFileSync } from "node:fs";
import { Command } from "commander";
import {
  readTaskState,
  claimPendingTask,
  updateTask,
  detectResume,
  calcStats,
  recordFlakyRun,
  getFlakyTasks,
} from "./task-state.ts";
import type { TaskItem } from "./task-state.ts";

function program(): Command {
  const cli = new Command()
    .name("task-state")
    .description(".task-state.json CLI 工具");

  cli
    .command("read <tests_dir>")
    .description("读取并输出 .task-state.json 摘要")
    .action((testsDir: string) => {
      const state = readTaskState(testsDir);
      if (!state) {
        process.stderr.write("[task-state] 文件不存在\n");
        process.exit(1);
      }
      process.stdout.write(JSON.stringify(state, null, 2));
    });

  cli
    .command("stats <tests_dir>")
    .description("输出任务统计摘要（JSON）")
    .action((testsDir: string) => {
      const state = readTaskState(testsDir);
      if (!state) {
        process.stderr.write(JSON.stringify({ error: "no state file" }) + "\n");
        process.exit(1);
      }
      process.stdout.write(JSON.stringify(state.stats, null, 2) + "\n");
    });

  cli
    .command("claim <tests_dir> <agent_name>")
    .description("领取下一个 pending 任务")
    .action((testsDir: string, agentName: string) => {
      const result = claimPendingTask(testsDir, agentName);
      if (!result) {
        process.stderr.write("[task-state] 无可用任务\n");
        process.exit(1);
      }
      process.stdout.write(JSON.stringify(result.task, null, 2) + "\n");
    });

  cli
    .command("update <tests_dir> <task_id>")
    .description("更新任务状态（patch 从 stdin 读取 JSON）")
    .action(async (testsDir: string, taskId: string) => {
      let body = "";
      const reader = Bun.stdin.stream().getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        body += decoder.decode(value);
      }
      let patch: Partial<TaskItem>;
      try {
        patch = JSON.parse(body);
      } catch {
        process.stderr.write("[task-state] 无效的 JSON patch\n");
        process.exit(1);
      }
      const state = updateTask(testsDir, taskId, patch);
      if (!state) {
        process.stderr.write("[task-state] 更新失败（任务不存在）\n");
        process.exit(1);
      }
      process.stdout.write(JSON.stringify({ status: "ok" }) + "\n");
    });

  cli
    .command("resume <tests_dir>")
    .description("检测续传状态")
    .action((testsDir: string) => {
      const result = detectResume(testsDir);
      if (!result) {
        process.stdout.write(
          JSON.stringify({ can_resume: false, summary: "无状态文件" }) + "\n",
        );
        return;
      }
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    });

  cli
    .command("record-flaky <tests_dir> <task_id> <status>")
    .description("记录一次 flaky 运行结果（status: pass|fail）")
    .option("--duration <ms>", "执行耗时（毫秒）")
    .option("--error <text>", "错误信息")
    .action((testsDir: string, taskId: string, status: string, opts: { duration?: string; error?: string }) => {
      if (status !== "pass" && status !== "fail") {
        process.stderr.write("[task-state] status 必须为 pass 或 fail\n");
        process.exit(1);
      }
      recordFlakyRun(testsDir, taskId, status, opts.duration ? parseInt(opts.duration, 10) : undefined, opts.error);
      process.stdout.write(JSON.stringify({ status: "ok" }) + "\n");
    });

  cli
    .command("flaky <tests_dir>")
    .description("列出 flaky 任务（pass_rate < 0.7 且运行 >= 5 次）")
    .option("--threshold <n>", "pass_rate 阈值", "0.7")
    .option("--min-runs <n>", "最少运行次数", "5")
    .action((testsDir: string, opts: { threshold?: string; minRuns?: string }) => {
      const flaky = getFlakyTasks(testsDir, opts.threshold ? parseFloat(opts.threshold) : undefined, opts.minRuns ? parseInt(opts.minRuns, 10) : undefined);
      process.stdout.write(JSON.stringify(flaky, null, 2) + "\n");
    });

  return cli;
}

const cli = program();
cli.parse(process.argv);
