import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../..");
const templatesPath = resolve(repoRoot, ".claude/references/strategy-templates.md");

describe("strategy-templates.md", () => {
  const content = readFileSync(templatesPath, "utf8");

  const strategies = ["S1", "S2", "S3", "S4", "S5"];
  const agents = ["transform", "analyze", "writer"];

  for (const s of strategies) {
    for (const a of agents) {
      test(`contains section ## ${s} / ${a}`, () => {
        const header = `## ${s} / ${a}`;
        expect(content).toContain(header);
      });
    }
  }

  test("contains 命中顺序 section", () => {
    expect(content).toContain("## 命中顺序");
    expect(content).toContain("S5 → S2 → S3 → S1 → S4");
  });
});

describe("strategy-schema.json", () => {
  test("is valid JSON and exposes required definitions", () => {
    const schemaPath = resolve(repoRoot, ".claude/references/strategy-schema.json");
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    expect(schema.definitions).toBeDefined();
    expect(schema.definitions.SignalProfile).toBeDefined();
    expect(schema.definitions.StrategyResolution).toBeDefined();
    expect(schema.definitions.SignalLevel.enum).toEqual(["strong", "weak", "missing"]);
    expect(schema.definitions.StrategyId.enum).toEqual(["S1", "S2", "S3", "S4", "S5"]);
  });
});
