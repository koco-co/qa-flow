#!/usr/bin/env bun
/**
 * discuss.ts — PRD 需求讨论 enhanced.md 管理 CLI (v2)
 *
 * Usage:
 *   kata-cli discuss <action> --project <name> --yyyymm <ym> --prd-slug <slug> [...]
 * Actions: init | read | set-status | set-section | add-section | set-source-facts |
 *          add-pending | resolve | list-pending | compact | validate
 */

import { readFileSync } from "node:fs";
import { createCli } from "./lib/cli-runner.ts";
import {
  initDoc,
  readDoc,
  setStatus,
  setSection,
  addSection,
  setSourceFacts,
  addPending,
  resolvePending,
  listPending,
  compactDoc,
  validateDoc,
} from "./lib/enhanced-doc-store.ts";

// ============================================================================
// CLI wiring
// ============================================================================

export const program = createCli({
  name: "discuss",
  description: "PRD 需求讨论 enhanced.md 管理 CLI (v2)",
  commands: [
    {
      name: "init",
      description: "创建 enhanced.md 骨架",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份 YYYYMM", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string }) => {
        initDoc(opts.project, opts.yyyymm, opts.prdSlug);
        process.stdout.write(JSON.stringify({ ok: true }) + "\n");
      },
    },
    {
      name: "read",
      description: "读取 enhanced.md",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string }) => {
        const doc = readDoc(opts.project, opts.yyyymm, opts.prdSlug);
        process.stdout.write(JSON.stringify(doc) + "\n");
      },
    },
    {
      name: "set-status",
      description: "切换 frontmatter.status",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--status <s>", description: "新状态", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string; status: string }) => {
        setStatus(opts.project, opts.yyyymm, opts.prdSlug, opts.status as any);
        process.stdout.write(JSON.stringify({ ok: true }) + "\n");
      },
    },
    {
      name: "set-section",
      description: "按锚点替换小节正文",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--anchor <a>", description: "目标锚点", required: true },
        { flag: "--content <str>", description: "Markdown 正文", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string; anchor: string; content: string }) => {
        setSection(opts.project, opts.yyyymm, opts.prdSlug, opts.anchor, opts.content);
        process.stdout.write(JSON.stringify({ ok: true }) + "\n");
      },
    },
    {
      name: "add-section",
      description: "在 §2 或 §3 下新增小节",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--parent-level <n>", description: "2 或 3", required: true },
        { flag: "--title <s>", description: "小节标题", required: true },
        { flag: "--body <s>", description: "小节正文", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string; parentLevel: string; title: string; body: string }) => {
        const anchor = addSection(opts.project, opts.yyyymm, opts.prdSlug, {
          parentLevel: Number(opts.parentLevel) as 2 | 3,
          title: opts.title,
          body: opts.body,
        });
        process.stdout.write(JSON.stringify({ anchor }) + "\n");
      },
    },
    {
      name: "set-source-facts",
      description: "写入 Appendix A 源码事实表（自动外溢 >64KB）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--content <json>", description: "SourceFacts JSON 或 @<path>", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string; content: string }) => {
        const raw = opts.content.startsWith("@")
          ? readFileSync(opts.content.slice(1), "utf8")
          : opts.content;
        setSourceFacts(opts.project, opts.yyyymm, opts.prdSlug, JSON.parse(raw));
        process.stdout.write(JSON.stringify({ ok: true }) + "\n");
      },
    },
    {
      name: "add-pending",
      description: "新增待确认项 Q",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--location <anchor>", description: "锚点", required: true },
        { flag: "--label <s>", description: "位置标签", required: true },
        { flag: "--question <s>", description: "问题文本", required: true },
        { flag: "--recommended <s>", description: "推荐方案", required: true },
        { flag: "--expected <s>", description: "预期", required: true },
        { flag: "--severity <s>", description: "blocking_unknown | defaultable_unknown | pending_for_pm", required: true },
      ],
      action: (opts: any) => {
        const id = addPending(opts.project, opts.yyyymm, opts.prdSlug, {
          locationAnchor: opts.location,
          locationLabel: opts.label,
          question: opts.question,
          recommended: opts.recommended,
          expected: opts.expected,
          severity: opts.severity,
        });
        process.stdout.write(JSON.stringify({ id }) + "\n");
      },
    },
    {
      name: "resolve",
      description: "解决一条 Q（套 <del>）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--id <qid>", description: "Q ID (q1, q2, ...)", required: true },
        { flag: "--answer <s>", description: "回答", required: true },
        { flag: "--as-default", description: "标记为默认采用", defaultValue: false },
      ],
      action: (opts: any) => {
        resolvePending(opts.project, opts.yyyymm, opts.prdSlug, opts.id, {
          answer: opts.answer,
          asDefault: !!opts.asDefault,
        });
        process.stdout.write(JSON.stringify({ ok: true }) + "\n");
      },
    },
    {
      name: "list-pending",
      description: "列出待确认项",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--format <f>", description: "json | table", defaultValue: "json" },
        { flag: "--include-resolved", description: "包含已解决", defaultValue: false },
      ],
      action: (opts: any) => {
        const items = listPending(opts.project, opts.yyyymm, opts.prdSlug, {
          includeResolved: !!opts.includeResolved,
        });
        if (opts.format === "table") {
          for (const it of items) {
            process.stdout.write(`${it.id}\t${it.status}\t${it.question}\n`);
          }
        } else {
          process.stdout.write(JSON.stringify(items) + "\n");
        }
      },
    },
    {
      name: "compact",
      description: "归档 resolved Q 到 resolved.md",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--threshold <n>", description: "阈值", defaultValue: "50" },
      ],
      action: (opts: any) => {
        const moved = compactDoc(opts.project, opts.yyyymm, opts.prdSlug, {
          threshold: Number(opts.threshold),
        });
        process.stdout.write(JSON.stringify({ moved }) + "\n");
      },
    },
    {
      name: "validate",
      description: "校验 enhanced.md 完整性",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--require-zero-pending", description: "pending>0 则退 3", defaultValue: false },
        { flag: "--check-source-refs <csv>", description: "逗号分隔的 source_ref 列表", defaultValue: "" },
      ],
      action: (opts: any) => {
        const r = validateDoc(opts.project, opts.yyyymm, opts.prdSlug, {
          requireZeroPending: !!opts.requireZeroPending,
          checkSourceRefs: opts.checkSourceRefs ? opts.checkSourceRefs.split(",") : undefined,
        });
        process.stdout.write(JSON.stringify(r) + "\n");
        if (!r.ok) {
          const zeroPendingIssue = r.issues.some((i: string) => i.includes("requireZeroPending"));
          process.exit(zeroPendingIssue ? 3 : 1);
        }
      },
    },
  ],
});

if (import.meta.main) {
  program.parseAsync(process.argv);
}
