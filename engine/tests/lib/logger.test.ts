import { afterEach, describe, it, expect } from "bun:test";

afterEach(() => {
  delete process.env["LOG_LEVEL"];
});

describe("logger", () => {
  it("createLogger returns object with 4 methods", async () => {
    const { createLogger } = await import("../../lib/logger.ts");
    const log = createLogger("test");
    expect(typeof log.debug).toBe("function");
    expect(typeof log.info).toBe("function");
    expect(typeof log.warn).toBe("function");
    expect(typeof log.error).toBe("function");
  });

  it("setLogLevel / getLogLevel roundtrip", async () => {
    const { setLogLevel, getLogLevel } = await import("../../lib/logger.ts");
    setLogLevel("error");
    expect(getLogLevel()).toBe("error");
    setLogLevel("debug");
    expect(getLogLevel()).toBe("debug");
    setLogLevel("info"); // reset to default
  });

  it("initLogLevel applies LOG_LEVEL env var", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import(
      "../../lib/logger.ts"
    );
    setLogLevel("info");
    process.env["LOG_LEVEL"] = "error";
    initLogLevel();
    expect(getLogLevel()).toBe("error");
    setLogLevel("info");
  });

  it("initLogLevel with invalid value keeps current level", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import(
      "../../lib/logger.ts"
    );
    setLogLevel("info");
    process.env["LOG_LEVEL"] = "garbage";
    initLogLevel();
    expect(getLogLevel()).toBe("info");
  });

  it("initLogLevel with LOG_LEVEL unset is a no-op", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import(
      "../../lib/logger.ts"
    );
    setLogLevel("warn");
    delete process.env["LOG_LEVEL"];
    initLogLevel();
    expect(getLogLevel()).toBe("warn");
    setLogLevel("info");
  });

  it("initLogLevel is case-insensitive", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import(
      "../../lib/logger.ts"
    );
    setLogLevel("info");
    process.env["LOG_LEVEL"] = "DEBUG";
    initLogLevel();
    expect(getLogLevel()).toBe("debug");
    setLogLevel("info");
  });
});
