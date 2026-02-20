/**
 * Session Manager
 * 
 * Tracks active player connections
 */

const { dbAsync } = require('../db');
const config = require('../config');

class SessionManager {
  constructor() {
    this.activeSessions = new Map(); // agent_id -> session data
  }

  /**
   * Create new session
   * @param {string} userId - User ID
   * @param {string} agentId - Agent/connection ID
   * @param {string} worldId - Current world (if any)
   */
  async create(userId, agentId, worldId = null) {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await dbAsync.run(
      `INSERT INTO sessions (id, user_id, agent_id, world_id)
       VALUES (?, ?, ?, ?)`,
      [sessionId, userId, agentId, worldId]
    );

    this.activeSessions.set(agentId, {
      id: sessionId,
      userId,
      agentId,
      worldId,
      connectedAt: Date.now()
    });

    console.log(`[Session] Created: ${agentId} for user ${userId}`);
    return sessionId;
  }

  /**
   * Update session (heartbeat)
   * @param {string} agentId - Agent ID
   */
  async update(agentId) {
    const session = this.activeSessions.get(agentId);
    if (!session) return;

    await dbAsync.run(
      'UPDATE sessions SET last_seen = CURRENT_TIMESTAMP WHERE agent_id = ?',
      [agentId]
    );

    session.lastSeen = Date.now();
  }

  /**
   * Get session by agent ID
   * @param {string} agentId - Agent ID
   */
  get(agentId) {
    return this.activeSessions.get(agentId);
  }

  /**
   * End session
   * @param {string} agentId - Agent ID
   */
  async end(agentId) {
    const session = this.activeSessions.get(agentId);
    if (!session) return;

    await dbAsync.run(
      'DELETE FROM sessions WHERE agent_id = ?',
      [agentId]
    );

    this.activeSessions.delete(agentId);
    console.log(`[Session] Ended: ${agentId}`);

    return session;
  }

  /**
   * Get all active sessions
   */
  getAll() {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get online player count
   */
  getOnlineCount() {
    return this.activeSessions.size;
  }

  /**
   * Clean up stale sessions
   */
  async cleanup() {
    const cutoff = new Date(Date.now() - config.SESSION_TIMEOUT_MS).toISOString();
    
    const result = await dbAsync.run(
      'DELETE FROM sessions WHERE last_seen < ?',
      [cutoff]
    );

    if (result.changes > 0) {
      console.log(`[Session] Cleaned up ${result.changes} stale sessions`);
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanup(intervalMs = 60000) {
    setInterval(() => this.cleanup(), intervalMs);
    console.log(`[Session] Cleanup started (every ${intervalMs}ms)`);
  }
}

module.exports = new SessionManager();
