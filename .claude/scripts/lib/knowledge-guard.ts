/**
 * knowledge-guard.ts — 知识库写入防护层。
 *
 * 提供四项能力：
 * 1. 冲突检测（term / overview / body-rewrite）
 * 2. 快照（写入前保存原文件到 .history/）
 * 3. 审计日志（.audit.jsonl 每行一条 JSON）
 * 4. 回滚（按 audit 索引恢复对应快照）
 *
 * 不可变：所有函数接受参数返回新值，不在原地修改。
 */

import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { knowledgeDir } from "./paths.ts";

// ── 类型 ────────────────────────────────────────────────────────────────────

export type ConflictSeverity = "block" | "warn";

export interface Conflict {
  severity: ConflictSeverity;
  type: "term" | "overview" | "body";
  reason: string;
  existing?: string;
  incoming?: string;
}

export interface AuditRecord {
  timestamp: string;
  action: "write" | "update" | "rollback";
  type?: string;
  file: string;
  before_hash: string;
  after_hash: string;
  snapshot: string;
  confidence?: string;
  confirmed: boolean;
  forced: boolean;
}

export interface TermShape {
  term: string;
  zh: string;
  desc: string;
  alias: string;
}

const AUDIT_FILE = ".audit.jsonl";
const HISTORY_DIR = ".history";
const BODY_REWRITE_WARN = 0.3;
const BODY_REWRITE_BLOCK = 0.6;

// ── 冲突检测 ────────────────────────────────────────────────────────────────

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 术语冲突：同 term 已存在但 zh/desc 不同。
 * 返回 null 表示无冲突（或术语尚未存在）。
 */
export function detectTermConflict(
  existingBody: string,
  incoming: TermShape,
): Conflict | null {
  const rowPrefix = `| ${incoming.term} |`;
  const lines = existingBody.split("\n");

  for (const line of lines) {
    if (!line.trimStart().startsWith(rowPrefix)) continue;
    const cells = line
      .trim()
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length < 4) continue;
    const [, zh, desc] = cells;
    if (zh === incoming.zh && desc === incoming.desc) return null;
    return {
      severity: "block",
      type: "term",
      reason: `术语 "${incoming.term}" 已存在但内容不同`,
      existing: `zh=${zh} | desc=${desc}`,
      incoming: `zh=${incoming.zh} | desc=${incoming.desc}`,
    };
  }
  return null;
}

/**
 * overview section 冲突：mode=replace 会覆盖已存在的非空 section。
 */
export function detectOverviewConflict(
  existingBody: string,
  section: string,
  incomingBody: string,
  mode: "append" | "replace",
): Conflict | null {
  if (mode !== "replace") return null;

  const lines = existingBody.split("\n");
  const headingRe = new RegExp(`^##\\s+${escapeRegex(section)}\\s*$`);
  let startIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (headingRe.test(lines[i])) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    if (/^#{1,2}\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  const existingSection = lines.slice(startIdx + 1, endIdx).join("\n").trim();
  if (!existingSection) return null;
  if (existingSection === incomingBody.trim()) return null;

  return {
    severity: "block",
    type: "overview",
    reason: `概览 section "${section}" 已存在不同内容（mode=replace 将覆盖）`,
    existing: existingSection.slice(0, 200),
    incoming: incomingBody.slice(0, 200),
  };
}

/**
 * 文件级重大改写：module / pitfall 覆盖时，若差异 > 30% 警告，> 60% 阻断。
 */
export function detectBodyRewrite(
  before: string,
  after: string,
): Conflict | null {
  if (!before.trim()) return null;
  const similarity = jaccardLineSimilarity(before, after);
  const diffRatio = 1 - similarity;
  if (diffRatio < BODY_REWRITE_WARN) return null;
  const severity: ConflictSeverity =
    diffRatio > BODY_REWRITE_BLOCK ? "block" : "warn";
  return {
    severity,
    type: "body",
    reason: `重大改写：内容差异 ${(diffRatio * 100).toFixed(0)}%（warn 阈值 30% / block 阈值 60%）`,
  };
}

function jaccardLineSimilarity(a: string, b: string): number {
  const toLineSet = (text: string): Set<string> =>
    new Set(
      text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    );
  const setA = toLineSet(a);
  const setB = toLineSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const item of setA) if (setB.has(item)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

// ── 快照 + 审计 ─────────────────────────────────────────────────────────────

export function shortHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function todayStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/**
 * 把原文件内容保存到 .history/，返回快照文件名（相对 .history/）。
 * 若原内容为空（新建文件），返回空串，无需回滚点。
 */
export function saveSnapshot(
  project: string,
  absTargetPath: string,
  beforeContent: string,
): string {
  if (!beforeContent) return "";
  const kdir = knowledgeDir(project);
  const historyDir = join(kdir, HISTORY_DIR);
  mkdirSync(historyDir, { recursive: true });

  const rel = absTargetPath.startsWith(kdir)
    ? absTargetPath.slice(kdir.length + 1)
    : absTargetPath;
  const flat = rel.replace(/[\\/]/g, "__");
  const snapshotName = `${todayStamp()}__${flat}__${shortHash(beforeContent)}.bak`;
  writeFileSync(join(historyDir, snapshotName), beforeContent);
  return snapshotName;
}

export function appendAudit(project: string, record: AuditRecord): void {
  const kdir = knowledgeDir(project);
  mkdirSync(kdir, { recursive: true });
  appendFileSync(join(kdir, AUDIT_FILE), `${JSON.stringify(record)}\n`);
}

export function readAuditLog(project: string): AuditRecord[] {
  const auditPath = join(knowledgeDir(project), AUDIT_FILE);
  if (!existsSync(auditPath)) return [];
  const text = readFileSync(auditPath, "utf8");
  const records: AuditRecord[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed) as AuditRecord);
    } catch {
      // 容错：跳过损坏行
    }
  }
  return records;
}

export function readSnapshot(project: string, snapshotName: string): string {
  const snapshotPath = join(knowledgeDir(project), HISTORY_DIR, snapshotName);
  if (!existsSync(snapshotPath)) {
    throw new Error(`Snapshot not found: ${snapshotName}`);
  }
  return readFileSync(snapshotPath, "utf8");
}

export function buildAuditRecord(params: {
  action: AuditRecord["action"];
  type?: string;
  file: string;
  before: string;
  after: string;
  snapshot: string;
  confidence?: string;
  confirmed: boolean;
  forced: boolean;
}): AuditRecord {
  return {
    timestamp: new Date().toISOString(),
    action: params.action,
    type: params.type,
    file: params.file,
    before_hash: params.before ? shortHash(params.before) : "",
    after_hash: params.after ? shortHash(params.after) : "",
    snapshot: params.snapshot,
    confidence: params.confidence,
    confirmed: params.confirmed,
    forced: params.forced,
  };
}
