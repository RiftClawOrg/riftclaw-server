/**
 * Handoff Request Handler
 * 
 * Handles incoming travelers from other worlds
 */

const User = require('../models/User');
const Inventory = require('../models/Inventory');
const PassportValidator = require('../models/PassportValidator');
const SessionManager = require('../state/sessions');
const config = require('../config');

/**
 * Handle incoming handoff request
 * @param {Object} ws - WebSocket connection to relay
 * @param {Object} message - The handoff request message
 */
async function onHandoffRequest(ws, message) {
  const { passport, from_agent, from_world } = message;

  console.log(`[Handoff] Request from ${from_agent} (${from_world})`);

  // Step 1: Validate passport
  const validation = PassportValidator.validate(passport);
  if (!validation.valid) {
    console.log(`[Handoff] Rejected: ${validation.reason}`);
    
    await PassportValidator.logSuspicious(passport, validation.reason, validation.details);
    
    sendError(ws, 'handoff_rejected', {
      reason: validation.reason,
      message: `Invalid passport: ${validation.reason}`
    });
    return;
  }

  try {
    // Step 2: Get or create user
    const user = await User.getOrCreateFromPassport(passport);
    
    // Step 3: Check reputation (if required)
    const reputationRequired = config.REPUTATION_THRESHOLD;
    const hasReputation = await User.hasReputation(user.id, reputationRequired);
    
    if (!hasReputation && !user.is_guest) {
      console.log(`[Handoff] Rejected: low reputation (${user.reputation} < ${reputationRequired})`);
      
      sendError(ws, 'handoff_rejected', {
        reason: 'low_reputation',
        message: `Reputation too low (need ${reputationRequired}, have ${user.reputation})`
      });
      return;
    }

    // Step 4: Sync inventory from passport
    if (passport.inventory) {
      try {
        const items = JSON.parse(passport.inventory);
        await Inventory.syncFromPassport(user.id, items, from_world);
        console.log(`[Handoff] Synced ${items.length} items for ${user.id}`);
      } catch (err) {
        console.error(`[Handoff] Inventory sync failed: ${err.message}`);
        // Continue anyway - don't block travel for inventory issues
      }
    }

    // Step 5: Create session
    await SessionManager.create(user.id, passport.agent_id, 'the-rift');

    // Step 6: Get current inventory for response
    const currentInventory = await Inventory.prepareForPassport(user.id);

    // Step 7: Get scene data (portals, etc.)
    const scene = await buildScene();

    // Step 8: Send handoff_confirm with scene
    const confirmMessage = {
      type: 'handoff_confirm',
      timestamp: Date.now() / 1000,
      passport: {
        ...passport,
        inventory: JSON.stringify(currentInventory),
        target_world: config.WORLD_NAME,
        target_url: config.WORLD_URL
      },
      scene
    };

    ws.send(JSON.stringify(confirmMessage));
    console.log(`[Handoff] Confirmed for ${passport.agent_id}`);

  } catch (err) {
    console.error(`[Handoff] Error processing: ${err.message}`);
    
    sendError(ws, 'handoff_rejected', {
      reason: 'processing_error',
      message: 'Failed to process handoff'
    });
  }
}

/**
 * Build scene data for arriving player
 */
async function buildScene() {
  const { dbAsync } = require('../db');
  
  // Get available portals
  const portals = await dbAsync.all(
    'SELECT id, name, url, world_type, description FROM portals WHERE is_public = 1'
  );

  return {
    name: config.DISPLAY_NAME,
    description: 'Central hub for all travelers. Safe zone, no PvP.',
    spawn_point: { x: 0, y: 1, z: 0 },
    assets: {
      textures: ['/assets/floor.png', '/assets/sky.jpg'],
      models: ['/assets/portal.glb']
    },
    portals: portals.map(p => ({
      id: p.id,
      name: p.name,
      url: p.url,
      type: p.world_type,
      description: p.description
    })),
    players_online: SessionManager.getOnlineCount(),
    rules: {
      pvp: false,
      trading: true,
      building: false
    }
  };
}

/**
 * Send error response
 */
function sendError(ws, type, data) {
  ws.send(JSON.stringify({
    type,
    timestamp: Date.now() / 1000,
    ...data
  }));
}

module.exports = onHandoffRequest;
