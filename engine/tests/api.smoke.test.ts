import { test, expect } from "bun:test";
import { KATA_ENGINE_VERSION, repoRoot, listProjects } from "../src/api.ts";

test("api.ts: KATA_ENGINE_VERSION exported", () => {
  expect(KATA_ENGINE_VERSION).toBe("3.0.0-alpha.1");
});

test("api.ts: repoRoot returns absolute path", () => {
  const root = repoRoot();
  expect(root.startsWith("/")).toBe(true);
});

test("api.ts: listProjects returns array of strings", () => {
  const projects = listProjects();
  expect(Array.isArray(projects)).toBe(true);
  for (const p of projects) {
    expect(typeof p).toBe("string");
    expect(p.startsWith(".")).toBe(false);
  }
});
