/**
 * load-config.test.mjs
 * Unit tests for GEN-01 and GEN-02: generalized config schema and loadConfig() validation.
 *
 * Run: node --test .claude/shared/scripts/load-config.test.mjs
 *
 * TDD Note: Tests for the generalized schema (zentaoId, repoBranchMapping, dataAssetsVersionMap
 * absent; trackerId, branchMapping present) will FAIL (RED) until Task 2 rewrites config.json
 * and load-config.mjs. Tests for getDtstackModules removal and getBranchMappingPath will also
 * fail until the implementation is updated.
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";
import { join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, "test-fixtures/config-generalized.json");
const WORKSPACE_ROOT = resolve(__dirname, "../../..");

// Helper: write a temp config file and return its path
function writeTempConfig(obj) {
  const dir = join(tmpdir(), "qa-flow-tests-" + Date.now());
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "config.json");
  writeFileSync(path, JSON.stringify(obj), "utf8");
  return path;
}

describe("GEN-01: Generalized config schema", () => {
  let loadConfigFromPath;
  let resetConfigCache;

  before(async () => {
    const mod = await import("./load-config.mjs");
    loadConfigFromPath = mod.loadConfigFromPath;
    resetConfigCache = mod.resetConfigCache;
    if (!loadConfigFromPath) {
      // Function not yet implemented — tests will fail (RED phase)
      loadConfigFromPath = () => { throw new Error("loadConfigFromPath not implemented yet"); };
    }
    if (!resetConfigCache) {
      resetConfigCache = () => {};
    }
  });

  it("loadConfig() with generalized config returns object with project.name field", () => {
    resetConfigCache();
    const config = loadConfigFromPath(FIXTURE_PATH);
    assert.ok(config.project?.name, "config.project.name should exist");
    assert.equal(typeof config.project.name, "string");
  });

  it("loadConfig() with generalized config has no zentaoId in any module", () => {
    resetConfigCache();
    const config = loadConfigFromPath(FIXTURE_PATH);
    for (const [key, mod] of Object.entries(config.modules || {})) {
      assert.equal(
        mod.zentaoId,
        undefined,
        `module "${key}" should not have zentaoId (use trackerId instead)`
      );
    }
  });

  it("loadConfig() with generalized config has no repoBranchMapping top-level key", () => {
    resetConfigCache();
    const config = loadConfigFromPath(FIXTURE_PATH);
    assert.equal(
      config.repoBranchMapping,
      undefined,
      "config should not have repoBranchMapping (use branchMapping instead)"
    );
  });

  it("loadConfig() with generalized config has no dataAssetsVersionMap top-level key", () => {
    resetConfigCache();
    const config = loadConfigFromPath(FIXTURE_PATH);
    assert.equal(
      config.dataAssetsVersionMap,
      undefined,
      "config should not have dataAssetsVersionMap"
    );
  });

  it("loadConfig() with generalized config has branchMapping instead of repoBranchMapping", () => {
    resetConfigCache();
    const config = loadConfigFromPath(FIXTURE_PATH);
    assert.ok(
      Object.prototype.hasOwnProperty.call(config, "branchMapping"),
      "config should have branchMapping key (not repoBranchMapping)"
    );
  });

  it("loadConfig() with minimal config does not have versionMap (graceful absence)", () => {
    resetConfigCache();
    const config = loadConfigFromPath(FIXTURE_PATH);
    // versionMap was not in the generalized schema — should be undefined, not throw
    assert.equal(config.versionMap, undefined, "config.versionMap should be undefined (not required)");
  });
});

describe("GEN-02: loadConfig() validation — missing required fields", () => {
  let loadConfigFromPath;
  let resetConfigCache;

  before(async () => {
    const mod = await import("./load-config.mjs");
    loadConfigFromPath = mod.loadConfigFromPath;
    resetConfigCache = mod.resetConfigCache;
    if (!loadConfigFromPath) {
      loadConfigFromPath = () => { throw new Error("loadConfigFromPath not implemented yet"); };
    }
    if (!resetConfigCache) {
      resetConfigCache = () => {};
    }
  });

  it("loadConfig() throws error containing 'project.name' when project.name missing", () => {
    resetConfigCache();
    const configPath = writeTempConfig({ project: {}, modules: {} });
    assert.throws(
      () => loadConfigFromPath(configPath),
      (err) => {
        assert.ok(
          err.message.includes("project.name"),
          `Error should mention "project.name" but got: ${err.message}`
        );
        return true;
      }
    );
  });

  it("loadConfig() throws error containing 'modules' when modules missing", () => {
    resetConfigCache();
    const configPath = writeTempConfig({ project: { name: "test" } });
    assert.throws(
      () => loadConfigFromPath(configPath),
      (err) => {
        assert.ok(
          err.message.includes("modules"),
          `Error should mention "modules" but got: ${err.message}`
        );
        return true;
      }
    );
  });

  it("loadConfig() succeeds with minimal config { project: { name: 'test' }, modules: {} }", () => {
    resetConfigCache();
    const configPath = writeTempConfig({ project: { name: "test" }, modules: {} });
    const config = loadConfigFromPath(configPath);
    assert.equal(config.project.name, "test");
    assert.deepEqual(config.modules, {});
  });

  it("loadConfig() with missing versionMap returns undefined for versionMap (no crash)", () => {
    resetConfigCache();
    const configPath = writeTempConfig({ project: { name: "test" }, modules: {} });
    const config = loadConfigFromPath(configPath);
    assert.equal(config.versionMap, undefined, "versionMap should be undefined without crashing");
  });
});

describe("GEN-01: getModuleKeys() replaces getDtstackModules()", () => {
  let mod;

  before(async () => {
    mod = await import("./load-config.mjs");
  });

  it("getModuleKeys() returns array of module key strings", () => {
    assert.ok(typeof mod.getModuleKeys === "function", "getModuleKeys should be exported");
    const keys = mod.getModuleKeys();
    assert.ok(Array.isArray(keys), "getModuleKeys() should return an array");
  });

  it("getDtstackModules is NOT exported (typeof === 'undefined')", () => {
    assert.equal(
      mod.getDtstackModules,
      undefined,
      "getDtstackModules should NOT be exported from load-config.mjs"
    );
  });
});

describe("GEN-01: getBranchMappingPath() reads config.branchMapping", () => {
  let mod;

  before(async () => {
    mod = await import("./load-config.mjs");
  });

  it("getBranchMappingPath() is exported", () => {
    assert.ok(
      typeof mod.getBranchMappingPath === "function",
      "getBranchMappingPath should be exported"
    );
  });

  it("getBranchMappingPath() reads config.branchMapping (not config.repoBranchMapping)", () => {
    // Verify the source code uses branchMapping
    const source = readFileSync(resolve(__dirname, "load-config.mjs"), "utf8");
    assert.ok(
      source.includes("config.branchMapping"),
      "getBranchMappingPath() should read config.branchMapping"
    );
  });

  it("loadConfigFromPath() is exported for testability", () => {
    assert.ok(
      typeof mod.loadConfigFromPath === "function",
      "loadConfigFromPath should be exported"
    );
  });

  it("resetConfigCache() is exported for test isolation", () => {
    assert.ok(
      typeof mod.resetConfigCache === "function",
      "resetConfigCache should be exported"
    );
  });
});
