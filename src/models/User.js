/**
 * User Model
 * 
 * Manages user accounts, sessions, and guest mode
 */

const { v4: uuidv4 } = require('uuid');
const { dbAsync } = require('../db');
const config = require('../config');

class User {
  /**
   * Get or create user from passport
   * @param {Object} passport - The incoming passport
   * @returns {Object} User object
   */
  static async getOrCreateFromPassport(passport) {
    const { agent_id, agent_name } = passport;
    
    // Try to find existing user by agent_id
    let user = await dbAsync.get(
      'SELECT * FROM users WHERE id = ?',
      [agent_id]
    );

    if (user) {
      // Update last seen
      await dbAsync.run(
        'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
        [agent_id]
      );
      return user;
    }

    // Create new user (guest by default)
    const isGuest = true; // Until they link Discord
    const maxSlots = isGuest ? config.GUEST_MAX_SLOTS : config.MAX_INVENTORY_SLOTS;
    const canTrade = isGuest ? config.GUEST_CAN_TRADE : true;

    await dbAsync.run(
      `INSERT INTO users (id, username, is_guest, max_slots, can_trade, reputation)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [agent_id, agent_name || 'Traveler', isGuest, maxSlots, canTrade, config.REPUTATION_DEFAULT]
    );

    user = await dbAsync.get('SELECT * FROM users WHERE id = ?', [agent_id]);
    console.log(`[User] Created new ${isGuest ? 'guest' : 'registered'} user: ${agent_id}`);
    
    return user;
  }

  /**
   * Get user by Discord ID
   * @param {string} discordId - Discord user ID
   */
  static async getByDiscordId(discordId) {
    return await dbAsync.get(
      'SELECT * FROM users WHERE discord_id = ?',
      [discordId]
    );
  }

  /**
   * Link Discord account (upgrade from guest)
   * @param {string} userId - User ID
   * @param {string} discordId - Discord ID
   * @param {string} username - Discord username
   */
  static async linkDiscord(userId, discordId, username) {
    await dbAsync.run(
      `UPDATE users 
       SET discord_id = ?, username = ?, is_guest = 0, max_slots = ?, can_trade = 1
       WHERE id = ?`,
      [discordId, username, config.MAX_INVENTORY_SLOTS, userId]
    );
    console.log(`[User] ${userId} linked Discord: ${username}`);
  }

  /**
   * Update reputation
   * @param {string} userId - User ID
   * @param {number} delta - Amount to add (can be negative)
   */
  static async updateReputation(userId, delta) {
    await dbAsync.run(
      'UPDATE users SET reputation = reputation + ? WHERE id = ?',
      [delta, userId]
    );
  }

  /**
   * Get user's reputation
   * @param {string} userId - User ID
   */
  static async getReputation(userId) {
    const row = await dbAsync.get(
      'SELECT reputation FROM users WHERE id = ?',
      [userId]
    );
    return row ? row.reputation : 0;
  }

  /**
   * Check if user meets reputation threshold
   * @param {string} userId - User ID
   * @param {number} threshold - Required reputation
   */
  static async hasReputation(userId, threshold) {
    const rep = await this.getReputation(userId);
    return rep >= threshold;
  }

  /**
   * Clean up guest data on disconnect
   * @param {string} userId - Guest user ID
   */
  static async cleanupGuest(userId) {
    const user = await dbAsync.get('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (user && user.is_guest) {
      // Delete guest inventory
      await dbAsync.run('DELETE FROM inventory WHERE user_id = ?', [userId]);
      console.log(`[User] Cleaned up guest: ${userId}`);
    }
  }
}

module.exports = User;
