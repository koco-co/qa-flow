import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parsePlan,
  type RepoConsent,
  type PlanFrontmatter,
} from "../lib/discuss.ts";
import { __internal } from "../lib/discuss.ts";

function buildFmWithConsent(consent: RepoConsent | null): string {
  const fm: PlanFrontmatter = {
    plan_version: 2,
    prd_slug: "round-trip",
    prd_path: "workspace/p/prds/202604/round-trip.md",
    project: "p",
    requirement_id: "1",
    requirement_name: "需求",
    created_at: "2026-04-24T10:00:00+08:00",
    updated_at: "2026-04-24T10:00:00+08:00",
    status: "discussing",
    discussion_rounds: 0,
    clarify_count: 0,
    auto_defaulted_count: 0,
    pending_count: 0,
    resume_anchor: "discuss-in-progress",
    knowledge_dropped: [],
    handoff_mode: null,
    repo_consent: consent,
  };
  return __internal.renderPlan(fm, [], "");
}

describe("lib/discuss — repo_consent round-trip", () => {
  it("preserves null consent", () => {
    const raw = buildFmWithConsent(null);
    const parsed = parsePlan(raw);
    assert.equal(parsed.frontmatter.repo_consent, null);
  });

  it("preserves consent with empty repos array", () => {
    const consent: RepoConsent = { repos: [], granted_at: "2026-04-24T10:01:00+08:00" };
    const parsed = parsePlan(buildFmWithConsent(consent));
    assert.deepEqual(parsed.frontmatter.repo_consent, consent);
  });

  it("preserves consent with single repo (no sha)", () => {
    const consent: RepoConsent = {
      repos: [{ path: "workspace/p/.repos/studio", branch: "master" }],
      granted_at: "2026-04-24T10:01:00+08:00",
    };
    const parsed = parsePlan(buildFmWithConsent(consent));
    assert.deepEqual(parsed.frontmatter.repo_consent, consent);
  });

  it("preserves consent with single repo (with sha)", () => {
    const consent: RepoConsent = {
      repos: [{ path: "workspace/p/.repos/studio", branch: "master", sha: "abc123" }],
      granted_at: "2026-04-24T10:01:00+08:00",
    };
    const parsed = parsePlan(buildFmWithConsent(consent));
    assert.deepEqual(parsed.frontmatter.repo_consent, consent);
  });

  it("preserves consent with multiple repos (mixed sha)", () => {
    const consent: RepoConsent = {
      repos: [
        { path: "workspace/p/.repos/studio", branch: "master", sha: "abc123" },
        { path: "workspace/p/.repos/backend", branch: "main" },
        { path: "workspace/p/.repos/shared", branch: "dev", sha: "def456" },
      ],
      granted_at: "2026-04-24T11:30:00+08:00",
    };
    const parsed = parsePlan(buildFmWithConsent(consent));
    assert.deepEqual(parsed.frontmatter.repo_consent, consent);
  });
});

describe("lib/discuss — repo_consent malformed input", () => {
  it("assigns null when repo_consent: block has no granted_at", () => {
    const raw = [
      "---",
      "plan_version: 2",
      "prd_slug: x",
      "prd_path: x",
      "project: p",
      "requirement_id: 1",
      "requirement_name: n",
      "created_at: 2026-04-24T10:00:00+08:00",
      "updated_at: 2026-04-24T10:00:00+08:00",
      "status: discussing",
      "discussion_rounds: 0",
      "clarify_count: 0",
      "auto_defaulted_count: 0",
      "pending_count: 0",
      "resume_anchor: discuss-in-progress",
      "knowledge_dropped: []",
      "handoff_mode: null",
      "repo_consent:",
      "  repos: []",
      "---",
      "",
      "# stub",
      "",
    ].join("\n");
    const parsed = parsePlan(raw);
    assert.equal(parsed.frontmatter.repo_consent, null);
  });
});
