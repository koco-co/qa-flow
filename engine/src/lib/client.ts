import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { repoRoot } from "../paths.ts";

let _db: Database.Database | null = null;

function dbPath(): string {
  return join(repoRoot(), ".kata", "kata.db");
}

export function getDb(): Database.Database {
  if (_db) return _db;
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  _db = new Database(path);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  return _db;
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}
