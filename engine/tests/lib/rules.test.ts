import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import { loadXmindRules, buildRootName } from "../../src/lib/rules.ts";

const ROOT = resolve(import.meta.dirname, "../../..");
const PROJECT = "test-rules-project";
const PROJECT_RULES_DIR = join(ROOT, "workspace", PROJECT, "rules");

beforeEach(() => {
  mkdirSync(PROJECT_RULES_DIR, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(join(ROOT, "workspace", PROJECT), { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("loadXmindRules without project", () => {
  it("returns defaults with non-empty template", () => {
    const rules = loadXmindRules();
    expect(rules.root_title_template.length > 0).toBeTruthy();
    expect(rules.iteration_id.length > 0).toBeTruthy();
  });
});

describe("loadXmindRules with project", () => {
  it("returns global defaults when no project rules exist", () => {
    const rules = loadXmindRules("nonexistent-project-xyz");
    expect(rules.root_title_template.length > 0).toBeTruthy();
  });

  it("project rules override global when present", () => {
    writeFileSync(
      join(PROJECT_RULES_DIR, "xmind-structure.md"),
      "root_title_template: `信永v{{prd_version}}(#{{iteration_id}})`\niteration_id: 99\n",
      "utf-8",
    );
    const rules = loadXmindRules(PROJECT);
    expect(rules.root_title_template).toBe("信永v{{prd_version}}(#{{iteration_id}})");
    expect(rules.iteration_id).toBe("99");
  });

  it("project rules partially override (only what's specified)", () => {
    writeFileSync(
      join(PROJECT_RULES_DIR, "xmind-structure.md"),
      "iteration_id: 55\n",
      "utf-8",
    );
    const rules = loadXmindRules(PROJECT);
    // iteration_id overridden, root_title_template from global
    expect(rules.iteration_id).toBe("55");
    expect(rules.root_title_template.length > 0).toBeTruthy();
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
    expect(name).toBe("XY-v1.0.0");
  });

  it("works without project (uses global)", () => {
    const name = buildRootName("v6.4.9");
    expect(name.length > 0).toBeTruthy();
    expect(name.includes("6.4.9").toBeTruthy());
  });

  it("returns empty string for undefined version", () => {
    const name = buildRootName(undefined);
    expect(name).toBe("");
  });
});
