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
      layer_count INTEGER NOT NULL DEFAULT 1
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migration: add layer_count column if it doesn't exist
  try {
    database.exec(`ALTER TABLE items ADD COLUMN layer_count INTEGER NOT NULL DEFAULT 1`);
  } catch {
    // Column already exists, ignore error
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
}

export interface ItemListView {
  id: string;
  type: 'text' | 'image';
  original_name: string | null;
  decrypt_at: number;
  created_at: number;
  layer_count: number;
}

// CRUD operations
export function getAllItems(): ItemListView[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, type, original_name, decrypt_at, created_at, layer_count 
    FROM items 
    ORDER BY created_at DESC
  `).all() as ItemListView[];
}

export function getItemById(id: string): Item | null {
  const db = getDb();
  return db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item | null;
}

export function createItem(item: Omit<Item, 'id' | 'layer_count'> & { id: string; layer_count?: number }): Item {
  const db = getDb();
  const layerCount = item.layer_count ?? 1;
  db.prepare(`
    INSERT INTO items (id, type, encrypted_data, original_name, decrypt_at, round_number, created_at, last_duration_minutes, layer_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.id,
    item.type,
    item.encrypted_data,
    item.original_name,
    item.decrypt_at,
    item.round_number,
    item.created_at,
    item.last_duration_minutes,
    layerCount
  );
  return { ...item, layer_count: layerCount } as Item;
}

export function updateItemEncryption(id: string, encrypted_data: string, decrypt_at: number, round_number: number, layer_count: number): boolean {
  const db = getDb();
  const result = db.prepare(`
    UPDATE items 
    SET encrypted_data = ?, decrypt_at = ?, round_number = ?, layer_count = ?
    WHERE id = ?
  `).run(encrypted_data, decrypt_at, round_number, layer_count, id);
  return result.changes > 0;
}

export function deleteItem(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM items WHERE id = ?').run(id);
  return result.changes > 0;
}

// Settings operations
export function getLastDuration(): number {
  const db = getDb();
  const result = db.prepare("SELECT value FROM settings WHERE key = 'last_duration_minutes'").get() as { value: string } | undefined;
  return result ? parseInt(result.value, 10) : 720; // Default 12 hours = 720 minutes
}

export function setLastDuration(minutes: number): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO settings (key, value) VALUES ('last_duration_minutes', ?)
  `).run(minutes.toString());
}
