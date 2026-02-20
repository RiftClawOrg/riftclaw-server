/**
 * Inventory Model
 * 
 * Manages player items, validation, and persistence
 */

const { dbAsync } = require('../db');
const config = require('../config');

class Inventory {
  /**
   * Get user's inventory
   * @param {string} userId - User ID
   */
  static async getByUser(userId) {
    const items = await dbAsync.all(
      'SELECT * FROM inventory WHERE user_id = ? ORDER BY item_name',
      [userId]
    );
    
    return items.map(item => ({
      id: item.id,
      name: item.item_name,
      quantity: item.quantity,
      data: item.item_data ? JSON.parse(item.item_data) : {},
      origin: item.origin_world,
      soulbound: Boolean(item.soulbound)
    }));
  }

  /**
   * Add or update item
   * @param {string} userId - User ID
   * @param {Object} item - Item data
   * @param {string} originWorld - Where item came from
   */
  static async addItem(userId, item, originWorld = 'unknown') {
    const { name, quantity, data = {}, soulbound = false } = item;
    
    // Check if item exists
    const existing = await dbAsync.get(
      'SELECT * FROM inventory WHERE user_id = ? AND item_name = ?',
      [userId, name]
    );

    if (existing) {
      // Stack with existing
      const newQuantity = existing.quantity + quantity;
      if (newQuantity > config.MAX_STACK_SIZE) {
        throw new Error(`Stack limit exceeded: ${newQuantity} > ${config.MAX_STACK_SIZE}`);
      }
      
      await dbAsync.run(
        `UPDATE inventory 
         SET quantity = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND item_name = ?`,
        [newQuantity, userId, name]
      );
    } else {
      // Create new stack
      await dbAsync.run(
        `INSERT INTO inventory (user_id, item_name, quantity, item_data, origin_world, soulbound)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, name, quantity, JSON.stringify(data), originWorld, soulbound]
      );
    }
  }

  /**
   * Remove items
   * @param {string} userId - User ID
   * @param {string} itemName - Item name
   * @param {number} quantity - Amount to remove
   */
  static async removeItem(userId, itemName, quantity) {
    const existing = await dbAsync.get(
      'SELECT * FROM inventory WHERE user_id = ? AND item_name = ?',
      [userId, itemName]
    );

    if (!existing) {
      throw new Error('Item not found');
    }

    const newQuantity = existing.quantity - quantity;
    
    if (newQuantity < 0) {
      throw new Error('Not enough items');
    }

    if (newQuantity === 0) {
      // Remove entirely
      await dbAsync.run(
        'DELETE FROM inventory WHERE user_id = ? AND item_name = ?',
        [userId, itemName]
      );
    } else {
      // Update quantity
      await dbAsync.run(
        'UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND item_name = ?',
        [newQuantity, userId, itemName]
      );
    }
  }

  /**
   * Sync inventory from passport (on arrival)
   * @param {string} userId - User ID
   * @param {Array} items - Items from passport
   * @param {string} originWorld - Source world
   */
  static async syncFromPassport(userId, items, originWorld) {
    // For guests, clear and replace (no persistence)
    const user = await dbAsync.get('SELECT is_guest FROM users WHERE id = ?', [userId]);
    
    if (user?.is_guest) {
      await dbAsync.run('DELETE FROM inventory WHERE user_id = ?', [userId]);
    }

    // Add items from passport
    for (const item of items) {
      await this.addItem(userId, item, originWorld);
    }
  }

  /**
   * Prepare inventory for passport (on departure)
   * @param {string} userId - User ID
   * @returns {Array} Items for passport
   */
  static async prepareForPassport(userId) {
    const items = await this.getByUser(userId);
    
    // Don't include soulbound items (they stay in this world)
    return items
      .filter(item => !item.soulbound)
      .map(item => ({
        name: item.name,
        quantity: item.quantity,
        icon: item.data?.icon || '📦',
        type: item.data?.type || 'misc'
      }));
  }

  /**
   * Check if user can carry more items
   * @param {string} userId - User ID
   * @param {number} additionalSlots - How many new unique items
   */
  static async canAddSlots(userId, additionalSlots = 1) {
    const user = await dbAsync.get('SELECT max_slots FROM users WHERE id = ?', [userId]);
    const currentCount = await dbAsync.get(
      'SELECT COUNT(*) as count FROM inventory WHERE user_id = ?',
      [userId]
    );
    
    return (currentCount.count + additionalSlots) <= user.max_slots;
  }

  /**
   * Clear all items (for guests on disconnect)
   * @param {string} userId - User ID
   */
  static async clearAll(userId) {
    await dbAsync.run('DELETE FROM inventory WHERE user_id = ?', [userId]);
  }
}

module.exports = Inventory;
