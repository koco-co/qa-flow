import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import { join } from "node:path";
import { existsSync, rmSync } from "node:fs";
import { repoRoot } from "../lib/paths.ts";

const P = "test-d1-cli";
const YM = "202604";
const SLUG = "cli-slug";
const CLI = join(repoRoot(), ".claude/scripts/discuss.ts");

function cleanup() {
  const ws = join(repoRoot(), "workspace", P);
  if (existsSync(ws)) rmSync(ws, { recursive: true, force: true });
}

describe("discuss CLI — new subcommands", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test("init creates enhanced.md", async () => {
    const r = await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    expect(r.exitCode).toBe(0);
    expect(existsSync(join(repoRoot(), "workspace", P, "prds", YM, SLUG, "enhanced.md"))).toBe(true);
  });

  test("read returns JSON frontmatter", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    const r = await $`bun ${CLI} read --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    expect(r.exitCode).toBe(0);
    const out = JSON.parse(r.stdout.toString());
    expect(out.frontmatter.status).toBe("discussing");
  });

  test("add-pending + resolve + list-pending", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    const add = await $`bun ${CLI} add-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --location s-1 --label "§1" --question "q?" --recommended "r" --expected "e" --severity blocking_unknown`.quiet();
    const qid = JSON.parse(add.stdout.toString()).id;
    expect(qid).toBe("q1");
    const list1 = await $`bun ${CLI} list-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --format json`.quiet();
    expect(JSON.parse(list1.stdout.toString()).length).toBe(1);
    await $`bun ${CLI} resolve --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --id ${qid} --answer "final"`.quiet();
    const list2 = await $`bun ${CLI} list-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --format json`.quiet();
    expect(JSON.parse(list2.stdout.toString()).length).toBe(0);
  });

  test("validate --require-zero-pending returns non-zero exit with pending", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    await $`bun ${CLI} add-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --location s-1 --label x --question q --recommended r --expected e --severity blocking_unknown`.quiet();
    const r = await $`bun ${CLI} validate --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --require-zero-pending`.nothrow().quiet();
    expect(r.exitCode).not.toBe(0);
  });

  test("set-status transitions", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    await $`bun ${CLI} set-status --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --status analyzing`.quiet();
    const r = await $`bun ${CLI} read --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    expect(JSON.parse(r.stdout.toString()).frontmatter.status).toBe("analyzing");
  });
});
