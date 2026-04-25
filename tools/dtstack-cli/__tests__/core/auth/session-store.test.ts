import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { SessionStore } from "../../../src/core/auth/session-store";

describe("SessionStore", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "dtcli-sess-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("save then load returns same session per env", async () => {
    const store = new SessionStore(join(dir, "session.json"));
    const sess = { cookie: "c=1", user: "u", tenantId: 1, tenantName: "t", expiresAt: null };
    await store.save("ci78", sess);
    expect(await store.load("ci78")).toEqual(sess);
  });

  test("load returns null for unknown env", async () => {
    const store = new SessionStore(join(dir, "session.json"));
    expect(await store.load("none")).toBeNull();
  });

  test("clear removes the env entry", async () => {
    const store = new SessionStore(join(dir, "session.json"));
    await store.save("ci78", { cookie: "x", user: "u", tenantId: null, tenantName: null, expiresAt: null });
    await store.clear("ci78");
    expect(await store.load("ci78")).toBeNull();
  });
});
