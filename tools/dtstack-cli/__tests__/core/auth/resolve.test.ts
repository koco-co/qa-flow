import { describe, expect, test } from "bun:test";
import { resolveSession } from "../../../src/core/auth/resolve";
import type { Session } from "../../../src/core/auth/login";

const sess = (cookie: string): Session => ({ cookie, user: "u", tenantId: 1, tenantName: null, expiresAt: null });

describe("resolveSession", () => {
  test("uses DTSTACK_COOKIE env var when present", async () => {
    process.env.DTSTACK_COOKIE = "from-env=1";
    const out = await resolveSession({
      env: "ci78",
      config: { environments: { ci78: { baseUrl: "http://x" } }, datasources: {} },
      store: { load: async () => null, save: async () => {}, clear: async () => {} } as never,
      doLogin: async () => sess("never-called"),
    });
    expect(out.cookie).toBe("from-env=1");
    delete process.env.DTSTACK_COOKIE;
  });

  test("falls back to stored session when no env var", async () => {
    delete process.env.DTSTACK_COOKIE;
    const out = await resolveSession({
      env: "ci78",
      config: { environments: { ci78: { baseUrl: "http://x" } }, datasources: {} },
      store: { load: async () => sess("stored=1"), save: async () => {}, clear: async () => {} } as never,
      doLogin: async () => sess("never-called"),
    });
    expect(out.cookie).toBe("stored=1");
  });

  test("auto-logs-in when neither env var nor store has cookie", async () => {
    delete process.env.DTSTACK_COOKIE;
    const saved: Session[] = [];
    const out = await resolveSession({
      env: "ci78",
      config: {
        environments: { ci78: { baseUrl: "http://x", login: { username: "u", password: "p" } } },
        datasources: {},
      },
      store: { load: async () => null, save: async (_e, s) => { saved.push(s); }, clear: async () => {} } as never,
      doLogin: async () => sess("fresh=1"),
    });
    expect(out.cookie).toBe("fresh=1");
    expect(saved[0].cookie).toBe("fresh=1");
  });

  test("throws when no creds available for auto-login", async () => {
    delete process.env.DTSTACK_COOKIE;
    delete process.env.DTSTACK_USERNAME;
    delete process.env.DTSTACK_PASSWORD;
    expect(resolveSession({
      env: "ci78",
      config: { environments: { ci78: { baseUrl: "http://x" } }, datasources: {} },
      store: { load: async () => null, save: async () => {}, clear: async () => {} } as never,
      doLogin: async () => sess("x"),
    })).rejects.toThrow(/no credentials/i);
  });
});
