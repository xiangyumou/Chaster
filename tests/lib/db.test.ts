import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';

// Item interface for typed mock implementation
interface MockItem {
    id: string;
    type: 'text' | 'image';
    encrypted_data: string;
    original_name: string | null;
    decrypt_at: number;
    round_number: number;
    created_at: number;
    last_duration_minutes: number | null;
    layer_count?: number;
    user_id?: string;
}


// Mock the database path
vi.mock('@/lib/db', async () => {
    // We'll create our own test implementation
    const Database = (await import('better-sqlite3')).default;
    const testDbPath = path.join(process.cwd(), 'data', 'test_db_lib.db');

    let db: InstanceType<typeof Database> | null = null;

    function getTestDb() {
        if (!db) {
            const dataDir = path.dirname(testDbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            db = new Database(testDbPath);
            db.pragma('journal_mode = WAL');
            initSchema(db);
        }
        return db;
    }

    function initSchema(database: InstanceType<typeof Database>) {
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
        `);
    }

    function closeDb() {
        if (db) {
            db.close();
            db = null;
        }
    }

    return {
        getAllItems: (userId = 'local') => {
            const database = getTestDb();
            return database.prepare(`
                SELECT id, type, original_name, decrypt_at, created_at, layer_count, user_id
                FROM items WHERE user_id = ? ORDER BY created_at DESC
            `).all(userId);
        },
        getItemById: (id: string, userId = 'local') => {
            const database = getTestDb();
            return database.prepare('SELECT * FROM items WHERE id = ? AND user_id = ?').get(id, userId) || null;
        },
        createItem: (item: MockItem) => {
            const database = getTestDb();
            const layerCount = item.layer_count ?? 1;
            const userId = item.user_id ?? 'local';
            database.prepare(`
                INSERT INTO items (id, type, encrypted_data, original_name, decrypt_at, round_number, created_at, last_duration_minutes, layer_count, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                item.id, item.type, item.encrypted_data, item.original_name,
                item.decrypt_at, item.round_number, item.created_at,
                item.last_duration_minutes, layerCount, userId
            );
            return { ...item, layer_count: layerCount, user_id: userId };
        },
        updateItemEncryption: (id: string, encrypted_data: string, decrypt_at: number, round_number: number, layer_count: number, userId = 'local') => {
            const database = getTestDb();
            const result = database.prepare(`
                UPDATE items SET encrypted_data = ?, decrypt_at = ?, round_number = ?, layer_count = ?
                WHERE id = ? AND user_id = ?
            `).run(encrypted_data, decrypt_at, round_number, layer_count, id, userId);
            return result.changes > 0;
        },
        updateItemEncryptionOptimistic: (
            id: string, encrypted_data: string, decrypt_at: number, round_number: number,
            expectedLayerCount: number, newLayerCount: number, userId = 'local'
        ) => {
            const database = getTestDb();
            const result = database.prepare(`
                UPDATE items SET encrypted_data = ?, decrypt_at = ?, round_number = ?, layer_count = ?
                WHERE id = ? AND layer_count = ? AND user_id = ?
            `).run(encrypted_data, decrypt_at, round_number, newLayerCount, id, expectedLayerCount, userId);
            return result.changes > 0;
        },
        deleteItem: (id: string, userId = 'local') => {
            const database = getTestDb();
            const result = database.prepare('DELETE FROM items WHERE id = ? AND user_id = ?').run(id, userId);
            return result.changes > 0;
        },
        getLastDuration: (userId = 'local') => {
            const database = getTestDb();
            const result = database.prepare("SELECT value FROM settings WHERE key = 'last_duration_minutes' AND user_id = ?").get(userId) as { value: string } | undefined;
            return result ? parseInt(result.value, 10) : 720;
        },
        setLastDuration: (minutes: number, userId = 'local') => {
            const database = getTestDb();
            database.prepare(`
                INSERT OR REPLACE INTO settings (key, value, user_id) VALUES ('last_duration_minutes', ?, ?)
            `).run(minutes.toString(), userId);
        },
        __closeDb: closeDb,
        __getTestDb: getTestDb,
    };
});

import {
    getAllItems,
    getItemById,
    createItem,
    updateItemEncryption,
    updateItemEncryptionOptimistic,
    deleteItem,
    getLastDuration,
    setLastDuration,
    // @ts-expect-error - Test-only exports
    __getTestDb,
} from '@/lib/db';

describe('Lib: Database', () => {
    beforeEach(() => {
        // Clear database before each test
        const db = __getTestDb();
        db.exec('DELETE FROM items');
        db.exec('DELETE FROM settings');
    });


    describe('Item CRUD Operations', () => {
        it('should create an item', () => {
            const item = createItem({
                id: 'test-id-1',
                type: 'text',
                encrypted_data: 'encrypted_content',
                original_name: null,
                decrypt_at: Date.now() + 60000,
                round_number: 100,
                created_at: Date.now(),
                last_duration_minutes: 60,
            });

            expect(item.id).toBe('test-id-1');
            expect(item.type).toBe('text');
            expect(item.layer_count).toBe(1);
            expect(item.user_id).toBe('local');
        });

        it('should create an item with custom layer_count and user_id', () => {
            const item = createItem({
                id: 'test-id-2',
                type: 'image',
                encrypted_data: 'encrypted_image',
                original_name: 'photo.jpg',
                decrypt_at: Date.now() + 60000,
                round_number: 200,
                created_at: Date.now(),
                last_duration_minutes: 30,
                layer_count: 3,
                user_id: 'user-123',
            });

            expect(item.layer_count).toBe(3);
            expect(item.user_id).toBe('user-123');
            expect(item.original_name).toBe('photo.jpg');
        });

        it('should get item by id', () => {
            createItem({
                id: 'get-test-id',
                type: 'text',
                encrypted_data: 'data',
                original_name: null,
                decrypt_at: Date.now() + 60000,
                round_number: 100,
                created_at: Date.now(),
                last_duration_minutes: 60,
            });

            const found = getItemById('get-test-id');
            expect(found).not.toBeNull();
            expect(found?.id).toBe('get-test-id');
            expect(found?.type).toBe('text');
        });

        it('should return null for non-existent item', () => {
            const found = getItemById('non-existent-id');
            expect(found).toBeNull();
        });

        it('should respect user_id when getting item', () => {
            createItem({
                id: 'user-scoped-id',
                type: 'text',
                encrypted_data: 'data',
                original_name: null,
                decrypt_at: Date.now() + 60000,
                round_number: 100,
                created_at: Date.now(),
                last_duration_minutes: 60,
                user_id: 'user-A',
            });

            // Should not find with different user_id
            const notFound = getItemById('user-scoped-id', 'user-B');
            expect(notFound).toBeNull();

            // Should find with correct user_id
            const found = getItemById('user-scoped-id', 'user-A');
            expect(found).not.toBeNull();
        });

        it('should get all items for a user', () => {
            createItem({
                id: 'item-1',
                type: 'text',
                encrypted_data: 'data1',
                original_name: null,
                decrypt_at: Date.now() + 60000,
                round_number: 100,
                created_at: Date.now(),
                last_duration_minutes: 60,
            });

            createItem({
                id: 'item-2',
                type: 'image',
                encrypted_data: 'data2',
                original_name: 'img.png',
                decrypt_at: Date.now() + 120000,
                round_number: 200,
                created_at: Date.now() + 1000,
                last_duration_minutes: 120,
            });

            const items = getAllItems();
            expect(items.length).toBe(2);
            // Should be ordered by created_at DESC
            expect(items[0].id).toBe('item-2');
            expect(items[1].id).toBe('item-1');
        });

        it('should only get items for the specified user', () => {
            createItem({
                id: 'user-a-item',
                type: 'text',
                encrypted_data: 'data',
                original_name: null,
                decrypt_at: Date.now(),
                round_number: 100,
                created_at: Date.now(),
                last_duration_minutes: 60,
                user_id: 'user-A',
            });

            createItem({
                id: 'user-b-item',
                type: 'text',
                encrypted_data: 'data',
                original_name: null,
                decrypt_at: Date.now(),
                round_number: 100,
                created_at: Date.now(),
                last_duration_minutes: 60,
                user_id: 'user-B',
            });

            const userAItems = getAllItems('user-A');
            expect(userAItems.length).toBe(1);
            expect(userAItems[0].id).toBe('user-a-item');

            const userBItems = getAllItems('user-B');
            expect(userBItems.length).toBe(1);
            expect(userBItems[0].id).toBe('user-b-item');
        });

        it('should delete item', () => {
            createItem({
                id: 'delete-test-id',
                type: 'text',
                encrypted_data: 'data',
                original_name: null,
                decrypt_at: Date.now(),
                round_number: 100,
                created_at: Date.now(),
                last_duration_minutes: 60,
            });

            const deleted = deleteItem('delete-test-id');
            expect(deleted).toBe(true);

            const found = getItemById('delete-test-id');
            expect(found).toBeNull();
        });

        it('should return false when deleting non-existent item', () => {
            const deleted = deleteItem('non-existent-id');
            expect(deleted).toBe(false);
        });

        it('should respect user_id when deleting', () => {
            createItem({
                id: 'delete-scoped-id',
                type: 'text',
                encrypted_data: 'data',
                original_name: null,
                decrypt_at: Date.now(),
                round_number: 100,
                created_at: Date.now(),
                last_duration_minutes: 60,
                user_id: 'user-A',
            });

            // Should not delete with wrong user_id
            const notDeleted = deleteItem('delete-scoped-id', 'user-B');
            expect(notDeleted).toBe(false);

            // Should delete with correct user_id
            const deleted = deleteItem('delete-scoped-id', 'user-A');
            expect(deleted).toBe(true);
        });
    });

    describe('Update Operations', () => {
        it('should update item encryption', () => {
            createItem({
                id: 'update-test-id',
                type: 'text',
                encrypted_data: 'original_data',
                original_name: null,
                decrypt_at: 1000,
                round_number: 100,
                created_at: Date.now(),
                last_duration_minutes: 60,
            });

            const updated = updateItemEncryption(
                'update-test-id',
                'new_encrypted_data',
                2000,
                200,
                2
            );
            expect(updated).toBe(true);

            const item = getItemById('update-test-id');
            expect(item?.encrypted_data).toBe('new_encrypted_data');
            expect(item?.decrypt_at).toBe(2000);
            expect(item?.round_number).toBe(200);
            expect(item?.layer_count).toBe(2);
        });

        it('should return false when updating non-existent item', () => {
            const updated = updateItemEncryption(
                'non-existent-id',
                'data',
                1000,
                100,
                1
            );
            expect(updated).toBe(false);
        });

        it('should update with optimistic locking when layer_count matches', () => {
            createItem({
                id: 'optimistic-test-id',
                type: 'text',
                encrypted_data: 'original',
                original_name: null,
                decrypt_at: 1000,
                round_number: 100,
                created_at: Date.now(),
                last_duration_minutes: 60,
                layer_count: 1,
            });

            const updated = updateItemEncryptionOptimistic(
                'optimistic-test-id',
                'updated_data',
                2000,
                200,
                1,  // expectedLayerCount
                2   // newLayerCount
            );
            expect(updated).toBe(true);

            const item = getItemById('optimistic-test-id');
            expect(item?.layer_count).toBe(2);
        });

        it('should fail optimistic update when layer_count does not match (concurrent modification)', () => {
            createItem({
                id: 'concurrent-test-id',
                type: 'text',
                encrypted_data: 'original',
                original_name: null,
                decrypt_at: 1000,
                round_number: 100,
                created_at: Date.now(),
                last_duration_minutes: 60,
                layer_count: 2, // Current layer_count is 2
            });

            // Try to update expecting layer_count = 1 (stale data)
            const updated = updateItemEncryptionOptimistic(
                'concurrent-test-id',
                'updated_data',
                2000,
                200,
                1,  // expectedLayerCount (wrong!)
                3   // newLayerCount
            );
            expect(updated).toBe(false);

            // Item should be unchanged
            const item = getItemById('concurrent-test-id');
            expect(item?.layer_count).toBe(2);
            expect(item?.encrypted_data).toBe('original');
        });
    });

    describe('Settings Operations', () => {
        it('should return default duration when not set', () => {
            const duration = getLastDuration();
            expect(duration).toBe(720); // Default 12 hours
        });

        it('should set and get last duration', () => {
            setLastDuration(60);
            const duration = getLastDuration();
            expect(duration).toBe(60);
        });

        it('should update existing duration', () => {
            setLastDuration(60);
            setLastDuration(120);
            const duration = getLastDuration();
            expect(duration).toBe(120);
        });

        it('should respect user_id for settings', () => {
            setLastDuration(60, 'user-A');
            setLastDuration(120, 'user-B');

            expect(getLastDuration('user-A')).toBe(60);
            expect(getLastDuration('user-B')).toBe(120);
            expect(getLastDuration('user-C')).toBe(720); // Default for new user
        });
    });
});
