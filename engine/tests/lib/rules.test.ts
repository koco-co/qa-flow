import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { loadXmindRules, buildRootName } from "../../lib/rules.ts";

const ROOT = resolve(import.meta.dirname, "../../../..");
const PROJECT = "test-rules-project";
const PROJECT_RULES_DIR = join(ROOT, "workspace", PROJECT, "rules");

before(() => {
  mkdirSync(PROJECT_RULES_DIR, { recursive: true });
});

after(() => {
  try {
    rmSync(join(ROOT, "workspace", PROJECT), { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("loadXmindRules without project", () => {
  it("returns defaults with non-empty template", () => {
    const rules = loadXmindRules();
    assert.ok(rules.root_title_template.length > 0);
    assert.ok(rules.iteration_id.length > 0);
  });
});

describe("loadXmindRules with project", () => {
  it("returns global defaults when no project rules exist", () => {
    const rules = loadXmindRules("nonexistent-project-xyz");
    assert.ok(rules.root_title_template.length > 0);
  });

  it("project rules override global when present", () => {
    writeFileSync(
      join(PROJECT_RULES_DIR, "xmind-structure.md"),
      "root_title_template: `信永v{{prd_version}}(#{{iteration_id}})`\niteration_id: 99\n",
      "utf-8",
    );
    const rules = loadXmindRules(PROJECT);
    assert.equal(rules.root_title_template, "信永v{{prd_version}}(#{{iteration_id}})");
    assert.equal(rules.iteration_id, "99");
  });

  it("project rules partially override (only what's specified)", () => {
    writeFileSync(
      join(PROJECT_RULES_DIR, "xmind-structure.md"),
      "iteration_id: 55\n",
      "utf-8",
    );
    const rules = loadXmindRules(PROJECT);
    // iteration_id overridden, root_title_template from global
    assert.equal(rules.iteration_id, "55");
    assert.ok(rules.root_title_template.length > 0);
  });
});

describe("buildRootName with project", () => {
  it("uses project-level template when available", () => {
    writeFileSync(
      join(PROJECT_RULES_DIR, "xmind-structure.md"),
      "root_title_template: `XY-v{{prd_version}}`\niteration_id: 1\n",
      "utf-8",
    );
    const name = buildRootName("v1.0.0", undefined, PROJECT);
    assert.equal(name, "XY-v1.0.0");
  });

  it("works without project (uses global)", () => {
    const name = buildRootName("v6.4.9");
    assert.ok(name.length > 0);
    assert.ok(name.includes("6.4.9"));
  });

  it("returns empty string for undefined version", () => {
    const name = buildRootName(undefined);
    assert.equal(name, "");
  });
});
