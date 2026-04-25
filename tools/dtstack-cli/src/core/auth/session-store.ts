import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import type { Session } from "./login";

type StoreShape = Record<string, Session>;

export class SessionStore {
  constructor(private readonly filePath: string) {}

  private read(): StoreShape {
    if (!existsSync(this.filePath)) return {};
    try { return JSON.parse(readFileSync(this.filePath, "utf-8")) as StoreShape; }
    catch (err) { if (err instanceof SyntaxError) return {}; throw err; }
  }

  private write(data: StoreShape): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    try { chmodSync(this.filePath, 0o600); } catch { /* ignore on non-POSIX */ }
  }

  async load(env: string): Promise<Session | null> {
    return this.read()[env] ?? null;
  }

  async save(env: string, session: Session): Promise<void> {
    const data = this.read();
    data[env] = session;
    this.write(data);
  }

  async clear(env: string): Promise<void> {
    const data = this.read();
    delete data[env];
    this.write(data);
  }
}
