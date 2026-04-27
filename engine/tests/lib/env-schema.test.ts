import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

const ENV_KEYS_TO_CLEAN = [
  "ACTIVE_ENV",
  "CI63_BASE_URL",
  "CI63_COOKIE",
  "LTQCDEV_BASE_URL",
  "LTQCDEV_COOKIE",
  "LTQCDEV_USERNAME",
];

afterEach(() => {
  for (const k of ENV_KEYS_TO_CLEAN) delete process.env[k];
});

describe("validateActiveEnv", () => {
  it("returns activeEnv=null and missing=[ACTIVE_ENV] when ACTIVE_ENV unset", async () => {
    delete process.env["ACTIVE_ENV"];
    const { validateActiveEnv } = await import("../../lib/env-schema.ts");
    const result = validateActiveEnv();
    assert.equal(result.valid, false);
    assert.deepEqual(result.missing, ["ACTIVE_ENV"]);
    assert.equal(result.activeEnv, null);
  });

  it("returns valid=true when ACTIVE_ENV + required key are set", async () => {
    process.env["ACTIVE_ENV"] = "ci63";
    process.env["CI63_BASE_URL"] = "http://172.16.122.52";
    const { validateActiveEnv } = await import("../../lib/env-schema.ts");
    const result = validateActiveEnv();
    assert.equal(result.valid, true);
    assert.deepEqual(result.missing, []);
    assert.equal(result.activeEnv, "ci63");
  });

  it("reports uppercase suffix keys as missing", async () => {
    process.env["ACTIVE_ENV"] = "ltqcdev";
    // missing LTQCDEV_BASE_URL, LTQCDEV_COOKIE
    const { validateActiveEnv } = await import("../../lib/env-schema.ts");
    const result = validateActiveEnv(["BASE_URL", "COOKIE"]);
    assert.equal(result.valid, false);
    assert.deepEqual(result.missing, ["LTQCDEV_BASE_URL", "LTQCDEV_COOKIE"]);
    assert.equal(result.activeEnv, "ltqcdev");
  });

  it("supports custom required suffixes", async () => {
    process.env["ACTIVE_ENV"] = "ltqcdev";
    process.env["LTQCDEV_BASE_URL"] = "http://foo";
    process.env["LTQCDEV_USERNAME"] = "admin@dtstack.com";
    // missing COOKIE
    const { validateActiveEnv } = await import("../../lib/env-schema.ts");
    const result = validateActiveEnv(["BASE_URL", "USERNAME", "COOKIE"]);
    assert.equal(result.valid, false);
    assert.deepEqual(result.missing, ["LTQCDEV_COOKIE"]);
  });

  it("treats whitespace-only ACTIVE_ENV as unset", async () => {
    process.env["ACTIVE_ENV"] = "   ";
    const { validateActiveEnv } = await import("../../lib/env-schema.ts");
    const result = validateActiveEnv();
    assert.equal(result.activeEnv, null);
  });

  it("trims ACTIVE_ENV before uppercasing", async () => {
    process.env["ACTIVE_ENV"] = "  ci63  ";
    process.env["CI63_BASE_URL"] = "http://172.16.122.52";
    const { validateActiveEnv } = await import("../../lib/env-schema.ts");
    const result = validateActiveEnv();
    assert.equal(result.activeEnv, "ci63");
    assert.equal(result.valid, true);
  });
});

describe("validateEnv (existing)", () => {
  it("passes when no required keys are configured (default schema)", async () => {
    const { validateEnv } = await import("../../lib/env-schema.ts");
    const result = validateEnv();
    assert.equal(result.valid, true);
    assert.deepEqual(result.missing, []);
  });

  it("reports explicit required keys as missing", async () => {
    const unlikelyKey = "__QA_FLOW_DEFINITELY_NOT_SET_123__";
    delete process.env[unlikelyKey];
    const { validateEnv } = await import("../../lib/env-schema.ts");
    const result = validateEnv([unlikelyKey]);
    assert.equal(result.valid, false);
    assert.deepEqual(result.missing, [unlikelyKey]);
  });
});
