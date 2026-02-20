/**
 * Relay Client
 * 
 * Connects to RiftClaw Relay as a "world" client
 */

const WebSocket = require('ws');
const config = require('../config');
const onHandoffRequest = require('./handlers/onHandoffRequest');
const onDiscoverRequest = require('./handlers/onDiscoverRequest');
const SessionManager = require('./state/sessions');

class RelayClient {
  constructor() {
    this.ws = null;
    this.reconnectInterval = 5000;
    this.pingInterval = 15000;
    this.isConnected = false;
  }

  /**
   * Connect to relay
   */
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log('[Relay] Already connected or connecting');
      return;
    }

    console.log(`[Relay] Connecting to ${config.RELAY_URL}...`);

    this.ws = new WebSocket(config.RELAY_URL);

    this.ws.on('open', () => {
      console.log('[Relay] Connected!');
      this.isConnected = true;
      this.register();
      this.startPingInterval();
    });

    this.ws.on('message', (data) => {
      this.handleMessage(data);
    });

    this.ws.on('close', (code, reason) => {
      console.log(`[Relay] Disconnected (${code}): ${reason}`);
      this.isConnected = false;
      this.stopPingInterval();
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error(`[Relay] Error: ${err.message}`);
      this.isConnected = false;
    });
  }

  /**
   * Register as a world
   */
  register() {
    const registration = {
      type: 'register_world',
      agent_id: `rift-server-${Date.now()}`,
      world_name: config.WORLD_NAME,
      world_url: config.WORLD_URL,
      display_name: config.DISPLAY_NAME,
      capabilities: ['persistent', 'inventory', 'chat', 'portals']
    };

    this.send(registration);
    console.log(`[Relay] Registered as '${config.WORLD_NAME}'`);
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(data) {
    try {
      const message = JSON.parse(data);
      console.log(`[Relay] Received: ${message.type}`);

      switch (message.type) {
        case 'welcome':
          console.log(`[Relay] Welcome from ${message.relay_name} v${message.relay_version}`);
          break;

        case 'register_confirm':
          console.log(`[Relay] Registration confirmed: ${message.status}`);
          break;

        case 'handoff_request':
          await onHandoffRequest(this.ws, message);
          break;

        case 'discover':
          await onDiscoverRequest(this.ws, message);
          break;

        case 'pong':
          // Keep-alive response
          break;

        case 'error':
          console.error(`[Relay] Error: ${message.message}`);
          break;

        default:
          console.log(`[Relay] Unknown message type: ${message.type}`);
      }
    } catch (err) {
      console.error(`[Relay] Failed to handle message: ${err.message}`);
    }
  }

  /**
   * Send message to relay
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('[Relay] Cannot send - not connected');
    }
  }

  /**
   * Start keep-alive ping
   */
  startPingInterval() {
    this.pingTimer = setInterval(() => {
      this.send({
        type: 'ping',
        agent_id: 'rift-server',
        timestamp: Date.now() / 1000
      });
    }, this.pingInterval);
  }

  /**
   * Stop keep-alive ping
   */
  stopPingInterval() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Schedule reconnect
   */
  scheduleReconnect() {
    console.log(`[Relay] Reconnecting in ${this.reconnectInterval}ms...`);
    setTimeout(() => this.connect(), this.reconnectInterval);
  }

  /**
   * Graceful shutdown
   */
  disconnect() {
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close(1000, 'Server shutting down');
    }
  }
}

module.exports = new RelayClient();
