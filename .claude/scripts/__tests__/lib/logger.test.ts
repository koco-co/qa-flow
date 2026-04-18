import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

afterEach(() => {
  delete process.env["LOG_LEVEL"];
});

describe("logger", () => {
  it("createLogger returns object with 4 methods", async () => {
    const { createLogger } = await import("../../lib/logger.ts");
    const log = createLogger("test");
    assert.equal(typeof log.debug, "function");
    assert.equal(typeof log.info, "function");
    assert.equal(typeof log.warn, "function");
    assert.equal(typeof log.error, "function");
  });

  it("setLogLevel / getLogLevel roundtrip", async () => {
    const { setLogLevel, getLogLevel } = await import("../../lib/logger.ts");
    setLogLevel("error");
    assert.equal(getLogLevel(), "error");
    setLogLevel("debug");
    assert.equal(getLogLevel(), "debug");
    setLogLevel("info"); // reset to default
  });

  it("initLogLevel applies LOG_LEVEL env var", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import(
      "../../lib/logger.ts"
    );
    setLogLevel("info");
    process.env["LOG_LEVEL"] = "error";
    initLogLevel();
    assert.equal(getLogLevel(), "error");
    setLogLevel("info");
  });

  it("initLogLevel with invalid value keeps current level", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import(
      "../../lib/logger.ts"
    );
    setLogLevel("info");
    process.env["LOG_LEVEL"] = "garbage";
    initLogLevel();
    assert.equal(getLogLevel(), "info");
  });

  it("initLogLevel with LOG_LEVEL unset is a no-op", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import(
      "../../lib/logger.ts"
    );
    setLogLevel("warn");
    delete process.env["LOG_LEVEL"];
    initLogLevel();
    assert.equal(getLogLevel(), "warn");
    setLogLevel("info");
  });

  it("initLogLevel is case-insensitive", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import(
      "../../lib/logger.ts"
    );
    setLogLevel("info");
    process.env["LOG_LEVEL"] = "DEBUG";
    initLogLevel();
    assert.equal(getLogLevel(), "debug");
    setLogLevel("info");
  });
});
