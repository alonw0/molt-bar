CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mood TEXT NOT NULL DEFAULT 'relaxed',
  position TEXT NOT NULL DEFAULT 'entrance',
  accessories TEXT NOT NULL DEFAULT '{}',
  entered_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Stats tracking
CREATE TABLE IF NOT EXISTS stats (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

-- Initialize total visits counter if not exists
INSERT OR IGNORE INTO stats (key, value) VALUES ('total_visits', 0);

-- Migration: Add accessories column if it doesn't exist (for existing databases)
-- SQLite doesn't have IF NOT EXISTS for columns, so we ignore errors
-- This is handled in code
