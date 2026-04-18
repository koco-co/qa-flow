import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { after, describe, it } from "node:test";
import {
  parseTestSetup,
  planSplit,
  renderCompatibilityShim,
  renderIndexBarrel,
  renderTargetFile,
} from "../migrate-helpers-split.ts";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const FIXTURE_PROJECT = `helpers-split-fixture-${process.pid}`;
const FIXTURE_DIR = join(REPO_ROOT, "workspace", FIXTURE_PROJECT);
const FIXTURE_HELPERS = join(FIXTURE_DIR, "tests", "helpers");
const SCRIPT = ".claude/scripts/migrate-helpers-split.ts";

// ── Fixture setup ──────────────────────────────────────────────────────────────

const FIXTURE_SOURCE = `import { Page } from "@playwright/test";
import { chromium } from "playwright";

export { selectAntOption } from "../../../../lib/playwright/index";

/**
 * Get an environment variable value.
 */
export function getEnv(name: string): string | undefined {
  return process.env[name];
}

export async function syncMetadata(page: Page): Promise<void> {
  await page.click(".sync-btn");
}

export async function getAccessibleProjectIds(page: Page): Promise<number[]> {
  return [1, 2, 3];
}

export async function executeSqlViaBatchDoris(page: Page, sql: string): Promise<void> {
  await page.fill(".sql-editor", sql);
}
`;

function setupFixture(): void {
  mkdirSync(FIXTURE_HELPERS, { recursive: true });
  writeFileSync(join(FIXTURE_HELPERS, "test-setup.ts"), FIXTURE_SOURCE, "utf8");
}

function runCli(
  args: string[],
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("bun", ["run", SCRIPT, ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
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

after(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

// ── Parser tests ───────────────────────────────────────────────────────────────

describe("parseTestSetup", () => {
  it("parses single export function with JSDoc", () => {
    const src = `import { Page } from "@playwright/test";

/**
 * Get an env var.
 */
export function getEnv(name: string): string | undefined {
  return process.env[name];
}
`;
    const parsed = parseTestSetup(src);
    assert.equal(parsed.imports.length, 1);
    assert.ok(parsed.imports[0].includes("@playwright/test"));
    assert.equal(parsed.functions.length, 1);
    const fn = parsed.functions[0];
    assert.equal(fn.name, "getEnv");
    assert.equal(fn.isExported, true);
    assert.ok(fn.source.includes("Get an env var"));
    assert.ok(fn.source.includes("export function getEnv"));
  });

  it("parses export async function", () => {
    const src = `import { Page } from "@playwright/test";

export async function syncMetadata(page: Page): Promise<void> {
  await page.click(".sync-btn");
}
`;
    const parsed = parseTestSetup(src);
    assert.equal(parsed.functions.length, 1);
    const fn = parsed.functions[0];
    assert.equal(fn.name, "syncMetadata");
    assert.equal(fn.isExported, true);
    assert.ok(fn.source.includes("async function syncMetadata"));
  });

  it("parses private (non-exported) helper", () => {
    const src = `import { Page } from "@playwright/test";

function getRawBaseUrl(env: string): string {
  return \`http://\${env}.example.com\`;
}
`;
    const parsed = parseTestSetup(src);
    assert.equal(parsed.functions.length, 1);
    const fn = parsed.functions[0];
    assert.equal(fn.name, "getRawBaseUrl");
    assert.equal(fn.isExported, false);
  });

  it("preserves re-exports from lib/playwright in reExports (not functions)", () => {
    const src = `import { Page } from "@playwright/test";

export { selectAntOption, waitForElement } from "../../../../lib/playwright/index";

export function getEnv(name: string): string | undefined {
  return process.env[name];
}
`;
    const parsed = parseTestSetup(src);
    assert.equal(parsed.reExports.length, 1);
    assert.ok(parsed.reExports[0].includes("selectAntOption"));
    assert.ok(parsed.reExports[0].includes("lib/playwright"));
    // re-export should NOT appear in functions
    const reExportInFunctions = parsed.functions.find((f) =>
      f.name === "selectAntOption",
    );
    assert.equal(reExportInFunctions, undefined);
    // getEnv should still be in functions
    assert.equal(parsed.functions.length, 1);
    assert.equal(parsed.functions[0].name, "getEnv");
  });

  it("parses multi-line import statement", () => {
    const src = `import {
  Page,
  Browser,
  Locator,
} from "@playwright/test";

export function getEnv(name: string): string | undefined {
  return process.env[name];
}
`;
    const parsed = parseTestSetup(src);
    assert.equal(parsed.imports.length, 1);
    assert.ok(parsed.imports[0].includes("Page"));
    assert.ok(parsed.imports[0].includes("Browser"));
    assert.ok(parsed.imports[0].includes("Locator"));
  });

  it("parses function with multi-line signature (opening brace on later line)", () => {
    const source = `import type { Page } from "@playwright/test";

export async function syncMetadata(
  page: Page,
  datasourceName?: string,
  database?: string,
): Promise<void> {
  const inner = async (): Promise<string> => {
    return "x";
  };
  await inner();
}
`;
    const parsed = parseTestSetup(source);
    assert.equal(parsed.functions.length, 1);
    assert.equal(parsed.functions[0].name, "syncMetadata");
    // Body must include the inner arrow function AND the closing brace
    assert.ok(parsed.functions[0].source.includes("const inner"));
    assert.ok(parsed.functions[0].source.includes("await inner()"));
    assert.ok(parsed.functions[0].source.trimEnd().endsWith("}"));
  });

  it("parses JSDoc-prefixed function with multi-line signature", () => {
    const source = `/**
 * Does a thing.
 */
export async function doThing(
  arg: string,
): Promise<void> {
  await Promise.resolve();
}
`;
    const parsed = parseTestSetup(source);
    assert.equal(parsed.functions.length, 1);
    assert.equal(parsed.functions[0].name, "doThing");
    assert.ok(parsed.functions[0].source.includes("/**"));
    assert.ok(parsed.functions[0].source.includes("await Promise.resolve()"));
  });
});

// ── planSplit tests ────────────────────────────────────────────────────────────

describe("planSplit", () => {
  it("groups exported functions by FUNCTION_TO_FILE", () => {
    const src = `import { Page } from "@playwright/test";

export function getEnv(name: string): string | undefined {
  return process.env[name];
}

export async function syncMetadata(page: Page): Promise<void> {
  await page.click(".sync");
}

export async function getQualityProjectId(page: Page): Promise<number> {
  return 1;
}
`;
    const parsed = parseTestSetup(src);
    const plan = planSplit(parsed);

    const envSetup = plan.get("env-setup.ts") ?? [];
    assert.ok(envSetup.some((f) => f.name === "getEnv"), "getEnv should be in env-setup.ts");

    const metadataSync = plan.get("metadata-sync.ts") ?? [];
    assert.ok(metadataSync.some((f) => f.name === "syncMetadata"), "syncMetadata → metadata-sync.ts");

    const qualityProject = plan.get("quality-project.ts") ?? [];
    assert.ok(qualityProject.some((f) => f.name === "getQualityProjectId"), "getQualityProjectId → quality-project.ts");
  });

  it("throws on unmapped function name", () => {
    const src = `export function unknownHelper(): void {
  // does something
}
`;
    const parsed = parseTestSetup(src);
    assert.throws(
      () => planSplit(parsed),
      /Unknown function "unknownHelper"/,
    );
  });

  it("private helper goes to PRIVATE_HELPER_TARGETS target", () => {
    const src = `import { Page } from "@playwright/test";

function getRawBaseUrl(env: string): string {
  return \`http://\${env}.example.com\`;
}

function openBatchDorisEditor(page: Page): Promise<void> {
  return page.click(".doris-editor");
}
`;
    const parsed = parseTestSetup(src);
    const plan = planSplit(parsed);

    const envSetup = plan.get("env-setup.ts") ?? [];
    assert.ok(
      envSetup.some((f) => f.name === "getRawBaseUrl"),
      "getRawBaseUrl (private) should go to env-setup.ts",
    );

    const batchSql = plan.get("batch-sql.ts") ?? [];
    assert.ok(
      batchSql.some((f) => f.name === "openBatchDorisEditor"),
      "openBatchDorisEditor (private) should go to batch-sql.ts",
    );
  });
});

// ── Rendering tests ────────────────────────────────────────────────────────────

describe("renderIndexBarrel", () => {
  it("includes all 4 targets and re-exports from lib/playwright", () => {
    const reExports = [
      'export { selectAntOption } from "../../../../lib/playwright/index";',
    ];
    const content = renderIndexBarrel(reExports);

    assert.ok(content.includes('export * from "./env-setup"'), "should include env-setup");
    assert.ok(content.includes('export * from "./batch-sql"'), "should include batch-sql");
    assert.ok(content.includes('export * from "./metadata-sync"'), "should include metadata-sync");
    assert.ok(content.includes('export * from "./quality-project"'), "should include quality-project");
    assert.ok(content.includes("selectAntOption"), "should include lib/playwright re-export");
    assert.ok(content.includes("lib/playwright"), "should reference lib/playwright path");
  });

  it("works with empty reExports", () => {
    const content = renderIndexBarrel([]);
    assert.ok(content.includes('export * from "./env-setup"'));
    assert.ok(content.includes('export * from "./batch-sql"'));
  });
});

describe("renderCompatibilityShim", () => {
  it("is short and re-exports from index", () => {
    const content = renderCompatibilityShim();
    const lines = content.split("\n").filter((l) => l.trim() !== "");

    // Should be short (under 10 non-empty lines)
    assert.ok(lines.length < 10, `Shim too long: ${lines.length} non-empty lines`);

    // Must have the re-export
    assert.ok(
      content.includes('export * from "./index"'),
      "shim must re-export from ./index",
    );
  });
});

// ── E2E fixture test ───────────────────────────────────────────────────────────

describe("E2E fixture test: CLI splits test-setup.ts", () => {
  it("splits fixture into 4 files + index + shim", () => {
    // Set up fresh fixture
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
    setupFixture();

    const { stdout, code } = runCli(["--project", FIXTURE_PROJECT]);
    assert.equal(code, 0, `CLI failed:\n${stdout}`);

    const result = JSON.parse(stdout);
    assert.equal(result.status, "split");
    assert.equal(result.project, FIXTURE_PROJECT);

    // All 4 target files exist
    for (const target of ["env-setup.ts", "batch-sql.ts", "metadata-sync.ts", "quality-project.ts"]) {
      assert.ok(
        existsSync(join(FIXTURE_HELPERS, target)),
        `${target} should exist`,
      );
    }

    // index.ts exists
    assert.ok(existsSync(join(FIXTURE_HELPERS, "index.ts")), "index.ts should exist");

    // test-setup.ts is now the shim
    const shimContent = readFileSync(join(FIXTURE_HELPERS, "test-setup.ts"), "utf8");
    assert.ok(
      shimContent.includes('export * from "./index"'),
      "test-setup.ts should be the compatibility shim",
    );

    // env-setup.ts contains getEnv
    const envContent = readFileSync(join(FIXTURE_HELPERS, "env-setup.ts"), "utf8");
    assert.ok(envContent.includes("export function getEnv"), "env-setup.ts should contain getEnv");

    // metadata-sync.ts contains syncMetadata
    const metaContent = readFileSync(join(FIXTURE_HELPERS, "metadata-sync.ts"), "utf8");
    assert.ok(metaContent.includes("syncMetadata"), "metadata-sync.ts should contain syncMetadata");

    // quality-project.ts contains getAccessibleProjectIds
    const qualityContent = readFileSync(join(FIXTURE_HELPERS, "quality-project.ts"), "utf8");
    assert.ok(
      qualityContent.includes("getAccessibleProjectIds"),
      "quality-project.ts should contain getAccessibleProjectIds",
    );

    // batch-sql.ts contains executeSqlViaBatchDoris
    const batchContent = readFileSync(join(FIXTURE_HELPERS, "batch-sql.ts"), "utf8");
    assert.ok(
      batchContent.includes("executeSqlViaBatchDoris"),
      "batch-sql.ts should contain executeSqlViaBatchDoris",
    );

    // index.ts includes lib/playwright re-export
    const indexContent = readFileSync(join(FIXTURE_HELPERS, "index.ts"), "utf8");
    assert.ok(indexContent.includes("selectAntOption"), "index.ts should include lib/playwright re-exports");
  });

  it("idempotency: second run returns status already-split", () => {
    // Fixture was already split by previous test — run again
    const { stdout, code } = runCli(["--project", FIXTURE_PROJECT]);
    assert.equal(code, 0, `CLI failed:\n${stdout}`);

    const result = JSON.parse(stdout);
    assert.equal(result.status, "already-split", "Second run should return already-split");
    assert.deepEqual(result.filesWritten, []);
  });

  it("dry-run does not write files", () => {
    // Reset fixture to unprocessed state
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
    setupFixture();

    const { stdout, code } = runCli(["--project", FIXTURE_PROJECT, "--dry-run"]);
    assert.equal(code, 0, `CLI failed:\n${stdout}`);

    const result = JSON.parse(stdout);
    assert.equal(result.status, "dry-run");

    // None of the new files should exist (only test-setup.ts was there already)
    assert.equal(
      existsSync(join(FIXTURE_HELPERS, "env-setup.ts")),
      false,
      "env-setup.ts should NOT exist in dry-run",
    );
    assert.equal(
      existsSync(join(FIXTURE_HELPERS, "index.ts")),
      false,
      "index.ts should NOT exist in dry-run",
    );

    // Original test-setup.ts should be unchanged (still has original content)
    const setupContent = readFileSync(join(FIXTURE_HELPERS, "test-setup.ts"), "utf8");
    assert.ok(
      setupContent.includes("export function getEnv"),
      "Original test-setup.ts should be unchanged in dry-run",
    );
  });
});

// ── Cross-file fixture tests ───────────────────────────────────────────────────

const XFILE_FIXTURE_PROJECT = `helpers-split-xfile-fixture-${process.pid}`;
const XFILE_FIXTURE_DIR = join(REPO_ROOT, "workspace", XFILE_FIXTURE_PROJECT);
const XFILE_FIXTURE_HELPERS = join(XFILE_FIXTURE_DIR, "tests", "helpers");

after(() => {
  rmSync(XFILE_FIXTURE_DIR, { recursive: true, force: true });
});

describe("renderTargetFile: typeAlias propagation", () => {
  it("emits typeAliases into target file that uses them", () => {
    // getEnv lives in env-setup.ts (FUNCTION_TO_FILE mapped)
    // Use RuntimeEnv type alias (same as real file)
    const src = `import type { Page } from "@playwright/test";

type Foo = string;

export function getEnv(name: string): Foo | undefined {
  return process.env[name] as Foo | undefined;
}
`;
    const parsed = parseTestSetup(src);
    assert.equal(parsed.typeAliases.length, 1, "should parse type alias");
    assert.ok(parsed.typeAliases[0].includes("type Foo"), "typeAlias should be 'type Foo'");

    const plan = planSplit(parsed);
    const envFunctions = plan.get("env-setup.ts") ?? [];

    const content = renderTargetFile(
      "env-setup.ts",
      parsed.imports,
      parsed.typeAliases,
      envFunctions,
    );

    assert.ok(content.includes("type Foo"), "emitted env-setup.ts should contain 'type Foo'");
    assert.ok(content.includes("export function getEnv"), "emitted env-setup.ts should contain getEnv");
  });

  it("emits typeAliases into ALL target files (even if no direct usage)", () => {
    // batch-sql.ts functions with type aliases at top
    const src = `import type { Page } from "@playwright/test";

type Foo = string;

export async function executeSqlViaBatchDoris(page: Page, sql: string): Promise<void> {
  await page.fill(".editor", sql);
}
`;
    const parsed = parseTestSetup(src);
    const plan = planSplit(parsed);
    const batchFunctions = plan.get("batch-sql.ts") ?? [];

    const content = renderTargetFile(
      "batch-sql.ts",
      parsed.imports,
      parsed.typeAliases,
      batchFunctions,
    );

    assert.ok(content.includes("type Foo"), "emitted batch-sql.ts should contain 'type Foo'");
  });

  it("CLI split propagates typeAliases into each emitted file", () => {
    // Use real CLI via runCli to verify end-to-end typeAlias propagation
    // Source uses type RuntimeEnv alias (matches real file pattern)
    const src = `import type { Page } from "@playwright/test";

type RuntimeEnv = Record<string, string | undefined>;

export function getEnv(name: string): string | undefined {
  return (globalThis as typeof globalThis & { process?: { env?: RuntimeEnv } }).process?.env?.[name];
}

export async function syncMetadata(page: Page): Promise<void> {
  await page.click(".sync-btn");
}

export async function getAccessibleProjectIds(page: Page): Promise<number[]> {
  return [1, 2, 3];
}

export async function executeSqlViaBatchDoris(page: Page, sql: string): Promise<void> {
  await page.fill(".sql-editor", sql);
}
`;
    rmSync(XFILE_FIXTURE_DIR, { recursive: true, force: true });
    mkdirSync(XFILE_FIXTURE_HELPERS, { recursive: true });
    writeFileSync(join(XFILE_FIXTURE_HELPERS, "test-setup.ts"), src, "utf8");

    const { stdout, code } = runCli(["--project", XFILE_FIXTURE_PROJECT]);
    assert.equal(code, 0, `CLI failed:\n${stdout}`);

    // env-setup.ts should contain the type alias
    const envContent = readFileSync(join(XFILE_FIXTURE_HELPERS, "env-setup.ts"), "utf8");
    assert.ok(envContent.includes("type RuntimeEnv"), "env-setup.ts should contain type RuntimeEnv");

    // metadata-sync.ts should also have it (all files get it)
    const metaContent = readFileSync(join(XFILE_FIXTURE_HELPERS, "metadata-sync.ts"), "utf8");
    assert.ok(metaContent.includes("type RuntimeEnv"), "metadata-sync.ts should also contain type RuntimeEnv");

    // batch-sql.ts should also have it
    const batchContent = readFileSync(join(XFILE_FIXTURE_HELPERS, "batch-sql.ts"), "utf8");
    assert.ok(batchContent.includes("type RuntimeEnv"), "batch-sql.ts should also contain type RuntimeEnv");
  });
});

describe("renderTargetFile: cross-file import generation", () => {
  it("detects cross-file usage and emits import statement", () => {
    // getEnv (env-setup) calling selectBatchProject (batch-sql) is artificial but validates mechanism
    // Use the real mapped names: put getEnv in a source that calls selectBatchProject
    // getEnv → env-setup.ts, selectBatchProject → batch-sql.ts
    // So we place selectBatchProject calling getEnv (getEnv is in env-setup, selectBatchProject is in batch-sql)
    // batch-sql.ts functions calling env-setup.ts functions = cross-file import for env-setup
    const src = `import type { Page } from "@playwright/test";

export function getEnv(name: string): string | undefined {
  return process.env[name];
}

export async function selectBatchProject(page: Page, name: string): Promise<void> {
  const env = getEnv("TEST_VAR");
  await page.goto(\`/batch?env=\${env}\`);
}
`;
    const parsed = parseTestSetup(src);
    const plan = planSplit(parsed);

    const batchFunctions = plan.get("batch-sql.ts") ?? [];
    const content = renderTargetFile(
      "batch-sql.ts",
      parsed.imports,
      parsed.typeAliases,
      batchFunctions,
    );

    // batch-sql.ts should import getEnv from env-setup (since selectBatchProject calls getEnv)
    assert.ok(
      content.includes('from "./env-setup"'),
      `batch-sql.ts should import from env-setup; got:\n${content}`,
    );
    assert.ok(
      content.includes("getEnv"),
      "the cross-file import should include getEnv",
    );
    // The import line should be a proper import statement
    assert.ok(
      /import \{[^}]*getEnv[^}]*\} from "\.\/env-setup"/.test(content),
      `expected import statement with getEnv from env-setup; got:\n${content}`,
    );
  });

  it("does NOT emit cross-file import for functions in the same file", () => {
    // openBatchDorisEditor (batch-sql private) calls selectBatchProject (batch-sql)
    // They are in the same file — no cross-file import should appear for selectBatchProject
    const src = `import type { Page } from "@playwright/test";

export async function selectBatchProject(page: Page, name: string): Promise<void> {
  await page.goto(\`/batch/\${name}\`);
}

async function openBatchDorisEditor(page: Page, name: string, project: string): Promise<void> {
  await selectBatchProject(page, project);
  await page.click(".editor");
}
`;
    const parsed = parseTestSetup(src);
    const plan = planSplit(parsed);

    const batchFunctions = plan.get("batch-sql.ts") ?? [];
    const content = renderTargetFile(
      "batch-sql.ts",
      parsed.imports,
      parsed.typeAliases,
      batchFunctions,
    );

    // NO cross-file import needed — selectBatchProject is in same file
    assert.ok(
      !content.includes('import { selectBatchProject }'),
      "should NOT emit import for same-file function selectBatchProject",
    );
  });

  it("CLI split emits cross-file import for selectBatchProject using applyRuntimeCookies", () => {
    // Use a source where selectBatchProject calls applyRuntimeCookies (cross-file: batch → env-setup)
    // This mirrors the real test-setup.ts scenario
    const src = `import type { Page } from "@playwright/test";

export async function applyRuntimeCookies(page: Page, product?: string): Promise<void> {
  await page.context().addCookies([]);
}

export function buildOfflineUrl(path: string): string {
  return \`http://offline/\${path}\`;
}

export async function selectBatchProject(page: Page, projectName: string): Promise<void> {
  await applyRuntimeCookies(page, "batch");
  await page.goto(buildOfflineUrl("/projects"));
}

export async function syncMetadata(page: Page): Promise<void> {
  await applyRuntimeCookies(page);
}

export async function getAccessibleProjectIds(page: Page): Promise<number[]> {
  return [1, 2, 3];
}

export async function executeSqlViaBatchDoris(page: Page, sql: string): Promise<void> {
  await page.fill(".editor", sql);
}
`;
    // Re-use xfile fixture dir (already set up or reset it)
    rmSync(XFILE_FIXTURE_DIR, { recursive: true, force: true });
    mkdirSync(XFILE_FIXTURE_HELPERS, { recursive: true });
    writeFileSync(join(XFILE_FIXTURE_HELPERS, "test-setup.ts"), src, "utf8");

    const { stdout, code } = runCli(["--project", XFILE_FIXTURE_PROJECT]);
    assert.equal(code, 0, `CLI failed:\n${stdout}`);

    // batch-sql.ts should import applyRuntimeCookies and buildOfflineUrl from env-setup
    const batchContent = readFileSync(join(XFILE_FIXTURE_HELPERS, "batch-sql.ts"), "utf8");
    assert.ok(
      batchContent.includes('from "./env-setup"'),
      `batch-sql.ts should import from env-setup; got:\n${batchContent.slice(0, 500)}`,
    );
    assert.ok(
      batchContent.includes("applyRuntimeCookies"),
      "cross-file import should include applyRuntimeCookies",
    );
    assert.ok(
      batchContent.includes("buildOfflineUrl"),
      "cross-file import should include buildOfflineUrl",
    );

    // metadata-sync.ts should import applyRuntimeCookies from env-setup
    const metaContent = readFileSync(join(XFILE_FIXTURE_HELPERS, "metadata-sync.ts"), "utf8");
    assert.ok(
      metaContent.includes('from "./env-setup"'),
      `metadata-sync.ts should import from env-setup; got:\n${metaContent.slice(0, 500)}`,
    );
  });
});
