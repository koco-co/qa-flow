import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const LOAD_PATH = resolve(REPO_ROOT, "engine/src/ui-autotest/load-site-knowledge.ts");
const TMP_DIR = join(tmpdir(), `kata-load-sk-test-${process.pid}`);

describe("loadSiteKnowledge", () => {
  const sitesDir = join(TMP_DIR, "knowledge/sites/example.com");

  beforeEach(() => {
    mkdirSync(sitesDir, { recursive: true });
    writeFileSync(join(sitesDir, "selectors.md"),
      "---\ntype: site-selectors\ndomain: example.com\n---\n# Selectors\n- button: `#submit`\n");
    writeFileSync(join(sitesDir, "traps.md"),
      "---\ntype: site-traps\ndomain: example.com\n---\n# Traps\n- Modal 2 秒后才可点击\n");
    writeFileSync(join(sitesDir, "overview.md"),
      "---\ntype: site-overview\ndomain: example.com\n---\n# Overview\n- URL: https://example.com\n");
  });

  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("should return knowledge summary for known domain", async () => {
    const { loadSiteKnowledge } = await import(`file://${LOAD_PATH}`);
    const result = loadSiteKnowledge("example.com", TMP_DIR);
    expect(result).not.toBeNull();
    expect(result).toContain("example.com");
    expect(result).toContain("#submit");
  });

  it("should return null for unknown domain", async () => {
    const { loadSiteKnowledge } = await import(`file://${LOAD_PATH}`);
    const result = loadSiteKnowledge("unknown.example.com", TMP_DIR);
    expect(result).toBeNull();
  });

  it("should handle empty sites directory", async () => {
    const { loadSiteKnowledge } = await import(`file://${LOAD_PATH}`);
    const result = loadSiteKnowledge("empty.example.com", TMP_DIR);
    expect(result).toBeNull();
  });
});
