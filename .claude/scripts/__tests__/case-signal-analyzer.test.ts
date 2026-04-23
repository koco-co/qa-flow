import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// From .claude/scripts/__tests__/ → up 3 levels to repo root
const repoRoot = resolve(import.meta.dirname, "../../..");

const project = "probe-fixture";

// PRD content with no field-definition tables (fillRate=0), confidence=0.2
const PRD_CONTENT = `---
requirement_id: 99999
requirement_name: 探针烟雾
modules:
  - 商品管理
confidence: 0.2
---
# 探针烟雾

（无字段定义表）
`;

function prdDir(): string {
  return join(repoRoot, "workspace", project, "prds", "202604");
}

function prdPath(): string {
  return join(prdDir(), "smoke-probe.md");
}

function cacheDir(): string {
  return join(repoRoot, "workspace", project, ".temp", "probe-cache");
}

function cachePath(): string {
  return join(cacheDir(), "smoke-probe.json");
}

function runCli(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync("kata-cli", ["case-signal-analyzer", ...args], {
    encoding: "utf8",
    cwd: repoRoot,
  });
}

beforeEach(() => {
  // Create fixture PRD
  mkdirSync(prdDir(), { recursive: true });
  writeFileSync(prdPath(), PRD_CONTENT, "utf8");
});

afterEach(() => {
  // Clean up all fixture data
  rmSync(join(repoRoot, "workspace", project), { recursive: true, force: true });
});

describe("case-signal-analyzer CLI", () => {
  test("probe with no repos / no history / no knowledge exits 0 and returns valid SignalProfile JSON", () => {
    const result = runCli([
      "probe",
      "--project",
      project,
      "--prd",
      prdPath(),
      "--no-cache",
    ]);

    expect(result.status).toBe(0);

    let profile: Record<string, unknown>;
    expect(() => {
      profile = JSON.parse(result.stdout) as Record<string, unknown>;
    }).not.toThrow();

    profile = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(profile).toHaveProperty("source");
    expect(profile).toHaveProperty("prd");
    expect(profile).toHaveProperty("history");
    expect(profile).toHaveProperty("knowledge");
    expect(profile).toHaveProperty("probed_at");
    expect(profile).toHaveProperty("project", project);
    expect(profile).toHaveProperty("prd_path", prdPath());

    // source: no repos in frontmatter → missing
    const source = profile.source as Record<string, unknown>;
    expect(source.level).toBe("missing");

    // knowledge: no knowledge dir → missing
    const knowledge = profile.knowledge as Record<string, unknown>;
    expect(["missing", "weak"]).toContain(knowledge.level);
  });

  test("PRD with confidence=0.2 and no field tables → prd.level === 'missing'", () => {
    const result = runCli([
      "probe",
      "--project",
      project,
      "--prd",
      prdPath(),
      "--no-cache",
    ]);

    expect(result.status).toBe(0);

    const profile = JSON.parse(result.stdout) as Record<string, unknown>;
    const prd = profile.prd as Record<string, unknown>;
    // fillRate=0 (no field definition table) → missing
    expect(prd.level).toBe("missing");
    const evidence = prd.evidence as Record<string, unknown>;
    expect(evidence.field_fill_rate).toBe(0);
    expect(evidence.confidence).toBe(0.2);
  });

  test("--no-cache does not create a cache file", () => {
    const result = runCli([
      "probe",
      "--project",
      project,
      "--prd",
      prdPath(),
      "--no-cache",
    ]);

    expect(result.status).toBe(0);
    expect(existsSync(cachePath())).toBe(false);
  });

  test("first probe without --no-cache creates a cache file", () => {
    const result = runCli([
      "probe",
      "--project",
      project,
      "--prd",
      prdPath(),
    ]);

    expect(result.status).toBe(0);
    expect(existsSync(cachePath())).toBe(true);
  });

  test("second probe with unchanged PRD mtime hits cache (stderr contains 'cache hit')", () => {
    // First probe — populate cache
    const first = runCli([
      "probe",
      "--project",
      project,
      "--prd",
      prdPath(),
    ]);
    expect(first.status).toBe(0);
    expect(existsSync(cachePath())).toBe(true);

    // Second probe — should hit cache
    const second = runCli([
      "probe",
      "--project",
      project,
      "--prd",
      prdPath(),
    ]);
    expect(second.status).toBe(0);
    expect(second.stderr).toContain("cache hit");
  });

  test("PRD mtime changed after cache write → cache is bypassed (no 'cache hit' in stderr)", () => {
    // First probe — populate cache
    const first = runCli([
      "probe",
      "--project",
      project,
      "--prd",
      prdPath(),
    ]);
    expect(first.status).toBe(0);
    expect(existsSync(cachePath())).toBe(true);

    // Touch the PRD file to change its mtime by 2 seconds into the future
    const futureTime = new Date(Date.now() + 2000);
    utimesSync(prdPath(), futureTime, futureTime);

    // Second probe — should NOT hit cache
    const second = runCli([
      "probe",
      "--project",
      project,
      "--prd",
      prdPath(),
    ]);
    expect(second.status).toBe(0);
    expect(second.stderr).not.toContain("cache hit");
  });

  test("--output summary writes summary line to stderr and JSON to stdout", () => {
    const result = runCli([
      "probe",
      "--project",
      project,
      "--prd",
      prdPath(),
      "--no-cache",
      "--output",
      "summary",
    ]);

    expect(result.status).toBe(0);

    // stdout still contains valid JSON
    let profile: Record<string, unknown>;
    expect(() => {
      profile = JSON.parse(result.stdout) as Record<string, unknown>;
    }).not.toThrow();
    profile = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(profile).toHaveProperty("source");

    // stderr contains summary line
    expect(result.stderr).toMatch(/\[case-signal-analyzer\] source=\w+ prd=\w+ history=\w+ knowledge=\w+/);
  });

  test("cache entry has correct prd_path in stored profile", () => {
    const result = runCli([
      "probe",
      "--project",
      project,
      "--prd",
      prdPath(),
    ]);

    expect(result.status).toBe(0);
    expect(existsSync(cachePath())).toBe(true);

    const cacheContent = JSON.parse(
      require("node:fs").readFileSync(cachePath(), "utf8"),
    ) as Record<string, unknown>;
    expect(cacheContent).toHaveProperty("prd_mtime_ms");
    expect(cacheContent).toHaveProperty("probe_script_mtime_ms");
    const storedProfile = cacheContent.profile as Record<string, unknown>;
    expect(storedProfile.prd_path).toBe(prdPath());
    expect(storedProfile.project).toBe(project);
  });
});
