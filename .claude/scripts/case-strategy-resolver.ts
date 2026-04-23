#!/usr/bin/env bun
/**
 * case-strategy-resolver.ts — 策略路由：SignalProfile → StrategyResolution
 * Usage:
 *   kata-cli case-strategy-resolver resolve \
 *     --profile <json-string|@path> \
 *     [--force-strategy S1..S5] \
 *     [--output json|summary]
 */
import { readFileSync } from "node:fs";
import { createCli } from "./lib/cli-runner.ts";
import {
  buildOverrides,
  composeResolution,
  STRATEGY_NAMES,
  type StrategyId,
  type StrategyResolution,
} from "./lib/strategy-router.ts";
import type { SignalProfile } from "./lib/signal-probe.ts";

function runResolve(opts: { profile: string; forceStrategy?: string; output: string }): void {
  // 读取 profile raw
  let raw: string;
  if (opts.profile.startsWith("@")) {
    try {
      raw = readFileSync(opts.profile.slice(1), "utf8");
    } catch (err) {
      process.stderr.write(`[case-strategy-resolver] failed to read profile file: ${String(err)}\n`);
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
    process.stderr.write(`[case-strategy-resolver] invalid profile JSON: ${String(err)}\n`);
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
      "[case-strategy-resolver] profile missing required fields (source/prd/history/knowledge)\n",
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
        `[case-strategy-resolver] invalid --force-strategy: ${opts.forceStrategy}\n`,
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
      `[case-strategy-resolver] strategy=${resolution.strategy_id} name=${resolution.strategy_name}\n`,
    );
  }
  process.stdout.write(`${JSON.stringify(resolution, null, 2)}\n`);
}

export const program = createCli({
  name: "case-strategy-resolver",
  description: "策略路由：SignalProfile → StrategyResolution",
  commands: [
    {
      name: "resolve",
      description: "Resolve a SignalProfile to a StrategyResolution",
      options: [
        {
          flag: "--profile <json>",
          description: "SignalProfile JSON string or @<path>",
          required: true,
        },
        {
          flag: "--force-strategy <id>",
          description: "Override selected strategy (S1..S5)",
        },
        {
          flag: "--output <format>",
          description: "Output format: json|summary",
          defaultValue: "json",
        },
      ],
      action: runResolve,
    },
  ],
});
