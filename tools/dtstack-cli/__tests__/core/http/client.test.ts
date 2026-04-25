import { afterEach, describe, expect, mock, test } from "bun:test";
import { DtStackClient, MAX_RETRY_ATTEMPTS } from "../../../src/core/http/client";

describe("DtStackClient", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  test("post sends JSON body and cookie header", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 1, data: "ok" }))),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new DtStackClient({
      baseUrl: "http://example.test",
      cookie: "dt_token=abc",
    });

    const result = await client.post<string>("/api/echo", { foo: 1 });
    expect(result.code).toBe(1);
    const [url, opts] = (fetchMock as ReturnType<typeof mock>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://example.test/api/echo");
    expect((opts.headers as Record<string, string>).cookie).toBe("dt_token=abc");
    expect(JSON.parse(opts.body as string)).toEqual({ foo: 1 });
  });

  test("postWithProjectId sets X-Project-Id header", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 1, data: null }))),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const client = new DtStackClient({ baseUrl: "http://x", cookie: "c" });
    await client.postWithProjectId("/api/p", {}, 42);
    const [, opts] = (fetchMock as ReturnType<typeof mock>).mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["X-Project-Id"]).toBe("42");
  });

  test("retries on 502/503/504 then throws", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response("oops", { status: 502 })),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const origSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: () => void) => { fn(); return 0 as never; }) as never;
    try {
      const client = new DtStackClient({ baseUrl: "http://x", cookie: "c" });
      await expect(client.post("/api/x")).rejects.toThrow(/502/);
      expect(fetchMock.mock.calls.length).toBe(MAX_RETRY_ATTEMPTS);
    } finally {
      globalThis.setTimeout = origSetTimeout;
    }
  });
});
