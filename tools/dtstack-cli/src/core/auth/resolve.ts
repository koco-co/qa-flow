import type { DtStackCliConfig } from "../config/schema";
import type { Session } from "./login";
import type { SessionStore } from "./session-store";

export interface ResolveSessionOptions {
  readonly env: string;
  readonly config: DtStackCliConfig;
  readonly store: SessionStore;
  readonly doLogin: (baseUrl: string, username: string, password: string) => Promise<Session>;
}

const FAKE_USER = "external";

export async function resolveSession(opts: ResolveSessionOptions): Promise<Session> {
  if (process.env.DTSTACK_COOKIE) {
    return { cookie: process.env.DTSTACK_COOKIE, user: FAKE_USER, tenantId: null, tenantName: null, expiresAt: null };
  }

  const stored = await opts.store.load(opts.env);
  if (stored) return stored;

  const envCfg = opts.config.environments[opts.env];
  if (!envCfg) throw new Error(`unknown environment: ${opts.env}`);
  const username = process.env.DTSTACK_USERNAME ?? envCfg.login?.username;
  const password = process.env.DTSTACK_PASSWORD ?? envCfg.login?.password;
  if (!username || !password) {
    throw new Error("no credentials available for auto-login (set login.username/password in config or DTSTACK_USERNAME/DTSTACK_PASSWORD)");
  }
  const fresh = await opts.doLogin(envCfg.baseUrl, username, password);
  await opts.store.save(opts.env, fresh);
  return fresh;
}
