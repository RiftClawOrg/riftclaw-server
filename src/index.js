#!/usr/bin/env node
/**
 * RiftClaw Server v1.0.0
 * 
 * The Rift - Persistent headless hub world
 * 
 * Connects to relay as a world client, manages:
 * - Player sessions
 * - Inventory persistence
 * - Portal registry
 * - Chat
 */

const http = require('http');
const RelayClient = require('./relay-client');
const { initSchema, close: closeDb } = require('./db');
const SessionManager = require('./state/sessions');
const config = require('./config');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     RiftClaw Server v1.0.0                                   ║
║     The Rift - Persistent Headless Hub World                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

World: ${config.DISPLAY_NAME}
Connecting to: ${config.RELAY_URL}
Database: ${config.DB_PATH}

Initializing...
`);

// Initialize database
initSchema();

// Start session cleanup
SessionManager.startCleanup(60000);

// Connect to relay
RelayClient.connect();

// Optional: HTTP API for stats
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/api/status') {
    res.end(JSON.stringify({
      world: config.WORLD_NAME,
      display_name: config.DISPLAY_NAME,
      relay_connected: RelayClient.isConnected,
      players_online: SessionManager.getOnlineCount(),
      timestamp: Date.now()
    }));
  } else if (req.url === '/api/health') {
    res.end(JSON.stringify({
      status: 'healthy',
      relay: RelayClient.isConnected ? 'connected' : 'disconnected'
    }));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(config.HTTP_PORT, () => {
  console.log(`[HTTP] API listening on port ${config.HTTP_PORT}`);
  console.log(`[HTTP] Status: http://localhost:${config.HTTP_PORT}/api/status`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Closing Rift server...');
  
  RelayClient.disconnect();
  server.close();
  await closeDb();
  
  console.log('[Shutdown] Rift server stopped');
  process.exit(0);
});

console.log('[Rift] Server initialized and waiting for travelers...');
