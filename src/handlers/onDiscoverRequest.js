/**
 * Discover Request Handler
 * 
 * Responds to portal discovery requests
 */

const { dbAsync } = require('../db');
const SessionManager = require('../state/sessions');
const config = require('../config');

/**
 * Handle discover request
 * @param {Object} ws - WebSocket connection
 * @param {Object} message - Discover request
 */
async function onDiscoverRequest(ws, message) {
  const { agent_id } = message;

  console.log(`[Discover] Request from ${agent_id}`);

  try {
    // Get all public portals
    const portals = await dbAsync.all(
      'SELECT id, name, url, world_type, description, requires_reputation FROM portals WHERE is_public = 1'
    );

    // Get user's reputation (if we have a session)
    const session = SessionManager.get(agent_id);
    let userReputation = 0;
    
    if (session) {
      const User = require('../models/User');
      userReputation = await User.getReputation(session.userId);
    }

    // Filter portals by reputation requirement
    const availablePortals = portals.map(p => ({
      portal_id: p.id,
      name: p.name,
      destination_url: p.url,
      type: p.world_type,
      description: p.description,
      locked: userReputation < p.requires_reputation,
      required_reputation: p.requires_reputation
    }));

    const response = {
      type: 'discover_response',
      timestamp: Date.now() / 1000,
      world_name: config.WORLD_NAME,
      world_description: 'Central hub for travelers',
      portals: availablePortals,
      players_online: SessionManager.getOnlineCount(),
      your_reputation: userReputation
    };

    ws.send(JSON.stringify(response));
    console.log(`[Discover] Sent ${availablePortals.length} portals to ${agent_id}`);

  } catch (err) {
    console.error(`[Discover] Error: ${err.message}`);
    
    ws.send(JSON.stringify({
      type: 'error',
      timestamp: Date.now() / 1000,
      code: 'DISCOVER_ERROR',
      message: 'Failed to get portals'
    }));
  }
}

module.exports = onDiscoverRequest;
