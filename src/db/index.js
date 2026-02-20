/**
 * Database Module
 * SQLite3 wrapper for RiftClaw Server
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure data directory exists
const dataDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(config.DB_PATH, (err) => {
  if (err) {
    console.error('[DB] Failed to open database:', err.message);
    process.exit(1);
  }
  console.log('[DB] Connected to SQLite database');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Initialize schema
function initSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  db.exec(schema, (err) => {
    if (err) {
      console.error('[DB] Failed to initialize schema:', err.message);
      process.exit(1);
    }
    console.log('[DB] Schema initialized');
  });
}

// Promisified wrapper
const dbAsync = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Close connection gracefully
function close() {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) console.error('[DB] Error closing:', err.message);
      else console.log('[DB] Connection closed');
      resolve();
    });
  });
}

module.exports = {
  db,
  dbAsync,
  initSchema,
  close
};
