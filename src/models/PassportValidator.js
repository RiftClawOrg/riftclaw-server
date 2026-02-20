/**
 * Passport Validator
 * 
 * Validates incoming passports for security and integrity
 */

const config = require('../config');
const { dbAsync } = require('../db');

class PassportValidator {
  /**
   * Validate a passport
   * @param {Object} passport - The passport to validate
   * @returns {Object} { valid: boolean, reason?: string }
   */
  static validate(passport) {
    // Check required fields
    if (!passport) {
      return { valid: false, reason: 'missing_passport' };
    }

    if (!passport.agent_id) {
      return { valid: false, reason: 'missing_agent_id' };
    }

    if (!passport.source_world) {
      return { valid: false, reason: 'missing_source_world' };
    }

    if (!passport.target_world) {
      return { valid: false, reason: 'missing_target_world' };
    }

    // Check timestamp freshness
    if (!passport.timestamp) {
      return { valid: false, reason: 'missing_timestamp' };
    }

    const age = Date.now() - (passport.timestamp * 1000);
    if (age > config.PASSPORT_MAX_AGE_MS) {
      return { valid: false, reason: 'passport_expired' };
    }

    if (age < 0) {
      return { valid: false, reason: 'future_timestamp' };
    }

    // Validate inventory if present
    if (passport.inventory) {
      const inventoryValidation = this.validateInventory(passport.inventory);
      if (!inventoryValidation.valid) {
        return inventoryValidation;
      }
    }

    return { valid: true };
  }

  /**
   * Validate inventory data
   * @param {string} inventoryJson - JSON string of inventory
   * @returns {Object} { valid: boolean, reason?: string }
   */
  static validateInventory(inventoryJson) {
    let items;
    try {
      items = JSON.parse(inventoryJson);
    } catch (e) {
      return { valid: false, reason: 'invalid_inventory_json' };
    }

    if (!Array.isArray(items)) {
      return { valid: false, reason: 'inventory_not_array' };
    }

    // Check item count
    if (items.length > config.MAX_INVENTORY_SLOTS) {
      return { 
        valid: false, 
        reason: 'inventory_too_large',
        details: `${items.length} items, max ${config.MAX_INVENTORY_SLOTS}`
      };
    }

    // Validate each item
    for (const item of items) {
      // Check required fields
      if (!item.name) {
        return { valid: false, reason: 'item_missing_name' };
      }

      // Check quantity
      if (typeof item.quantity !== 'number' || item.quantity < 0) {
        return { 
          valid: false, 
          reason: 'invalid_quantity',
          details: `Item ${item.name}: quantity ${item.quantity}`
        };
      }

      if (item.quantity > config.MAX_STACK_SIZE) {
        return { 
          valid: false, 
          reason: 'quantity_too_large',
          details: `Item ${item.name}: ${item.quantity} > ${config.MAX_STACK_SIZE}`
        };
      }

      // Check for suspicious values
      if (!Number.isInteger(item.quantity)) {
        return { 
          valid: false, 
          reason: 'quantity_not_integer',
          details: `Item ${item.name}: ${item.quantity}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Log suspicious passport for audit
   * @param {Object} passport - The suspicious passport
   * @param {string} reason - Why it was rejected
   * @param {string} sourceIp - Source IP address
   */
  static async logSuspicious(passport, reason, details = '') {
    if (!config.LOG_SUSPICIOUS) return;

    const eventData = {
      agent_id: passport?.agent_id,
      source_world: passport?.source_world,
      target_world: passport?.target_world,
      reason,
      details
    };

    try {
      await dbAsync.run(
        'INSERT INTO audit_log (event_type, user_id, details) VALUES (?, ?, ?)',
        ['rejected_passport', passport?.agent_id, JSON.stringify(eventData)]
      );
      console.log(`[Audit] Suspicious passport logged: ${reason}`);
    } catch (err) {
      console.error('[Audit] Failed to log:', err.message);
    }
  }
}

module.exports = PassportValidator;
