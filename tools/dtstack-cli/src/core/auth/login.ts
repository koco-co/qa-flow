import { rsaEncrypt } from "./encrypt";

export interface Session {
  readonly cookie: string;
  readonly user: string;
  readonly tenantId: number | null;
  readonly tenantName: string | null;
  readonly expiresAt: string | null;
}

export interface PerformLoginOptions {
  readonly baseUrl: string;
  readonly username: string;
  readonly password: string;
  readonly encrypt?: (msg: string, pubKey: string) => string;
}

interface PublicKeyResp { readonly code: number; readonly data: string }

const COOKIE_KEYS = [
  "dt_token", "dt_user_id", "dt_username", "DT_SESSION_ID",
  "dt_tenant_id", "dt_tenant_name", "dt_product_code",
];

function parseSetCookie(headerValue: string | null): Map<string, string> {
  const out = new Map<string, string>();
  if (!headerValue) return out;
  for (const piece of headerValue.split(/,(?=\s*[A-Za-z_]+=)/)) {
    const [kv] = piece.trim().split(";");
    const eq = kv.indexOf("=");
    if (eq > 0) out.set(kv.slice(0, eq).trim(), kv.slice(eq + 1).trim());
  }
  return out;
}

function buildCookieHeader(map: Map<string, string>): string {
  const parts: string[] = [];
  for (const k of COOKIE_KEYS) {
    const v = map.get(k);
    if (v !== undefined) parts.push(`${k}=${v}`);
  }
  return parts.join("; ");
}

export async function performLogin(opts: PerformLoginOptions): Promise<Session> {
  const encrypt = opts.encrypt ?? rsaEncrypt;
  const baseUrl = opts.baseUrl.replace(/\/+$/, "");

  const pubResp = await fetch(`${baseUrl}/uic/api/v2/account/login/get-publi-key`);
  const pubJson = (await pubResp.json()) as PublicKeyResp;
  if (pubJson.code !== 1) throw new Error("failed to fetch public key");

  const encrypted = encrypt(opts.password, pubJson.data);
  const form = new URLSearchParams({ username: opts.username, password: encrypted });

  const loginResp = await fetch(`${baseUrl}/uic/api/v2/account/login`, {
    method: "POST",
    body: form,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  if (!loginResp.ok) {
    throw new Error(`login HTTP ${loginResp.status}: ${await loginResp.text()}`);
  }
  const cookieMap = parseSetCookie(loginResp.headers.get("set-cookie"));
  if (!cookieMap.has("dt_token")) throw new Error("login response missing dt_token cookie");

  const tenantIdStr = cookieMap.get("dt_tenant_id");
  return {
    cookie: buildCookieHeader(cookieMap),
    user: cookieMap.get("dt_username") ?? opts.username,
    tenantId: tenantIdStr ? Number(tenantIdStr) : null,
    tenantName: cookieMap.get("dt_tenant_name") ?? null,
    expiresAt: null,
  };
}
