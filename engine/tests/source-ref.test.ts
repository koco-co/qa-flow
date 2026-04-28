import { describe, it, afterEach, expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";

const REPO_ROOT = resolvePath(import.meta.dirname, "../..");
const CLI_BIN = "bun";
const CLI_ARGS = [join(REPO_ROOT, "engine/src/cli/index.ts"), "source-ref"];

describe("kata-cli source-ref resolve --prd-slug + --yyyymm (enhanced scheme)", () => {
  const tmp = mkdtempSync(join(tmpdir(), "kata-sr-enh-cli-"));
  const project = "test-project";
  const ym = "202604";
  const slug = "demo-feature";
  const enhancedPath = join(
    tmp,
    project,
    "prds",
    ym,
    slug,
    "enhanced.md",
  );
  // 创建目录结构
  mkdirSync(join(tmp, project, "prds", ym, slug), { recursive: true });
  writeFileSync(
    enhancedPath,
    [
      "---",
      "version: 2",
      "---",
      "",
      '## 1. 概述 <a id="s-1"></a>',
      "",
      '### Q3 <a id="q3"></a>',
      "",
    ].join("\n"),
  );

  it("resolve --ref enhanced#s-1 OK with --prd-slug/--yyyymm/--workspace-dir", () => {
    const r = spawnSync(
      CLI_BIN,
      [
        ...CLI_ARGS,
        "resolve",
        "--ref",
        "enhanced#s-1",
        "--project",
        project,
        "--yyyymm",
        ym,
        "--prd-slug",
        slug,
        "--workspace-dir",
        tmp,
      ],
      { encoding: "utf8" },
    );
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toMatch(/"ok":\s*true/);
  });

  it("resolve --ref enhanced#q3 OK", () => {
    const r = spawnSync(
      CLI_BIN,
      [
        ...CLI_ARGS,
        "resolve",
        "--ref",
        "enhanced#q3",
        "--project",
        project,
        "--yyyymm",
        ym,
        "--prd-slug",
        slug,
        "--workspace-dir",
        tmp,
      ],
      { encoding: "utf8" },
    );
    expect(r.status).toBe(0);
  });

  it("resolve fails when --prd-slug or --yyyymm omitted (no enhancedDocPath built)", () => {
    const r = spawnSync(
      CLI_BIN,
      [
        ...CLI_ARGS,
        "resolve",
        "--ref",
        "enhanced#s-1",
        "--project",
        project,
        "--workspace-dir",
        tmp,
      ],
      { encoding: "utf8" },
    );
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toMatch(/enhancedDocPath/);
  });

  it("batch supports enhanced scheme with --prd-slug/--yyyymm", () => {
    const refsJson = join(tmp, "refs-enh.json");
    writeFileSync(
      refsJson,
      JSON.stringify([{ ref: "enhanced#s-1" }, { ref: "enhanced#s-99" }]),
    );
    const r = spawnSync(
      CLI_BIN,
      [
        ...CLI_ARGS,
        "batch",
        "--refs-json",
        refsJson,
        "--project",
        project,
        "--yyyymm",
        ym,
        "--prd-slug",
        slug,
        "--workspace-dir",
        tmp,
      ],
      { encoding: "utf8" },
    );
    expect(r.status).toBe(2); // 第二个失败
    expect(r.stdout + r.stderr).toMatch(/"total":\s*2/);
  });

  afterEach(() => rmSync(tmp, { recursive: true, force: true }));
});
