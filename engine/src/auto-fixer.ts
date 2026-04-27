#!/usr/bin/env bun
/**
 * auto-fixer.ts — 对 reviewer 审查发现的规则性问题执行自动修正。
 * Usage:
 *   kata-cli auto-fixer fix --input <writer-json> --issues <issues-json> --output <path>
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCli } from "./lib/cli-runner.ts";
import type { IntermediateJson, TestCase, TestStep } from "./lib/types.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Issue {
  rule: string;
  case_path: string;
  description: string;
  manual?: boolean;
}

interface IssuesJson {
  issues: Issue[];
}

interface FixReport {
  fixed: number;
  skipped_manual: number;
  total: number;
}

// ─── Path resolver ────────────────────────────────────────────────────────────

/**
 * Resolves a dot-notation path like "modules[0].pages[0].sub_groups[0].test_cases[1]"
 * and returns the target object along with the parent + key for mutation-free updates.
 */
function resolveCasePath(
  data: IntermediateJson,
  casePath: string,
): TestCase | null {
  try {
    // Parse segments: "modules[0]" -> ["modules", "0"], ".pages[0]" -> ["pages", "0"], etc.
    const segments = casePath
      .replace(/\[(\d+)\]/g, ".$1")
      .split(".")
      .filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = data;
    for (const seg of segments) {
      if (current == null) return null;
      current = current[seg];
    }
    return current as TestCase;
  } catch {
    return null;
  }
}

/**
 * Deeply sets a value at the given dot-notation path, returning a new object
 * (immutable update via structural sharing).
 */
function setAtPath(
  data: IntermediateJson,
  casePath: string,
  updater: (tc: TestCase) => TestCase,
): IntermediateJson {
  const segments = casePath
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function deepSet(obj: any, segs: string[]): any {
    if (segs.length === 0) return updater(obj as TestCase);
    const [head, ...tail] = segs;
    if (Array.isArray(obj)) {
      const idx = Number(head);
      const updated = [...obj];
      updated[idx] = deepSet(obj[idx], tail);
      return updated;
    }
    return { ...obj, [head]: deepSet(obj[head], tail) };
  }

  return deepSet(data, segments) as IntermediateJson;
}

// ─── Fix rules ────────────────────────────────────────────────────────────────

/** FC01: 标题缺少 【Px】 前缀 → 根据 priority 字段补全 */
function fixFC01(tc: TestCase): TestCase {
  const prefix = `【${tc.priority}】`;
  if (tc.title.startsWith(prefix)) return tc;
  // Remove any existing 【...】 prefix first to avoid wrong prefix duplication
  const stripped = tc.title.replace(/^【[^】]+】/, "");
  return { ...tc, title: `${prefix}${stripped}` };
}

/** FC03: 步骤内容匹配 `^(步骤|Step)\s*\d+\s*[:：]` → 移除前缀 */
const STEP_PREFIX_RE = /^(步骤|Step)\s*\d+\s*[:：]\s*/;

function fixFC03(tc: TestCase): TestCase {
  const updatedSteps: TestStep[] = tc.steps.map((s) => ({
    ...s,
    step: s.step.replace(STEP_PREFIX_RE, ""),
  }));
  return { ...tc, steps: updatedSteps };
}

/** F13: 预期结果匹配 `或等[价效].*$|或类似.*$` → 删除匹配部分 */
const FUZZY_FALLBACK_RE = /或等[价效].*$|或类似.*$/;

function fixF13(tc: TestCase): TestCase {
  const updatedSteps: TestStep[] = tc.steps.map((s) => ({
    ...s,
    expected: s.expected.replace(FUZZY_FALLBACK_RE, ""),
  }));
  return { ...tc, steps: updatedSteps };
}

/** F12: 预期结果含 3+ 个分号/逗号分隔子项 → 拆分为 `1)` `2)` 编号格式 */
function fixF12(tc: TestCase): TestCase {
  const updatedSteps: TestStep[] = tc.steps.map((s) => {
    const expected = s.expected;
    // Try semicolons first (Chinese full-width and ASCII), then commas
    const delimiters = [/；|;/, /，|,/];
    for (const delim of delimiters) {
      const parts = expected.split(delim).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        const numbered = parts.map((p, i) => `${i + 1}) ${p}`).join("\n");
        return { ...s, expected: numbered };
      }
    }
    return s;
  });
  return { ...tc, steps: updatedSteps };
}

// ─── Rule dispatch ────────────────────────────────────────────────────────────

const FIXERS: Record<string, (tc: TestCase) => TestCase> = {
  FC01: fixFC01,
  FC03: fixFC03,
  F13: fixF13,
  F12: fixF12,
};

// ─── Core fix logic ───────────────────────────────────────────────────────────

function applyFixes(
  writerData: IntermediateJson,
  issuesData: IssuesJson,
): { result: IntermediateJson; report: FixReport } {
  const { issues } = issuesData;
  let result = writerData;
  let fixed = 0;
  let skipped_manual = 0;

  for (const issue of issues) {
    if (issue.manual) {
      skipped_manual++;
      continue;
    }

    const fixer = FIXERS[issue.rule];
    if (!fixer) continue;

    const target = resolveCasePath(result, issue.case_path);
    if (!target) continue;

    result = setAtPath(result, issue.case_path, fixer);
    fixed++;
  }

  return {
    result,
    report: {
      fixed,
      skipped_manual,
      total: issues.length,
    },
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function runFix(opts: { input: string; issues: string; output: string }): void {
  const inputPath = resolve(opts.input);
  const issuesPath = resolve(opts.issues);
  const outputPath = resolve(opts.output);

  let writerData: IntermediateJson;
  let issuesData: IssuesJson;

  try {
    writerData = JSON.parse(readFileSync(inputPath, "utf8")) as IntermediateJson;
  } catch (error) {
    process.stderr.write(`Error reading writer JSON: ${error}\n`);
    process.exit(1);
  }

  try {
    issuesData = JSON.parse(readFileSync(issuesPath, "utf8")) as IssuesJson;
  } catch (error) {
    process.stderr.write(`Error reading issues JSON: ${error}\n`);
    process.exit(1);
  }

  const { result, report } = applyFixes(writerData, issuesData);

  try {
    writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");
  } catch (error) {
    process.stderr.write(`Error writing output: ${error}\n`);
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(report) + "\n");
}

export const program = createCli({
  name: "auto-fixer",
  description: "对 reviewer 审查发现的规则性问题执行自动修正",
  commands: [
    {
      name: "fix",
      description: "执行自动修正",
      options: [
        { flag: "--input <path>", description: "writer JSON 输入路径", required: true },
        { flag: "--issues <path>", description: "issues JSON 输入路径", required: true },
        { flag: "--output <path>", description: "修正后 JSON 输出路径", required: true },
      ],
      action: runFix,
    },
  ],
});
