import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

const TMP = join(tmpdir(), `qa-flow-discuss-int-${process.pid}`);
const WORKSPACE_DIR = join(TMP, "workspace");
const REPO_ROOT = resolve(import.meta.dirname, "../../..");

const PROJECT = "discuss-fixture";
const YYYYMM = "202604";
const SLUG = "smoke-need";
const PRD_REL = `${PROJECT}/prds/${YYYYMM}/${SLUG}.md`;
const PRD_ABS = join(WORKSPACE_DIR, PRD_REL);
const PRD_DIR = join(WORKSPACE_DIR, PROJECT, "prds", YYYYMM);
const PLAN_ABS = join(PRD_DIR, `${SLUG}.plan.md`);

function runCli(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "bun",
      ["run", ".claude/scripts/discuss.ts", ...args],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          WORKSPACE_DIR,
        },
      },
    );
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      code: e.status ?? 1,
    };
  }
}

function writePrd(content?: string): void {
  mkdirSync(PRD_DIR, { recursive: true });
  writeFileSync(
    PRD_ABS,
    content ??
      [
        "---",
        "requirement_id: 99999",
        "requirement_name: 烟雾需求",
        "---",
        "# 烟雾需求",
        "",
      ].join("\n"),
  );
}

function resetFixture(): void {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(WORKSPACE_DIR, { recursive: true });
  writePrd();
}

describe("discuss init", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("creates plan.md with status=discussing", () => {
    const { stdout, code } = runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.status, "discussing");
    assert.equal(data.resume_anchor, "discuss-in-progress");
    assert.equal(data.prd_slug, SLUG);
    assert.equal(data.yyyymm, YYYYMM);
    assert.ok(existsSync(PLAN_ABS));
  });

  it("rejects second init without --force", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code, stderr } = runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    assert.equal(code, 1);
    assert.match(stderr, /already exists/);
  });

  it("backs up existing plan when --force is set", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code } = runCli(["init", "--project", PROJECT, "--prd", PRD_ABS, "--force"]);
    assert.equal(code, 0);
    const files = readdirSync(PRD_DIR).filter((f) => f.startsWith(`${SLUG}.plan`));
    // expect at least one backup file (.plan.<ts>.md) plus the new .plan.md
    const backups = files.filter((f) => f !== `${SLUG}.plan.md`);
    assert.ok(backups.length >= 1, `expected backup, got ${files.join(",")}`);
    assert.ok(files.includes(`${SLUG}.plan.md`));
  });

  it("fails when PRD parent directory is not YYYYMM", () => {
    const badPrd = join(WORKSPACE_DIR, PROJECT, "prds", "not-a-date", `${SLUG}.md`);
    mkdirSync(join(WORKSPACE_DIR, PROJECT, "prds", "not-a-date"), { recursive: true });
    writeFileSync(badPrd, "# stub\n");
    const { code, stderr } = runCli(["init", "--project", PROJECT, "--prd", badPrd]);
    assert.equal(code, 1);
    assert.match(stderr, /YYYYMM/);
  });
});

describe("discuss read", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("returns full plan structure after init", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout, code } = runCli(["read", "--project", PROJECT, "--prd", PRD_ABS]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.frontmatter.status, "discussing");
    assert.equal(data.frontmatter.requirement_id, "99999");
    assert.equal(data.frontmatter.requirement_name, "烟雾需求");
    assert.deepEqual(data.clarifications, []);
    assert.equal(data.schema_valid, true);
    assert.deepEqual(data.schema_errors, []);
  });

  it("fails with exit 1 when plan not found", () => {
    const { code, stderr } = runCli(["read", "--project", PROJECT, "--prd", PRD_ABS]);
    assert.equal(code, 1);
    assert.match(stderr, /Plan not found/);
  });
});

describe("discuss append-clarify", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("appends a blocking clarification with answer and bumps clarify_count", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const payload = {
      id: "Q1",
      severity: "blocking_unknown",
      question: "字段是否包含已驳回？",
      location: "审批列表 → 字段定义",
      recommended_option: "B",
      options: [
        { id: "A", description: "仅待审批/已通过" },
        { id: "B", description: "包含已驳回" },
      ],
      user_answer: {
        selected_option: "B",
        value: "包含已驳回",
        answered_at: "2026-04-18T11:00:00+08:00",
      },
    };
    const { stdout, code } = runCli([
      "append-clarify",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify(payload),
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.action, "appended");
    assert.equal(data.clarify_count, 1);
    assert.equal(data.discussion_rounds, 1);
  });

  it("appends defaultable and increments auto_defaulted_count", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const payload = {
      id: "Q2",
      severity: "defaultable_unknown",
      question: "默认排序？",
      location: "列表页 → 交互逻辑",
      recommended_option: "A",
      options: [{ id: "A", description: "创建时间倒序" }],
      default_policy: "采用 source 接口默认",
    };
    const { stdout } = runCli([
      "append-clarify",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify(payload),
    ]);
    const data = JSON.parse(stdout);
    assert.equal(data.auto_defaulted_count, 1);
    assert.equal(data.clarify_count, 0);
  });

  it("rejects malformed --content JSON", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code, stderr } = runCli([
      "append-clarify",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      "{not json",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /not valid JSON/);
  });

  it("rejects clarification missing required fields", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code, stderr } = runCli([
      "append-clarify",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify({ id: "Q1" }),
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /must include/);
  });
});

describe("discuss complete", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("succeeds when all blocking are answered", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    runCli([
      "append-clarify",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify({
        id: "Q1",
        severity: "blocking_unknown",
        question: "Q?",
        location: "字段定义 → x",
        recommended_option: "A",
        options: [{ id: "A", description: "x" }],
        user_answer: { selected_option: "A", value: "x", answered_at: "2026-04-18T11:00:00+08:00" },
      }),
    ]);
    const { stdout, code } = runCli(["complete", "--project", PROJECT, "--prd", PRD_ABS]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.status, "ready");
    assert.equal(data.resume_anchor, "discuss-completed");
    assert.equal(data.blocking_remaining, 0);
  });

  it("rejects when blocking remains unanswered", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    runCli([
      "append-clarify",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify({
        id: "Q1",
        severity: "blocking_unknown",
        question: "Q?",
        location: "字段定义 → x",
        recommended_option: "A",
        options: [{ id: "A", description: "x" }],
      }),
    ]);
    const { code, stderr } = runCli(["complete", "--project", PROJECT, "--prd", PRD_ABS]);
    assert.equal(code, 1);
    assert.match(stderr, /blocking_unknown/);
  });

  it("writes knowledge_summary into frontmatter", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const ks = JSON.stringify([
      { type: "term", name: "smoke-term" },
      { type: "pitfall", name: "smoke-pitfall" },
    ]);
    runCli([
      "complete",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--knowledge-summary",
      ks,
    ]);
    const raw = readFileSync(PLAN_ABS, "utf8");
    assert.match(raw, /knowledge_dropped:/);
    assert.match(raw, /name: smoke-term/);
    assert.match(raw, /name: smoke-pitfall/);
  });
});

describe("discuss reset", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("backs up plan and removes original", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout, code } = runCli(["reset", "--project", PROJECT, "--prd", PRD_ABS]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.match(data.backup_path, /smoke-need\.plan\.[^/]+\.md$/);
    assert.equal(existsSync(PLAN_ABS), false);
    assert.ok(existsSync(data.backup_path));
    // PRD itself must remain
    assert.ok(existsSync(PRD_ABS));
  });

  it("fails when no plan to reset", () => {
    const { code, stderr } = runCli(["reset", "--project", PROJECT, "--prd", PRD_ABS]);
    assert.equal(code, 1);
    assert.match(stderr, /Plan not found/);
  });
});
