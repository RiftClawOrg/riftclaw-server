/**
 * RiftClaw Server Configuration
 * 
 * The Rift - Central hub world configuration
 */

module.exports = {
  // Relay connection
  RELAY_URL: process.env.RELAY_URL || 'wss://relay.riftclaw.com',
  
  // World identity
  WORLD_NAME: process.env.WORLD_NAME || 'the-rift',
  WORLD_URL: process.env.WORLD_URL || 'https://rift.riftclaw.com',
  DISPLAY_NAME: process.env.DISPLAY_NAME || 'The Rift - Central Hub',
  
  // Server settings
  HTTP_PORT: parseInt(process.env.HTTP_PORT) || 3000,
  
  // Database
  DB_PATH: process.env.DB_PATH || './data/rift.db',
  
  // Game rules
  MAX_INVENTORY_SLOTS: 64,
  GUEST_MAX_SLOTS: 8,
  MAX_STACK_SIZE: 999,
  PASSPORT_MAX_AGE_MS: 5 * 60 * 1000, // 5 minutes
  
  // Guest mode
  GUEST_MODE_ENABLED: true,
  GUEST_CAN_TRADE: false,
  
  // Reputation
  REPUTATION_DEFAULT: 0.0,
  REPUTATION_THRESHOLD: 10.0,
  
  // Session
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_SUSPICIOUS: true
};
