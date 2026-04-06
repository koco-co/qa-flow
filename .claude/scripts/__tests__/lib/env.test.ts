import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, before, describe, it } from "node:test";

// We need to test with isolated module state, so we test the functions via fresh imports
// env.ts uses a module-level cache, so we test behavior directly

const TMP_DIR = join(tmpdir(), `qa-flow-env-test-${process.pid}`);

function makeTmp(): string {
  mkdirSync(TMP_DIR, { recursive: true });
  return TMP_DIR;
}

afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("loadDotEnv", () => {
  it("returns empty object if .env file does not exist", async () => {
    const { loadDotEnv } = await import("../../lib/env.ts");
    const result = loadDotEnv(join(TMP_DIR, ".env.nonexistent"));
    assert.deepEqual(result, {});
  });

  it("parses key=value pairs", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "FOO=bar\nBAZ=qux\n");
    const { loadDotEnv } = await import("../../lib/env.ts");
    const result = loadDotEnv(envPath);
    assert.equal(result["FOO"], "bar");
    assert.equal(result["BAZ"], "qux");
  });

  it("skips comment lines starting with #", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "# this is a comment\nFOO=hello\n# another comment\n");
    const { loadDotEnv } = await import("../../lib/env.ts");
    const result = loadDotEnv(envPath);
    assert.equal(result["FOO"], "hello");
    assert.equal(Object.keys(result).length, 1);
  });

  it("skips blank lines", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "\n\nFOO=hello\n\n");
    const { loadDotEnv } = await import("../../lib/env.ts");
    const result = loadDotEnv(envPath);
    assert.equal(result["FOO"], "hello");
    assert.equal(Object.keys(result).length, 1);
  });

  it("strips double quotes from values", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, 'TOKEN="my-secret-token"\n');
    const { loadDotEnv } = await import("../../lib/env.ts");
    const result = loadDotEnv(envPath);
    assert.equal(result["TOKEN"], "my-secret-token");
  });

  it("strips single quotes from values", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "TOKEN='my-secret-token'\n");
    const { loadDotEnv } = await import("../../lib/env.ts");
    const result = loadDotEnv(envPath);
    assert.equal(result["TOKEN"], "my-secret-token");
  });

  it("handles values containing = sign", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "URL=http://example.com?a=1&b=2\n");
    const { loadDotEnv } = await import("../../lib/env.ts");
    const result = loadDotEnv(envPath);
    assert.equal(result["URL"], "http://example.com?a=1&b=2");
  });

  it("skips lines without = sign", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "INVALID_LINE\nFOO=bar\n");
    const { loadDotEnv } = await import("../../lib/env.ts");
    const result = loadDotEnv(envPath);
    assert.equal(result["FOO"], "bar");
    assert.equal(Object.keys(result).length, 1);
  });
});

describe("getEnv", () => {
  it("returns process.env value if set", async () => {
    const { getEnv } = await import("../../lib/env.ts");
    process.env["__TEST_QA_FLOW_KEY__"] = "from-process-env";
    const result = getEnv("__TEST_QA_FLOW_KEY__");
    assert.equal(result, "from-process-env");
    delete process.env["__TEST_QA_FLOW_KEY__"];
  });

  it("returns undefined for missing key", async () => {
    const { getEnv } = await import("../../lib/env.ts");
    const result = getEnv("__DEFINITELY_NOT_SET_KEY_XYZ_123__");
    assert.equal(result, undefined);
  });
});

describe("getEnvOrThrow", () => {
  it("throws if key is not set", async () => {
    const { getEnvOrThrow } = await import("../../lib/env.ts");
    assert.throws(
      () => getEnvOrThrow("__DEFINITELY_NOT_SET_KEY_THROW_TEST__"),
      (err: Error) => {
        assert.ok(err.message.includes("__DEFINITELY_NOT_SET_KEY_THROW_TEST__"));
        return true;
      },
    );
  });

  it("returns value if key is set in process.env", async () => {
    const { getEnvOrThrow } = await import("../../lib/env.ts");
    process.env["__TEST_QA_THROW_KEY__"] = "present-value";
    const result = getEnvOrThrow("__TEST_QA_THROW_KEY__");
    assert.equal(result, "present-value");
    delete process.env["__TEST_QA_THROW_KEY__"];
  });
});

describe("initEnv", () => {
  it("sets process.env for parsed keys not already present", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "INIT_TEST_KEY_NEW=newval\n");
    delete process.env["INIT_TEST_KEY_NEW"];
    const { initEnv } = await import("../../lib/env.ts");
    initEnv(envPath);
    assert.equal(process.env["INIT_TEST_KEY_NEW"], "newval");
    delete process.env["INIT_TEST_KEY_NEW"];
  });

  it("does not overwrite existing process.env keys", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "INIT_TEST_KEY_EXISTING=from-file\n");
    process.env["INIT_TEST_KEY_EXISTING"] = "already-set";
    const { initEnv } = await import("../../lib/env.ts");
    initEnv(envPath);
    assert.equal(process.env["INIT_TEST_KEY_EXISTING"], "already-set");
    delete process.env["INIT_TEST_KEY_EXISTING"];
  });
});
