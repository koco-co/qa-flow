import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { repoRoot } from "../lib/paths.ts";

const CLI = join(repoRoot(), "engine/src/scan-report.ts");

let WS = "";
let REPO = "";
const PROJECT = "scan-cli-test";

function git(args: string, cwd: string): string {
  return execSync(`git -C "${cwd}" ${args}`, { encoding: "utf8" }).trim();
}

beforeEach(() => {
  WS = mkdtempSync(join(tmpdir(), "scan-cli-ws-"));
  process.env.WORKSPACE_DIR = WS;

  // create a fake .repos/{repo} fixture
  REPO = join(WS, PROJECT, ".repos", "demo");
  execSync(`mkdir -p "${REPO}"`);
  execSync(`git init -q -b main "${REPO}"`);
  git('config user.email "t@t.com"', REPO);
  git('config user.name "t"', REPO);
  writeFileSync(join(REPO, "a.txt"), "line1\n");
  git("add a.txt", REPO);
  git('commit -q -m initial', REPO);
  git("checkout -q -b release_6.3.x", REPO);
  git("checkout -q -b release_6.3.0_dev main", REPO);
  writeFileSync(join(REPO, "a.txt"), "line1\nline2\n");
  git("add a.txt", REPO);
  git('commit -q -m head', REPO);
});

afterEach(() => {
  rmSync(WS, { recursive: true, force: true });
  delete process.env.WORKSPACE_DIR;
});

describe("scan-report CLI — create", () => {
  test("create writes meta.json + report.json + diff.patch and prints JSON to stdout", async () => {
    const r = await $`bun ${CLI} create \
      --project ${PROJECT} \
      --repo demo \
      --base-branch release_6.3.x \
      --head-branch release_6.3.0_dev \
      --slug demo-test \
      --skip-fetch`
      .quiet()
      .nothrow();
    expect(r.exitCode).toBe(0);

    const auditRoot = join(WS, PROJECT, "audits");
    const dirs = readdirSync(auditRoot);
    expect(dirs.length).toBe(1);
    const dir = join(auditRoot, dirs[0]);
    expect(existsSync(join(dir, "meta.json"))).toBe(true);
    expect(existsSync(join(dir, "report.json"))).toBe(true);
    expect(existsSync(join(dir, "diff.patch"))).toBe(true);

    const out = JSON.parse(r.stdout.toString());
    expect(out.slug).toBe("demo-test");
    expect(typeof out.diff_files).toBe("number");
    expect(typeof out.diff_lines).toBe("number");
    expect(out.audit_dir).toContain("audits/");

    const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
    expect(meta.repo).toBe("demo");
    expect(meta.base_branch).toBe("release_6.3.x");
    expect(meta.head_branch).toBe("release_6.3.0_dev");
    expect(meta.base_commit.length).toBe(40);
  });

  test("create errors when repo missing", async () => {
    const r = await $`bun ${CLI} create \
      --project ${PROJECT} \
      --repo not-here \
      --base-branch a --head-branch b --slug x --skip-fetch`
      .quiet()
      .nothrow();
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("not found");
  });
});

describe("scan-report CLI — add-bug / remove-bug", () => {
  async function setupAudit(): Promise<{ slug: string; ym: string }> {
    const r = await $`bun ${CLI} create \
      --project ${PROJECT} --repo demo \
      --base-branch release_6.3.x --head-branch release_6.3.0_dev \
      --slug demo-test --skip-fetch`.quiet().nothrow();
    expect(r.exitCode).toBe(0);
    const out = JSON.parse(r.stdout.toString());
    return { slug: out.slug, ym: out.yyyymm };
  }

  function writeBugJson(path: string, override: Record<string, unknown> = {}): void {
    const bug = {
      id: "b-001",
      title: "Default",
      severity: "major",
      type: "logic",
      module: "M",
      location: { file: "a.ts", line: 1 },
      phenomenon: "P", expected: "E", actual: "A",
      reproduction_steps: ["1", "2", "3"],
      root_cause: "R",
      evidence: { diff_hunk: "@@" },
      suggestion: "S",
      confidence: 0.9,
      confidence_reason: "C",
      ...override,
    };
    writeFileSync(path, JSON.stringify(bug));
  }

  test("add-bug auto-assigns next id when --auto-id", async () => {
    const { slug, ym } = await setupAudit();
    const f = join(WS, "bug.json");
    writeBugJson(f, { id: "ignored" });
    const r = await $`bun ${CLI} add-bug \
      --project ${PROJECT} --slug ${slug} --yyyymm ${ym} \
      --json ${f} --auto-id`.quiet().nothrow();
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout.toString()).id).toBe("b-001");
  });

  test("add-bug fails on invalid bug with exit 2", async () => {
    const { slug, ym } = await setupAudit();
    const f = join(WS, "bug.json");
    writeBugJson(f, { confidence: 0.3 });
    const r = await $`bun ${CLI} add-bug \
      --project ${PROJECT} --slug ${slug} --yyyymm ${ym} --json ${f}`
      .quiet().nothrow();
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain("confidence");
  });

  test("remove-bug deletes by id", async () => {
    const { slug, ym } = await setupAudit();
    const f = join(WS, "bug.json");
    writeBugJson(f, { id: "b-001" });
    await $`bun ${CLI} add-bug --project ${PROJECT} --slug ${slug} --yyyymm ${ym} --json ${f}`
      .quiet().nothrow();
    const r = await $`bun ${CLI} remove-bug --project ${PROJECT} --slug ${slug} --yyyymm ${ym} --bug-id b-001`
      .quiet().nothrow();
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout.toString()).removed).toBe("b-001");
  });
});

describe("scan-report CLI — update / set-meta / show", () => {
  async function seedOneBug(): Promise<{ slug: string; ym: string }> {
    const r1 = await $`bun ${CLI} create --project ${PROJECT} --repo demo \
      --base-branch release_6.3.x --head-branch release_6.3.0_dev \
      --slug u-test --skip-fetch`.quiet().nothrow();
    const { slug, yyyymm } = JSON.parse(r1.stdout.toString());

    const f = join(WS, "bug.json");
    writeFileSync(
      f,
      JSON.stringify({
        id: "b-001", title: "T", severity: "major", type: "logic", module: "M",
        location: { file: "a.ts", line: 1 },
        phenomenon: "P", expected: "E", actual: "A",
        reproduction_steps: ["1", "2", "3"],
        root_cause: "R", evidence: { diff_hunk: "@@" },
        suggestion: "S", confidence: 0.9, confidence_reason: "C",
      }),
    );
    await $`bun ${CLI} add-bug --project ${PROJECT} --slug ${slug} --yyyymm ${yyyymm} --json ${f}`
      .quiet().nothrow();
    return { slug, ym: yyyymm };
  }

  test("update-bug top-level field", async () => {
    const { slug, ym } = await seedOneBug();
    const r = await $`bun ${CLI} update-bug --project ${PROJECT} --slug ${slug} --yyyymm ${ym} \
      --bug-id b-001 --field title --value "renamed"`.quiet().nothrow();
    expect(r.exitCode).toBe(0);

    const show = await $`bun ${CLI} show --project ${PROJECT} --slug ${slug} --yyyymm ${ym} --bug-id b-001`
      .quiet().nothrow();
    expect(JSON.parse(show.stdout.toString()).bug.title).toBe("renamed");
  });

  test("update-bug nested location.line", async () => {
    const { slug, ym } = await seedOneBug();
    const r = await $`bun ${CLI} update-bug --project ${PROJECT} --slug ${slug} --yyyymm ${ym} \
      --bug-id b-001 --field location.line --value 999`.quiet().nothrow();
    expect(r.exitCode).toBe(0);
    const show = await $`bun ${CLI} show --project ${PROJECT} --slug ${slug} --yyyymm ${ym} --bug-id b-001`
      .quiet().nothrow();
    expect(JSON.parse(show.stdout.toString()).bug.location.line).toBe(999);
  });

  test("update-bug-steps replaces reproduction_steps", async () => {
    const { slug, ym } = await seedOneBug();
    const sf = join(WS, "steps.json");
    writeFileSync(sf, JSON.stringify(["a", "b", "c", "d"]));
    const r = await $`bun ${CLI} update-bug-steps --project ${PROJECT} --slug ${slug} --yyyymm ${ym} \
      --bug-id b-001 --json ${sf}`.quiet().nothrow();
    expect(r.exitCode).toBe(0);
    const show = await $`bun ${CLI} show --project ${PROJECT} --slug ${slug} --yyyymm ${ym} --bug-id b-001`
      .quiet().nothrow();
    expect(JSON.parse(show.stdout.toString()).bug.reproduction_steps.length).toBe(4);
  });

  test("set-meta updates reviewer", async () => {
    const { slug, ym } = await seedOneBug();
    const r = await $`bun ${CLI} set-meta --project ${PROJECT} --slug ${slug} --yyyymm ${ym} \
      --field reviewer --value alice`.quiet().nothrow();
    expect(r.exitCode).toBe(0);
    const show = await $`bun ${CLI} show --project ${PROJECT} --slug ${slug} --yyyymm ${ym}`
      .quiet().nothrow();
    expect(JSON.parse(show.stdout.toString()).meta.reviewer).toBe("alice");
  });

  test("show without --bug-id returns full report", async () => {
    const { slug, ym } = await seedOneBug();
    const r = await $`bun ${CLI} show --project ${PROJECT} --slug ${slug} --yyyymm ${ym}`
      .quiet().nothrow();
    const out = JSON.parse(r.stdout.toString());
    expect(out.meta.repo).toBe("demo");
    expect(out.bugs.length).toBe(1);
  });
});

describe("scan-report CLI — render & auto-render", () => {
  test("create produces report.html and add-bug refreshes it", async () => {
    const r1 = await $`bun ${CLI} create --project ${PROJECT} --repo demo \
      --base-branch release_6.3.x --head-branch release_6.3.0_dev --slug r-test --skip-fetch`
      .quiet().nothrow();
    const { slug, yyyymm } = JSON.parse(r1.stdout.toString());
    const html = join(WS, PROJECT, "audits", `${yyyymm}-${slug}`, "report.html");
    expect(existsSync(html)).toBe(true);
    const empty = readFileSync(html, "utf8");
    expect(empty).toContain("静态扫描报告");

    const f = join(WS, "bug.json");
    writeFileSync(
      f,
      JSON.stringify({
        id: "b-001", title: "rendered bug", severity: "critical", type: "logic", module: "X",
        location: { file: "a.ts", line: 1 },
        phenomenon: "P", expected: "E", actual: "A",
        reproduction_steps: ["1", "2", "3"], root_cause: "R",
        evidence: { diff_hunk: "@@" },
        suggestion: "S", confidence: 0.9, confidence_reason: "C",
      }),
    );
    await $`bun ${CLI} add-bug --project ${PROJECT} --slug ${slug} --yyyymm ${yyyymm} --json ${f}`
      .quiet().nothrow();

    const after = readFileSync(html, "utf8");
    expect(after).toContain("rendered bug");
    expect(after).toContain('id="b-001"');
  });

  test("--no-render skips html refresh", async () => {
    const r1 = await $`bun ${CLI} create --project ${PROJECT} --repo demo \
      --base-branch release_6.3.x --head-branch release_6.3.0_dev --slug nr-test --skip-fetch`
      .quiet().nothrow();
    const { slug, yyyymm } = JSON.parse(r1.stdout.toString());
    const html = join(WS, PROJECT, "audits", `${yyyymm}-${slug}`, "report.html");
    const before = readFileSync(html, "utf8");

    const f = join(WS, "bug.json");
    writeFileSync(
      f,
      JSON.stringify({
        id: "b-001", title: "should not appear", severity: "critical", type: "logic", module: "X",
        location: { file: "a.ts", line: 1 },
        phenomenon: "P", expected: "E", actual: "A",
        reproduction_steps: ["1", "2", "3"], root_cause: "R",
        evidence: { diff_hunk: "@@" },
        suggestion: "S", confidence: 0.9, confidence_reason: "C",
      }),
    );
    await $`bun ${CLI} add-bug --project ${PROJECT} --slug ${slug} --yyyymm ${yyyymm} --json ${f} --no-render`
      .quiet().nothrow();
    const after = readFileSync(html, "utf8");
    expect(after).toBe(before);
  });
});
