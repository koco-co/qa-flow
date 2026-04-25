import { afterEach, describe, expect, mock, test } from "bun:test";
import { performLogin } from "../../../src/core/auth/login";

describe("performLogin", () => {
  const origFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = origFetch; });

  test("fetches public key, encrypts password, posts login form, returns cookie+user", async () => {
    const fetchMock = mock((url: string | URL) => {
      const u = String(url);
      if (u.endsWith("/uic/api/v2/account/login/get-publi-key")) {
        return Promise.resolve(new Response(JSON.stringify({ code: 1, data: "PUBKEY_B64" })));
      }
      if (u.endsWith("/uic/api/v2/account/login")) {
        return Promise.resolve(new Response(JSON.stringify({ code: 1, data: { userId: 1 } }), {
          headers: {
            "set-cookie": "dt_token=tok; Path=/, dt_user_id=1; Path=/, dt_username=admin; Path=/, DT_SESSION_ID=sess; Path=/, dt_tenant_id=10481; Path=/, dt_tenant_name=t1; Path=/",
          },
        }));
      }
      throw new Error(`unexpected url: ${u}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const session = await performLogin({
      baseUrl: "http://example.test",
      username: "admin",
      password: "p",
      encrypt: () => "ENC",
    });

    expect(session.cookie).toContain("dt_token=tok");
    expect(session.user).toBe("admin");
    expect(session.tenantId).toBe(10481);
  });
});
