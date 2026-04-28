import { test, expect } from "bun:test";
import { join } from "node:path";
import { lintAgentFrontmatter } from "../../src/lint/skill-frontmatter.ts";

const FX = join(import.meta.dirname, "fixtures");
const KNOWN_SKILLS = new Set(["test-case-gen", "ui-autotest", "case-format", "daily-task", "knowledge-keeper", "playwright-cli", "using-kata"]);

test("good agent passes", () => {
  const r = lintAgentFrontmatter(join(FX, "agents-good/good-agent.md"), KNOWN_SKILLS);
  expect(r.passed).toBe(true);
});

test("A1: missing frontmatter flagged", () => {
  const r = lintAgentFrontmatter(join(FX, "agents-bad/no-frontmatter.md"), KNOWN_SKILLS);
  expect(r.violations.some((v) => v.rule === "A1")).toBe(true);
});

test("A2: missing owner_skill flagged", () => {
  const r = lintAgentFrontmatter(join(FX, "agents-bad/missing-owner.md"), KNOWN_SKILLS);
  expect(r.violations.some((v) => v.rule === "A2")).toBe(true);
});

test("A4: cross-skill reference flagged", () => {
  const r = lintAgentFrontmatter(join(FX, "agents-bad/cross-skill-ref.md"), KNOWN_SKILLS);
  expect(r.violations.some((v) => v.rule === "A4")).toBe(true);
});
