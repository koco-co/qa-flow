CREATE TABLE IF NOT EXISTS projects (
  name TEXT PRIMARY KEY,
  display_name TEXT,
  path TEXT NOT NULL,
  last_active_at INTEGER,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS preferences (
  key TEXT PRIMARY KEY,
  value TEXT
);
