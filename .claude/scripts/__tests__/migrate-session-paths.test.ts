import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { after, beforeEach, describe, it } from "node:test";
import { applyMigration, planMigration } from "../migrate-session-paths.ts";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const FIXTURE_AUTH = join(REPO_ROOT, `.auth-test-fixture-${process.pid}`);

describe("migrate-session-paths", () => {
  beforeEach(() => {
    rmSync(FIXTURE_AUTH, { recursive: true, force: true });
    mkdirSync(FIXTURE_AUTH, { recursive: true });
  });

  after(() => {
    rmSync(FIXTURE_AUTH, { recursive: true, force: true });
  });

  it("planMigration returns empty when authDir absent", () => {
    assert.deepEqual(
      planMigration(join(REPO_ROOT, ".auth-nope-nope"), "dataAssets"),
      [],
    );
  });

  it("planMigration finds legacy session files", () => {
    writeFileSync(join(FIXTURE_AUTH, "session-ltqcdev.json"), "{}");
    writeFileSync(join(FIXTURE_AUTH, "session-ci63.json"), "{}");
    const plan = planMigration(FIXTURE_AUTH, "dataAssets");
    assert.equal(plan.length, 2);
    assert.equal(plan[0].action, "moved");
    assert.ok(plan[0].target.includes(join("dataAssets", "session-")));
  });

  it("planMigration marks skipped when target exists", () => {
    writeFileSync(join(FIXTURE_AUTH, "session-ltqcdev.json"), "{}");
    mkdirSync(join(FIXTURE_AUTH, "dataAssets"), { recursive: true });
    writeFileSync(
      join(FIXTURE_AUTH, "dataAssets", "session-ltqcdev.json"),
      "{}",
    );
    const plan = planMigration(FIXTURE_AUTH, "dataAssets");
    assert.equal(plan[0].action, "skipped_target_exists");
  });

  it("applyMigration in dry-run does not move files", () => {
    writeFileSync(join(FIXTURE_AUTH, "session-x.json"), "{}");
    const plan = planMigration(FIXTURE_AUTH, "dataAssets");
    const results = applyMigration(plan, { dryRun: true });
    assert.equal(results[0].action, "dry_run");
    assert.equal(existsSync(join(FIXTURE_AUTH, "session-x.json")), true);
    assert.equal(
      existsSync(join(FIXTURE_AUTH, "dataAssets", "session-x.json")),
      false,
    );
  });

  it("applyMigration actually moves files", () => {
    writeFileSync(join(FIXTURE_AUTH, "session-x.json"), "{}");
    const plan = planMigration(FIXTURE_AUTH, "dataAssets");
    applyMigration(plan, { dryRun: false });
    assert.equal(existsSync(join(FIXTURE_AUTH, "session-x.json")), false);
    assert.equal(
      existsSync(join(FIXTURE_AUTH, "dataAssets", "session-x.json")),
      true,
    );
  });

  it("applyMigration is idempotent — second run no-op", () => {
    writeFileSync(join(FIXTURE_AUTH, "session-x.json"), "{}");
    applyMigration(planMigration(FIXTURE_AUTH, "dataAssets"), {
      dryRun: false,
    });
    const plan2 = planMigration(FIXTURE_AUTH, "dataAssets");
    assert.equal(plan2.length, 0);
  });
});
