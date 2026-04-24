import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import {
  createSession,
  readSession,
  writeSession,
  withSessionLock,
  sessionIdFor,
} from "../../lib/progress-store.ts";
import type { Session } from "../../lib/progress-types.ts";

const TMP = join(tmpdir(), `progress-store-test-${process.pid}`);

before(() => {
  process.env.KATA_ROOT_OVERRIDE = TMP; // progress-store reads this via getEnv (see paths.ts kataRoot JSDoc)
  mkdirSync(TMP, { recursive: true });
});

after(() => {
  delete process.env.KATA_ROOT_OVERRIDE;
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
});

beforeEach(() => {
  process.env.KATA_ROOT_OVERRIDE = TMP;  // reset to canonical value
  try { rmSync(join(TMP, ".kata"), { recursive: true, force: true }); } catch {}
});

describe("sessionIdFor", () => {
  it("composes workflow/slug-env", () => {
    assert.equal(
      sessionIdFor({ workflow: "test-case-gen", slug: "prd-xxx", env: "default" }),
      "test-case-gen/prd-xxx-default",
    );
  });
});

describe("createSession + readSession", () => {
  it("creates an empty session with schema_version=1", () => {
    const session = createSession({
      project: "dataAssets",
      workflow: "test-case-gen",
      slug: "prd-a",
      env: "default",
      source: { type: "prd", path: "workspace/dataAssets/prds/x.md", mtime: null },
      meta: { mode: "normal" },
    });
    writeSession("dataAssets", session);

    const loaded = readSession("dataAssets", "test-case-gen/prd-a-default");
    assert.ok(loaded);
    assert.equal(loaded!.schema_version, 1);
    assert.equal(loaded!.session_id, "test-case-gen/prd-a-default");
    assert.equal(loaded!.tasks.length, 0);
    assert.deepEqual(loaded!.artifacts, {});
  });

  it("readSession returns null when file missing", () => {
    const loaded = readSession("dataAssets", "test-case-gen/missing-default");
    assert.equal(loaded, null);
  });
});

describe("withSessionLock", () => {
  it("serializes concurrent writes (no data loss)", async () => {
    const project = "dataAssets";
    const base = createSession({
      project, workflow: "w", slug: "s", env: "default",
      source: { type: "prd", path: "p", mtime: null }, meta: {},
    });
    writeSession(project, base);

    const runs = Array.from({ length: 5 }, (_, i) => i);
    await Promise.all(runs.map((n) =>
      withSessionLock(project, base.session_id, async () => {
        const cur = readSession(project, base.session_id)!;
        const updated: Session = {
          ...cur,
          meta: { ...cur.meta, [`k${n}`]: n },
          updated_at: new Date().toISOString(),
        };
        writeSession(project, updated);
      }),
    ));

    const final = readSession(project, base.session_id)!;
    for (const n of runs) {
      assert.equal(final.meta[`k${n}`], n);
    }
  });

  it("throws after LOCK_TIMEOUT_MS if lock not released", async () => {
    const project = "dataAssets";
    const base = createSession({
      project, workflow: "w", slug: "lock", env: "default",
      source: { type: "prd", path: "p", mtime: null }, meta: {},
    });
    writeSession(project, base);

    const lockDir = join(TMP, ".kata", project, "locks");
    mkdirSync(lockDir, { recursive: true });
    writeFileSync(join(lockDir, `${base.session_id.replace("/", "__")}.lock`), "99999");

    await assert.rejects(
      withSessionLock(project, base.session_id, async () => {}, { timeoutMs: 200 }),
      /lock/i,
    );
  });
});
