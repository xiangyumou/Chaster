import Database from 'better-sqlite3';
import path from 'path';

// Database file location
const DB_PATH = path.join(process.cwd(), 'data', 'chaster.db');

// Singleton database instance
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('text', 'image')),
      encrypted_data TEXT NOT NULL,
      original_name TEXT,
      decrypt_at INTEGER NOT NULL,
      round_number INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_duration_minutes INTEGER,
      layer_count INTEGER NOT NULL DEFAULT 1,
      user_id TEXT NOT NULL DEFAULT 'local'
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'local',
      PRIMARY KEY (key, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
    CREATE INDEX IF NOT EXISTS idx_items_user_decrypt ON items(user_id, decrypt_at);
  `);

  // Migration: add layer_count column if it doesn't exist
  try {
    database.exec(`ALTER TABLE items ADD COLUMN layer_count INTEGER NOT NULL DEFAULT 1`);
  } catch {
    // Column already exists, ignore error
  }

  // Migration: add user_id column if it doesn't exist
  try {
    database.exec(`ALTER TABLE items ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local'`);
  } catch {
    // Column already exists, ignore error
  }

  // Migration: migrate settings table to support user-level settings
  try {
    // Check if old settings table exists without user_id
    const oldSettings = database.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='settings'`).get();
    if (oldSettings) {
      const columns = database.prepare(`PRAGMA table_info(settings)`).all() as Array<{ name: string }>;
      const hasUserId = columns.some(col => col.name === 'user_id');

      if (!hasUserId) {
        // Migrate old settings to new schema
        database.exec(`
          CREATE TABLE IF NOT EXISTS settings_new (
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            user_id TEXT NOT NULL DEFAULT 'local',
            PRIMARY KEY (key, user_id)
          );
          
          INSERT INTO settings_new (key, value, user_id)
          SELECT key, value, 'local' FROM settings;
          
          DROP TABLE settings;
          
          ALTER TABLE settings_new RENAME TO settings;
        `);
      }
    }
  } catch (error) {
    // Migration already done or error, ignore
    console.log('Settings migration skipped:', error);
  }
}

// Item types
export interface Item {
  id: string;
  type: 'text' | 'image';
  encrypted_data: string;
  original_name: string | null;
  decrypt_at: number;
  round_number: number;
  created_at: number;
  last_duration_minutes: number | null;
  layer_count: number;
  user_id: string;
}

export interface ItemListView {
  id: string;
  type: 'text' | 'image';
  original_name: string | null;
  decrypt_at: number;
  created_at: number;
  layer_count: number;
  user_id: string;
}

// CRUD operations
export function getAllItems(userId: string = 'local'): ItemListView[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, type, original_name, decrypt_at, created_at, layer_count, user_id
    FROM items 
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId) as ItemListView[];
}

export function getItemById(id: string, userId: string = 'local'): Item | null {
  const db = getDb();
  return db.prepare('SELECT * FROM items WHERE id = ? AND user_id = ?').get(id, userId) as Item | null;
}

export function createItem(item: Omit<Item, 'id' | 'layer_count' | 'user_id'> & { id: string; layer_count?: number; user_id?: string }): Item {
  const db = getDb();
  const layerCount = item.layer_count ?? 1;
  const userId = item.user_id ?? 'local';
  db.prepare(`
    INSERT INTO items (id, type, encrypted_data, original_name, decrypt_at, round_number, created_at, last_duration_minutes, layer_count, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.id,
    item.type,
    item.encrypted_data,
    item.original_name,
    item.decrypt_at,
    item.round_number,
    item.created_at,
    item.last_duration_minutes,
    layerCount,
    userId
  );
  return { ...item, layer_count: layerCount, user_id: userId } as Item;
}

export function updateItemEncryption(id: string, encrypted_data: string, decrypt_at: number, round_number: number, layer_count: number, userId: string = 'local'): boolean {
  const db = getDb();
  const result = db.prepare(`
    UPDATE items 
    SET encrypted_data = ?, decrypt_at = ?, round_number = ?, layer_count = ?
    WHERE id = ? AND user_id = ?
  `).run(encrypted_data, decrypt_at, round_number, layer_count, id, userId);
  return result.changes > 0;
}

/**
 * Update encryption with optimistic locking to prevent race conditions.
 * Only updates if the current layer_count matches expectedLayerCount.
 * Returns true if update succeeded, false if concurrent modification detected.
 */
export function updateItemEncryptionOptimistic(
  id: string,
  encrypted_data: string,
  decrypt_at: number,
  round_number: number,
  expectedLayerCount: number,
  newLayerCount: number,
  userId: string = 'local'
): boolean {
  const db = getDb();
  const result = db.prepare(`
    UPDATE items 
    SET encrypted_data = ?, decrypt_at = ?, round_number = ?, layer_count = ?
    WHERE id = ? AND layer_count = ? AND user_id = ?
  `).run(encrypted_data, decrypt_at, round_number, newLayerCount, id, expectedLayerCount, userId);
  return result.changes > 0;
}

export function deleteItem(id: string, userId: string = 'local'): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM items WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}

// Settings operations
export function getLastDuration(userId: string = 'local'): number {
  const db = getDb();
  const result = db.prepare("SELECT value FROM settings WHERE key = 'last_duration_minutes' AND user_id = ?").get(userId) as { value: string } | undefined;
  return result ? parseInt(result.value, 10) : 720; // Default 12 hours = 720 minutes
}

export function setLastDuration(minutes: number, userId: string = 'local'): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, user_id) VALUES ('last_duration_minutes', ?, ?)
  `).run(minutes.toString(), userId);
}
