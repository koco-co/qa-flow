import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  configJsonPath,
  RESERVED_NAMES,
  validateProjectName,
} from "../../lib/create-project.ts";

describe("validateProjectName", () => {
  it("accepts camelCase name dataAssets", () => {
    const r = validateProjectName("dataAssets");
    assert.equal(r.valid, true);
    assert.equal(r.error, undefined);
  });

  it("accepts kebab-case name data-assets", () => {
    assert.equal(validateProjectName("data-assets").valid, true);
  });

  it("accepts all-lowercase pinyin xyzh", () => {
    assert.equal(validateProjectName("xyzh").valid, true);
  });

  it("rejects empty name", () => {
    const r = validateProjectName("");
    assert.equal(r.valid, false);
    assert.match(r.error!, /length/);
  });

  it("rejects single character (too short)", () => {
    const r = validateProjectName("a");
    assert.equal(r.valid, false);
    assert.match(r.error!, /length/);
  });

  it("rejects name over 32 chars", () => {
    const r = validateProjectName("a".repeat(33));
    assert.equal(r.valid, false);
    assert.match(r.error!, /length/);
  });

  it("rejects name starting with digit", () => {
    const r = validateProjectName("1project");
    assert.equal(r.valid, false);
    assert.match(r.error!, /character set/);
  });

  it("rejects name starting with dash", () => {
    const r = validateProjectName("-project");
    assert.equal(r.valid, false);
    assert.match(r.error!, /character set/);
  });

  it("rejects underscore", () => {
    const r = validateProjectName("my_project");
    assert.equal(r.valid, false);
    assert.match(r.error!, /character set/);
  });

  it("rejects space", () => {
    const r = validateProjectName("my project");
    assert.equal(r.valid, false);
  });

  it("rejects dot", () => {
    const r = validateProjectName("my.project");
    assert.equal(r.valid, false);
  });

  it("rejects slash", () => {
    const r = validateProjectName("my/project");
    assert.equal(r.valid, false);
  });

  it("rejects reserved name 'knowledge'", () => {
    const r = validateProjectName("knowledge");
    assert.equal(r.valid, false);
    assert.match(r.error!, /reserved/);
  });

  it("rejects every reserved name in RESERVED_NAMES", () => {
    for (const reserved of RESERVED_NAMES) {
      if (!/^[A-Za-z]/.test(reserved)) continue; // 保留名 '.repos'/'.temp' 本就被字符集规则拒
      const r = validateProjectName(reserved);
      assert.equal(r.valid, false, `expected "${reserved}" to be rejected`);
    }
  });
});

describe("configJsonPath", () => {
  it("respects CONFIG_JSON_PATH env override", () => {
    const original = process.env.CONFIG_JSON_PATH;
    process.env.CONFIG_JSON_PATH = "/tmp/custom-config.json";
    try {
      assert.equal(configJsonPath(), "/tmp/custom-config.json");
    } finally {
      if (original === undefined) delete process.env.CONFIG_JSON_PATH;
      else process.env.CONFIG_JSON_PATH = original;
    }
  });

  it("ignores empty CONFIG_JSON_PATH and uses repo default", () => {
    const original = process.env.CONFIG_JSON_PATH;
    process.env.CONFIG_JSON_PATH = "";
    try {
      const p = configJsonPath();
      assert.ok(p.endsWith("/config.json"), `expected default, got ${p}`);
    } finally {
      if (original === undefined) delete process.env.CONFIG_JSON_PATH;
      else process.env.CONFIG_JSON_PATH = original;
    }
  });

  it("defaults to <repoRoot>/config.json when CONFIG_JSON_PATH unset", () => {
    const original = process.env.CONFIG_JSON_PATH;
    delete process.env.CONFIG_JSON_PATH;
    try {
      const p = configJsonPath();
      assert.ok(p.endsWith("/config.json"));
      assert.ok(p.startsWith("/"), "absolute path");
    } finally {
      if (original !== undefined) process.env.CONFIG_JSON_PATH = original;
    }
  });
});
