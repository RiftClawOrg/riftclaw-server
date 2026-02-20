# RiftClaw Server (The Rift)

> **Persistent headless hub world for RiftClaw**

The Rift is the official central hub world for the RiftClaw ecosystem. It provides persistent player data, inventory management, and a meeting point for travelers from all worlds.

## 🎯 What It Does

- Connects to RiftClaw Relay as a "world" client
- Manages player accounts and sessions
- Persists inventory across world hops
- Validates passports (anti-cheat)
- Provides portal registry
- Handles chat between players

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     RiftClaw Relay                           │
│              wss://relay.riftclaw.com                        │
└─────────────────────────┬────────────────────────────────────┘
                          │
              ┌───────────▼────────────┐
              │    The Rift            │
              │    (This Repo)         │
              │  ┌──────────────────┐  │
              │  │ SQLite Database  │  │
              │  │ • Users          │  │
              │  │ • Inventory      │  │
              │  │ • Sessions       │  │
              │  │ • Portals        │  │
              │  └──────────────────┘  │
              └────────────────────────┘
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Initialize database
npm run db:init

# Start the server
npm start
```

## 📡 Protocol

The Rift connects to the Relay and handles:

### Incoming: `handoff_request`
When a player arrives from another world:
1. Validates passport
2. Loads/creates user account
3. Syncs inventory
4. Sends `handoff_confirm` with scene data

### Incoming: `discover`
When a player requests available portals:
1. Returns list of registered destinations
2. Includes reputation requirements
3. Shows locked/unlocked status

## 🎮 Features

### Guest Mode
- Anonymous access (no Discord required)
- Limited to 8 inventory slots
- Cannot trade
- Inventory cleared on disconnect

### Registered Users
- Discord OAuth link
- 64 inventory slots
- Can trade
- Persistent inventory
- Reputation tracking

### Inventory Validation
- No negative quantities
- Max stack size: 999
- Origin tracking (where item came from)
- Soulbound items (can't transfer)

### Reputation System
- Earned through quests, trades, participation
- Some portals require minimum reputation
- Prevents spam/abuse

## ⚙️ Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `RELAY_URL` | `wss://relay.riftclaw.com` | Relay WebSocket URL |
| `WORLD_NAME` | `the-rift` | World identifier |
| `WORLD_URL` | `https://rift.riftclaw.com` | World URL |
| `DB_PATH` | `./data/rift.db` | SQLite database path |
| `HTTP_PORT` | `3000` | HTTP API port |

## 🛢️ Database Schema

### Users
- `id` - Unique identifier
- `username` - Display name
- `discord_id` - Discord OAuth link
- `is_guest` - Guest flag
- `max_slots` - Inventory limit
- `can_trade` - Trading permission
- `reputation` - Community standing

### Inventory
- `user_id` - Owner
- `item_name` - Item identifier
- `quantity` - Stack size
- `origin_world` - Where it came from
- `soulbound` - Non-transferable flag

### Sessions
- Active connections
- Last seen timestamps
- Auto-cleanup after 30min

### Portals
- Registered destinations
- Public/private
- Reputation requirements

## 📊 HTTP API

### GET `/api/status`
```json
{
  "world": "the-rift",
  "players_online": 42,
  "relay_connected": true
}
```

### GET `/api/health`
```json
{
  "status": "healthy"
}
```

## 🧪 Testing

```bash
# Start server
npm start

# Check if connected to relay
# (Look for "Registered as 'the-rift'" in logs)

# Test HTTP API
curl http://localhost:3000/api/status
```

## 🚢 Deployment

### Replit
1. Import from GitHub
2. Set run command: `npm start`
3. Configure environment variables in Secrets

### VPS
```bash
git clone https://github.com/RiftClawOrg/riftclaw-server.git
cd riftclaw-server
npm install
npm run db:init
npm start
```

## 📄 License

MIT - See LICENSE file

## 🤝 Contributing

Part of the RiftClaw ecosystem. See main repo for guidelines.

---

**The Rift - Where all worlds meet** 🦞🌌
