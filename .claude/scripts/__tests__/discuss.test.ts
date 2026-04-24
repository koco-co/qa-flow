import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

const TMP = join(tmpdir(), `kata-discuss-int-${process.pid}`);
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
      "kata-cli",
      ["discuss", ...args],
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

  it("appends pending_for_pm, updates pending_count and renders §6 checkbox", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const payload = {
      id: "Q3",
      severity: "pending_for_pm",
      question: "是否支持 Kafka 数据源？",
      location: "全局层 → 数据源",
      recommended_option: "否（knowledge/overview.md 默认 spark thrift 2.x）",
      options: [],
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
    assert.equal(data.pending_count, 1);
    assert.equal(data.clarify_count, 0);
    assert.equal(data.auto_defaulted_count, 0);

    const raw = readFileSync(PLAN_ABS, "utf8");
    assert.match(raw, /pending_count: 1/);
    assert.match(raw, /- \[ \] \*\*\[数据源\]\*\* Q3: 是否支持 Kafka/);
    assert.match(raw, /AI 推荐: 否（knowledge\/overview\.md/);
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

describe("discuss read — phase B schema", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("exposes pending_count / handoff_mode / repo_consent defaults after init", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout, code } = runCli(["read", "--project", PROJECT, "--prd", PRD_ABS]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.frontmatter.plan_version, 2);
    assert.equal(data.frontmatter.pending_count, 0);
    assert.equal(data.frontmatter.handoff_mode, null);
    assert.equal(data.frontmatter.repo_consent, null);
  });

  it("exposes pending_count and handoff_mode as top-level convenience fields", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout } = runCli(["read", "--project", PROJECT, "--prd", PRD_ABS]);
    const data = JSON.parse(stdout);
    assert.equal(data.pending_count, 0);
    assert.equal(data.handoff_mode, null);
  });
});

describe("discuss set-strategy", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  const sampleResolution = {
    strategy_id: "S3",
    strategy_name: "历史回归",
    signal_profile: {
      prd_richness: "rich",
      source_availability: "full",
      history_coverage: "strong",
      testability: "high",
    },
    overrides: {},
    resolved_at: "2026-04-18T10:00:00+08:00",
  };

  it("writes strategy into plan.md frontmatter after init", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout, code } = runCli([
      "set-strategy",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--strategy-resolution",
      JSON.stringify(sampleResolution),
    ]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout);
    assert.equal(result.ok, true);
    assert.ok(typeof result.path === "string");

    const raw = readFileSync(PLAN_ABS, "utf8");
    assert.match(raw, /strategy:/);
    assert.match(raw, /S3/);
  });

  it("fails with exit != 0 when plan does not exist (no init)", () => {
    // No init — plan.md is absent
    const { code, stderr } = runCli([
      "set-strategy",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--strategy-resolution",
      JSON.stringify(sampleResolution),
    ]);
    assert.notEqual(code, 0);
    assert.match(stderr, /plan not found/i);
  });

  it("rejects invalid strategy resolution JSON", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code, stderr } = runCli([
      "set-strategy",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--strategy-resolution",
      "{not valid json",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /invalid strategy resolution JSON/);
  });
});

describe("discuss init — phase B template shape", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("renders §1 summary with 4 subsections", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const raw = readFileSync(PLAN_ABS, "utf8");
    assert.match(raw, /### 背景/);
    assert.match(raw, /### 痛点/);
    assert.match(raw, /### 目标/);
    assert.match(raw, /### 成功标准/);
  });

  it("renders §2 self-check table with global and functional layers", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const raw = readFileSync(PLAN_ABS, "utf8");
    assert.match(raw, /### 全局层（4 维度）/);
    assert.match(raw, /### 功能层（6 维度）/);
    // 全局层维度
    assert.match(raw, /\| 数据源 \|/);
    assert.match(raw, /\| 历史数据 \|/);
    assert.match(raw, /\| 测试范围 \|/);
    assert.match(raw, /\| PRD 合理性 \|/);
    // 功能层维度保留
    assert.match(raw, /\| 字段定义 \|/);
    assert.match(raw, /\| 异常处理 \|/);
  });

  it("renders §6 pending placeholder and §7 downstream hints", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const raw = readFileSync(PLAN_ABS, "utf8");
    assert.match(raw, /## 6\. 待定清单（pending_for_pm）/);
    assert.match(raw, /<!-- pending:begin -->/);
    assert.match(raw, /<!-- pending:end -->/);
    assert.match(raw, /## 7\. 下游节点 hint/);
  });
});

describe("discuss complete — handoff mode", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("stores handoff_mode=current in frontmatter", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout, code } = runCli([
      "complete",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--handoff-mode",
      "current",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.status, "ready");
    assert.equal(data.handoff_mode, "current");
    const raw = readFileSync(PLAN_ABS, "utf8");
    assert.match(raw, /handoff_mode: current/);
  });

  it("stores handoff_mode=new", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout } = runCli([
      "complete",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--handoff-mode",
      "new",
    ]);
    const data = JSON.parse(stdout);
    assert.equal(data.handoff_mode, "new");
  });

  it("rejects invalid --handoff-mode value", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code, stderr } = runCli([
      "complete",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--handoff-mode",
      "bogus",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /handoff-mode must be/);
  });

  it("complete without --handoff-mode keeps handoff_mode=null", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout } = runCli(["complete", "--project", PROJECT, "--prd", PRD_ABS]);
    const data = JSON.parse(stdout);
    assert.equal(data.handoff_mode, null);
  });

  it("allows completing with pending_for_pm entries (does not block)", () => {
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
        severity: "pending_for_pm",
        question: "Kafka?",
        location: "全局层 → 数据源",
        recommended_option: "否",
        options: [],
      }),
    ]);
    const { code, stdout } = runCli([
      "complete",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--handoff-mode",
      "current",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.status, "ready");
    assert.equal(data.blocking_remaining, 0);
  });

  it("exits 1 when blocking unanswered remains, regardless of --handoff-mode", () => {
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
        question: "?",
        location: "功能层 → 字段定义",
        recommended_option: "A",
        options: [{ id: "A", description: "x" }],
      }),
    ]);
    const { code, stderr } = runCli([
      "complete",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--handoff-mode",
      "current",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /blocking_unknown/);
  });
});

describe("discuss set-repo-consent", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("writes repo_consent into frontmatter with multiple repos", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const consent = {
      repos: [
        { path: "workspace/p/.repos/studio", branch: "master", sha: "abc123" },
        { path: "workspace/p/.repos/backend", branch: "main" },
      ],
      granted_at: "2026-04-24T10:01:00+08:00",
    };
    const { stdout, code } = runCli([
      "set-repo-consent",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify(consent),
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.ok, true);
    assert.equal(data.repos_count, 2);

    const { stdout: read } = runCli(["read", "--project", PROJECT, "--prd", PRD_ABS]);
    const parsed = JSON.parse(read);
    assert.equal(parsed.frontmatter.repo_consent.repos.length, 2);
    assert.equal(parsed.frontmatter.repo_consent.repos[0].path, "workspace/p/.repos/studio");
    assert.equal(parsed.frontmatter.repo_consent.repos[0].sha, "abc123");
    assert.equal(parsed.frontmatter.repo_consent.repos[1].branch, "main");
    assert.equal(parsed.frontmatter.repo_consent.granted_at, "2026-04-24T10:01:00+08:00");
  });

  it("accepts --clear to reset repo_consent to null", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    runCli([
      "set-repo-consent",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify({
        repos: [{ path: "a", branch: "b" }],
        granted_at: "2026-04-24T10:01:00+08:00",
      }),
    ]);
    const { stdout, code } = runCli([
      "set-repo-consent",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--clear",
    ]);
    assert.equal(code, 0);
    const { stdout: read } = runCli(["read", "--project", PROJECT, "--prd", PRD_ABS]);
    assert.equal(JSON.parse(read).frontmatter.repo_consent, null);
  });

  it("rejects malformed content JSON", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code, stderr } = runCli([
      "set-repo-consent",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      "{bad json",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /not valid JSON/);
  });

  it("rejects content missing repos or granted_at", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code, stderr } = runCli([
      "set-repo-consent",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify({ repos: [{ path: "x", branch: "y" }] }),
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /granted_at/);
  });

  it("fails when neither --content nor --clear provided", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code, stderr } = runCli([
      "set-repo-consent",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /--content or --clear/);
  });
});
