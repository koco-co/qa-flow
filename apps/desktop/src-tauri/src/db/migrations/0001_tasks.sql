CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  command TEXT NOT NULL,
  session_id TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  status TEXT NOT NULL,
  log_path TEXT NOT NULL,
  retain_until INTEGER,
  pinned INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  first_task_id TEXT NOT NULL,
  first_input_summary TEXT,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL,
  task_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tasks_started_at ON tasks(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active_at DESC);
