#!/usr/bin/env bun
/**
 * strategy-router.ts — 策略路由：SignalProfile → StrategyResolution
 * Usage:
 *   bun run .claude/scripts/strategy-router.ts resolve \
 *     --profile <json-string|@path> \
 *     [--force-strategy S1..S5] \
 *     [--output json|summary]
 */
import { readFileSync } from "node:fs";
import { Command } from "commander";
import {
  buildOverrides,
  composeResolution,
  STRATEGY_NAMES,
  type StrategyId,
  type StrategyResolution,
} from "./lib/strategy-router.ts";
import type { SignalProfile } from "./lib/signal-probe.ts";

const program = new Command("strategy-router");

program
  .command("resolve")
  .description("Resolve a SignalProfile to a StrategyResolution")
  .requiredOption("--profile <json>", "SignalProfile JSON string or @<path>")
  .option("--force-strategy <id>", "Override selected strategy (S1..S5)")
  .option("--output <format>", "Output format: json|summary", "json")
  .action((opts: { profile: string; forceStrategy?: string; output: string }) => {
    // 读取 profile raw
    let raw: string;
    if (opts.profile.startsWith("@")) {
      try {
        raw = readFileSync(opts.profile.slice(1), "utf8");
      } catch (err) {
        process.stderr.write(`[strategy-router] failed to read profile file: ${String(err)}\n`);
        process.exit(1);
        return;
      }
    } else {
      raw = opts.profile;
    }

    // 解析 JSON
    let profile: SignalProfile;
    try {
      profile = JSON.parse(raw) as SignalProfile;
    } catch (err) {
      process.stderr.write(`[strategy-router] invalid profile JSON: ${String(err)}\n`);
      process.exit(1);
      return;
    }

    // 最小校验（避免 undefined access 后报 cryptic 错误）
    if (
      !profile ||
      typeof profile !== "object" ||
      !profile.source ||
      !profile.prd ||
      !profile.history ||
      !profile.knowledge
    ) {
      process.stderr.write(
        "[strategy-router] profile missing required fields (source/prd/history/knowledge)\n",
      );
      process.exit(1);
      return;
    }

    let resolution: StrategyResolution;
    const now = new Date();

    if (opts.forceStrategy) {
      const id = opts.forceStrategy as StrategyId;
      if (!["S1", "S2", "S3", "S4", "S5"].includes(id)) {
        process.stderr.write(
          `[strategy-router] invalid --force-strategy: ${opts.forceStrategy}\n`,
        );
        process.exit(1);
        return;
      }
      const overrides = buildOverrides(id, profile.knowledge.level);
      resolution = {
        strategy_id: id,
        strategy_name: STRATEGY_NAMES[id],
        signal_profile: profile,
        overrides,
        resolved_at: now.toISOString(),
      };
    } else {
      resolution = composeResolution(profile, now);
    }

    if (opts.output === "summary") {
      process.stderr.write(
        `[strategy-router] strategy=${resolution.strategy_id} name=${resolution.strategy_name}\n`,
      );
    }
    process.stdout.write(`${JSON.stringify(resolution, null, 2)}\n`);
  });

program.parse(process.argv);
