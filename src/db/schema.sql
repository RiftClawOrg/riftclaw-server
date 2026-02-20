-- RiftClaw Server Database Schema
-- SQLite3

-- Users table (accounts)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  discord_id TEXT UNIQUE,
  is_guest BOOLEAN DEFAULT 0,
  max_slots INTEGER DEFAULT 64,
  can_trade BOOLEAN DEFAULT 1,
  reputation REAL DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for Discord lookups
CREATE INDEX IF NOT EXISTS idx_users_discord ON users(discord_id);

-- Sessions (active connections)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  world_id TEXT,
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);

-- Inventory (player items)
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  item_data TEXT, -- JSON string
  origin_world TEXT, -- e.g., "minecraft-server-xyz"
  soulbound BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, item_name)
);

CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);

-- Portals (registered destinations from this world)
CREATE TABLE IF NOT EXISTS portals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  world_type TEXT DEFAULT 'web', -- web, minecraft, roblox
  is_public BOOLEAN DEFAULT 1,
  requires_reputation REAL DEFAULT 0.0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat history (optional, for moderation)
CREATE TABLE IF NOT EXISTS chat_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  channel TEXT DEFAULT 'global',
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_channel ON chat_history(channel);

-- Audit log (suspicious activity)
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL, -- 'rejected_passport', 'invalid_item', etc.
  user_id TEXT,
  details TEXT, -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default portals
INSERT OR IGNORE INTO portals (id, name, url, world_type, description) VALUES
  ('portal_arena', 'Arena', 'https://arena.riftclaw.com', 'web', 'Combat training ground'),
  ('portal_forest', 'Forest', 'https://forest.riftclaw.com', 'web', 'Nature sanctuary'),
  ('portal_minecraft', 'Minecraft Survival', 'minecraft://riftclaw.mc', 'minecraft', 'Vanilla survival server');
