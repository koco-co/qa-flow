import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

// We need to test with isolated module state, so we test the functions via fresh imports
// env.ts uses a module-level cache, so we test behavior directly

const TMP_DIR = join(tmpdir(), `kata-env-test-${process.pid}`);

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
    const { loadDotEnv } = await import("../../src/lib/env.ts");
    const result = loadDotEnv(join(TMP_DIR, ".env.nonexistent"));
    expect(result).toEqual({});
  });

  it("parses key=value pairs", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "FOO=bar\nBAZ=qux\n");
    const { loadDotEnv } = await import("../../src/lib/env.ts");
    const result = loadDotEnv(envPath);
    expect(result["FOO"]).toBe("bar");
    expect(result["BAZ"]).toBe("qux");
  });

  it("skips comment lines starting with #", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "# this is a comment\nFOO=hello\n# another comment\n");
    const { loadDotEnv } = await import("../../src/lib/env.ts");
    const result = loadDotEnv(envPath);
    expect(result["FOO"]).toBe("hello");
    expect(Object.keys(result).length).toBe(1);
  });

  it("skips blank lines", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "\n\nFOO=hello\n\n");
    const { loadDotEnv } = await import("../../src/lib/env.ts");
    const result = loadDotEnv(envPath);
    expect(result["FOO"]).toBe("hello");
    expect(Object.keys(result).length).toBe(1);
  });

  it("strips double quotes from values", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, 'TOKEN="my-secret-token"\n');
    const { loadDotEnv } = await import("../../src/lib/env.ts");
    const result = loadDotEnv(envPath);
    expect(result["TOKEN"]).toBe("my-secret-token");
  });

  it("strips single quotes from values", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "TOKEN='my-secret-token'\n");
    const { loadDotEnv } = await import("../../src/lib/env.ts");
    const result = loadDotEnv(envPath);
    expect(result["TOKEN"]).toBe("my-secret-token");
  });

  it("handles values containing = sign", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "URL=http://example.com?a=1&b=2\n");
    const { loadDotEnv } = await import("../../src/lib/env.ts");
    const result = loadDotEnv(envPath);
    expect(result["URL"]).toBe("http://example.com?a=1&b=2");
  });

  it("skips lines without = sign", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "INVALID_LINE\nFOO=bar\n");
    const { loadDotEnv } = await import("../../src/lib/env.ts");
    const result = loadDotEnv(envPath);
    expect(result["FOO"]).toBe("bar");
    expect(Object.keys(result).length).toBe(1);
  });
});

describe("getEnv", () => {
  it("returns process.env value if set", async () => {
    const { getEnv } = await import("../../src/lib/env.ts");
    process.env["__TEST_QA_FLOW_KEY__"] = "from-process-env";
    const result = getEnv("__TEST_QA_FLOW_KEY__");
    expect(result).toBe("from-process-env");
    delete process.env["__TEST_QA_FLOW_KEY__"];
  });

  it("returns undefined for missing key", async () => {
    const { getEnv } = await import("../../src/lib/env.ts");
    const result = getEnv("__DEFINITELY_NOT_SET_KEY_XYZ_123__");
    expect(result).toBe(undefined);
  });
});

describe("getEnvOrThrow", () => {
  it("throws if key is not set", async () => {
    const { getEnvOrThrow } = await import("../../src/lib/env.ts");
    expect(() => getEnvOrThrow("__DEFINITELY_NOT_SET_KEY_THROW_TEST__")).toThrow((err: Error) => {
        expect(err.message.includes("__DEFINITELY_NOT_SET_KEY_THROW_TEST__").toBeTruthy());
        return true;
      });
  });

  it("returns value if key is set in process.env", async () => {
    const { getEnvOrThrow } = await import("../../src/lib/env.ts");
    process.env["__TEST_QA_THROW_KEY__"] = "present-value";
    const result = getEnvOrThrow("__TEST_QA_THROW_KEY__");
    expect(result).toBe("present-value");
    delete process.env["__TEST_QA_THROW_KEY__"];
  });
});

describe("initEnv", () => {
  it("sets process.env for parsed keys not already present", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "INIT_TEST_KEY_NEW=newval\n");
    delete process.env["INIT_TEST_KEY_NEW"];
    const { initEnv } = await import("../../src/lib/env.ts");
    initEnv(envPath);
    expect(process.env["INIT_TEST_KEY_NEW"]).toBe("newval");
    delete process.env["INIT_TEST_KEY_NEW"];
  });

  it("does not overwrite existing process.env keys", async () => {
    makeTmp();
    const envPath = join(TMP_DIR, ".env");
    writeFileSync(envPath, "INIT_TEST_KEY_EXISTING=from-file\n");
    process.env["INIT_TEST_KEY_EXISTING"] = "already-set";
    const { initEnv } = await import("../../src/lib/env.ts");
    initEnv(envPath);
    expect(process.env["INIT_TEST_KEY_EXISTING"]).toBe("already-set");
    delete process.env["INIT_TEST_KEY_EXISTING"];
  });
});

describe("initEnv three-layer mode", () => {
  const KEYS = [
    "TL_ONLY_ENV",
    "TL_ONLY_ENVS",
    "TL_ONLY_LOCAL",
    "TL_ENV_AND_ENVS",
    "TL_ALL_THREE",
    "TL_SHELL_WINS",
  ];

  function cleanKeys(): void {
    for (const k of KEYS) delete process.env[k];
  }

  it("loads .env.local > .env.envs > .env in priority order", async () => {
    makeTmp();
    writeFileSync(
      join(TMP_DIR, ".env"),
      ["TL_ONLY_ENV=env", "TL_ENV_AND_ENVS=from-env", "TL_ALL_THREE=from-env"].join("\n") + "\n",
    );
    writeFileSync(
      join(TMP_DIR, ".env.envs"),
      ["TL_ONLY_ENVS=envs", "TL_ENV_AND_ENVS=from-envs", "TL_ALL_THREE=from-envs"].join("\n") + "\n",
    );
    writeFileSync(
      join(TMP_DIR, ".env.local"),
      ["TL_ONLY_LOCAL=local", "TL_ALL_THREE=from-local"].join("\n") + "\n",
    );

    cleanKeys();
    const { initEnv } = await import("../../src/lib/env.ts");
    const merged = initEnv({ cwd: TMP_DIR });

    expect(merged["TL_ONLY_ENV"]).toBe("env");
    expect(merged["TL_ONLY_ENVS"]).toBe("envs");
    expect(merged["TL_ONLY_LOCAL"]).toBe("local");
    expect(merged["TL_ENV_AND_ENVS"]).toBe("from-envs");
    expect(merged["TL_ALL_THREE"]).toBe("from-local");

    expect(process.env["TL_ALL_THREE"]).toBe("from-local");
    cleanKeys();
  });

  it("permissive when files missing", async () => {
    makeTmp();
    writeFileSync(join(TMP_DIR, ".env"), "TL_ONLY_ENV=only\n");
    // no .env.envs, no .env.local

    cleanKeys();
    const { initEnv } = await import("../../src/lib/env.ts");
    const merged = initEnv({ cwd: TMP_DIR });
    expect(merged["TL_ONLY_ENV"]).toBe("only");
    cleanKeys();
  });

  it("process.env keys win over all three layers", async () => {
    makeTmp();
    writeFileSync(join(TMP_DIR, ".env"), "TL_SHELL_WINS=from-env\n");
    writeFileSync(join(TMP_DIR, ".env.envs"), "TL_SHELL_WINS=from-envs\n");
    writeFileSync(join(TMP_DIR, ".env.local"), "TL_SHELL_WINS=from-local\n");

    cleanKeys();
    process.env["TL_SHELL_WINS"] = "from-shell";
    const { initEnv } = await import("../../src/lib/env.ts");
    initEnv({ cwd: TMP_DIR });
    expect(process.env["TL_SHELL_WINS"]).toBe("from-shell");
    cleanKeys();
  });
});
