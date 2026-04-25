import { getDb } from "./client.ts";
import { SCHEMA_SQL } from "./schema.ts";

export function initDatabase(): void {
  const db = getDb();
  db.exec(SCHEMA_SQL);
  console.error("[db] schema initialized");
}
