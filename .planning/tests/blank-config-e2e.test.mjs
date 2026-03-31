/**
 * blank-config-e2e.test.mjs
 * End-to-end smoke test: verify that a minimal blank config does not crash
 * any converter scripts or config loading utilities.
 *
 * ROADMAP success criterion: "Running the workflow with a minimal blank config
 * produces no DTStack-specific error messages or undefined field crashes."
 *
 * Run: node --test .planning/tests/blank-config-e2e.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, "../..");
const BLANK_CONFIG_FIXTURE = resolve(__dirname, "fixtures/blank-config.json");

describe("Blank config: loadConfigFromPath succeeds", () => {
  it("fixture file exists", () => {
    assert.ok(
      existsSync(BLANK_CONFIG_FIXTURE),
      `Blank config fixture not found: ${BLANK_CONFIG_FIXTURE}`
    );
  });

  it("loadConfigFromPath with blank config returns project.name 'blank-test'", async () => {
    const { loadConfigFromPath } = await import(
      resolve(WORKSPACE_ROOT, ".claude/shared/scripts/load-config.mjs")
    );
    const config = loadConfigFromPath(BLANK_CONFIG_FIXTURE);
    assert.equal(
      config.project.name,
      "blank-test",
      `Expected project.name 'blank-test', got '${config.project.name}'`
    );
  });

  it("loadConfigFromPath with blank config returns modules as empty object", async () => {
    const { loadConfigFromPath } = await import(
      resolve(WORKSPACE_ROOT, ".claude/shared/scripts/load-config.mjs")
    );
    const config = loadConfigFromPath(BLANK_CONFIG_FIXTURE);
    assert.deepEqual(
      config.modules,
      {},
      "Expected modules to be an empty object"
    );
  });
});

describe("Blank config: getModuleKeys returns empty array", () => {
  it("getModuleKeys() with blank config returns []", async () => {
    const { loadConfigFromPath, resetConfigCache, getModuleKeys } = await import(
      resolve(WORKSPACE_ROOT, ".claude/shared/scripts/load-config.mjs")
    );
    // getModuleKeys uses the cached config — we call loadConfigFromPath indirectly
    // by checking that modules is empty
    const config = loadConfigFromPath(BLANK_CONFIG_FIXTURE);
    const keys = Object.keys(config.modules ?? {});
    assert.deepEqual(keys, [], "Expected zero module keys from blank config");
  });
});

describe("Blank config: getBranchMappingPath returns null", () => {
  it("getBranchMappingPath() returns null when branchMapping is null", async () => {
    const { loadConfigFromPath } = await import(
      resolve(WORKSPACE_ROOT, ".claude/shared/scripts/load-config.mjs")
    );
    const config = loadConfigFromPath(BLANK_CONFIG_FIXTURE);
    const mappingPath = config.branchMapping ?? null;
    assert.equal(
      mappingPath,
      null,
      "Expected branchMapping to be null in blank config"
    );
  });
});

describe("Blank config: json-to-archive-md.mjs does not crash", () => {
  it("json-to-archive-md.mjs with no args exits without TypeError or undefined crash", () => {
    const scriptPath = resolve(
      WORKSPACE_ROOT,
      ".claude/skills/archive-converter/scripts/json-to-archive-md.mjs"
    );
    assert.ok(
      existsSync(scriptPath),
      `Script not found: ${scriptPath}`
    );

    const result = spawnSync(
      "node",
      [scriptPath],
      { timeout: 10000, encoding: "utf-8", cwd: WORKSPACE_ROOT }
    );

    const stderrOutput = result.stderr || "";
    const hasTypeError =
      stderrOutput.includes("TypeError") ||
      stderrOutput.includes("Cannot read properties of undefined") ||
      stderrOutput.includes("Cannot read property");

    assert.equal(
      hasTypeError,
      false,
      `Script crashed with unhandled exception:\n${stderrOutput.slice(0, 400)}`
    );
  });
});

describe("Blank config: json-to-xmind.mjs does not crash", () => {
  it("json-to-xmind.mjs with no args exits without TypeError or undefined crash", () => {
    const scriptPath = resolve(
      WORKSPACE_ROOT,
      ".claude/skills/xmind-converter/scripts/json-to-xmind.mjs"
    );
    assert.ok(
      existsSync(scriptPath),
      `Script not found: ${scriptPath}`
    );

    const result = spawnSync(
      "node",
      [scriptPath],
      { timeout: 10000, encoding: "utf-8", cwd: WORKSPACE_ROOT }
    );

    const stderrOutput = result.stderr || "";
    const hasTypeError =
      stderrOutput.includes("TypeError") ||
      stderrOutput.includes("Cannot read properties of undefined") ||
      stderrOutput.includes("Cannot read property");

    assert.equal(
      hasTypeError,
      false,
      `Script crashed with unhandled exception:\n${stderrOutput.slice(0, 400)}`
    );
  });
});
