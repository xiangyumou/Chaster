import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/v1/items/route';
import { POST as BATCH_DELETE } from '@/app/api/v1/items/batch/delete/route';
import { POST as BATCH_GET } from '@/app/api/v1/items/batch/get/route';
import { PATCH as UPDATE_METADATA } from '@/app/api/v1/items/[id]/metadata/route';
import { GET as EXPORT_ITEMS } from '@/app/api/v1/export/items/route';
import { POST as IMPORT_ITEMS } from '@/app/api/v1/import/items/route';

// Mock tlock for encryption
vi.mock('@/lib/tlock', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/tlock')>();
    return {
        ...actual,
        encrypt: vi.fn().mockResolvedValue({ ciphertext: 'mock_ct', roundNumber: 100 }),
    };
});

// Mock decryption
vi.mock('@/lib/decryption', async () => {
    return {
        decrypt: vi.fn().mockResolvedValue(Buffer.from('Decrypted Content')),
    };
});

const TEST_TOKEN = process.env.API_TOKEN || 'tok_test';
const BASE_URL = 'http://localhost:3000/api/v1';

describe('New API Endpoints (P0-P2)', () => {
    function createRequest(method: string, path: string, body?: unknown, queryParams?: string) {
        const url = `${BASE_URL}${path}${queryParams || ''}`;
        const headers = {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json',
        };
        if (body) {
            return new NextRequest(url, {
                method,
                headers,
                body: JSON.stringify(body),
            });
        }
        return new NextRequest(url, { method, headers });
    }

    const createdIds: string[] = [];

    // Setup: Create test items
    beforeAll(async () => {
        for (let i = 0; i < 3; i++) {
            const req = createRequest('POST', '/items', {
                type: 'text',
                content: `Test Content ${i}`,
                durationMinutes: 60,
                metadata: { tag: `tag${i}`, index: i },
            });
            const res = await POST(req);
            const data = await res.json();
            if (data.id) {
                createdIds.push(data.id);
            }
        }
    });

    // ========== Export API Tests ==========
    describe('GET /export/items', () => {
        it('should export all items as JSON', async () => {
            const req = createRequest('GET', '/export/items');
            const res = await EXPORT_ITEMS(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.items).toBeInstanceOf(Array);
            expect(data.totalCount).toBeGreaterThanOrEqual(createdIds.length);
            expect(data.exportedAt).toBeDefined();
        });

        it('should include encrypted data by default', async () => {
            const req = createRequest('GET', '/export/items');
            const res = await EXPORT_ITEMS(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(Array.isArray(data.items)).toBe(true);
            // Test creates items in beforeAll, ensure we have items to validate
            expect(data.items.length).toBeGreaterThan(0);
            data.items.forEach((item: { encryptedData: string }) => {
                expect(item.encryptedData).toBeDefined();
            });
        });

        it('should export items filtered by status', async () => {
            const req = createRequest('GET', '/export/items?status=locked');
            const res = await EXPORT_ITEMS(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            // Ensure we have items to validate
            expect(data.items.length).toBeGreaterThan(0);
            data.items.forEach((item: { unlocked: boolean }) => {
                expect(item.unlocked).toBe(false);
            });
        });

        it('should export as NDJSON format', async () => {
            const req = createRequest('GET', '/export/items?format=ndjson');
            const res = await EXPORT_ITEMS(req);

            expect(res.status).toBe(200);
            expect(res.headers.get('Content-Type')).toBe('application/x-ndjson');
        });

        it('should export as CSV format', async () => {
            const req = createRequest('GET', '/export/items?format=csv');
            const res = await EXPORT_ITEMS(req);

            expect(res.status).toBe(200);
            expect(res.headers.get('Content-Type')).toBe('text/csv');
        });
    });

    // ========== Batch Delete API Tests ==========
    describe('POST /items/batch/delete', () => {
        const deleteTestIds: string[] = [];

        beforeAll(async () => {
            // Create items specifically for delete tests
            for (let i = 0; i < 2; i++) {
                const req = createRequest('POST', '/items', {
                    type: 'text',
                    content: `Delete Test ${i}`,
                    durationMinutes: 60,
                });
                const res = await POST(req);
                const data = await res.json();
                if (data.id) {
                    deleteTestIds.push(data.id);
                }
            }
        });

        it('should delete items by IDs', async () => {
            const req = createRequest('POST', '/items/batch/delete', {
                ids: deleteTestIds,
            });
            const res = await BATCH_DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.deletedCount).toBe(deleteTestIds.length);
            expect(data.deletedIds).toEqual(expect.arrayContaining(deleteTestIds));
        });

        it('should handle non-existent IDs gracefully', async () => {
            const req = createRequest('POST', '/items/batch/delete', {
                ids: ['00000000-0000-0000-0000-000000000000'],
            });
            const res = await BATCH_DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.deletedCount).toBe(0);
        });

        it('should fail with invalid UUID', async () => {
            const req = createRequest('POST', '/items/batch/delete', {
                ids: ['not-a-uuid'],
            });
            const res = await BATCH_DELETE(req);

            expect(res.status).toBe(400);
        });
    });

    // ========== Batch Get API Tests ==========
    describe('POST /items/batch/get', () => {
        it('should get multiple items by IDs', async () => {
            const req = createRequest('POST', '/items/batch/get', {
                ids: createdIds.slice(0, 2),
            });
            const res = await BATCH_GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.items).toHaveLength(2);
            expect(data.found).toBe(2);
            expect(data.notFound).toHaveLength(0);
        });

        it('should report not found IDs', async () => {
            const req = createRequest('POST', '/items/batch/get', {
                ids: [...createdIds.slice(0, 1), '00000000-0000-0000-0000-000000000000'],
            });
            const res = await BATCH_GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.found).toBe(1);
            expect(data.notFound).toContain('00000000-0000-0000-0000-000000000000');
        });

        it('should fail with empty IDs array', async () => {
            const req = createRequest('POST', '/items/batch/get', {
                ids: [],
            });
            const res = await BATCH_GET(req);

            expect(res.status).toBe(400);
        });
    });

    // ========== Update Metadata API Tests ==========
    describe('PATCH /items/:id/metadata', () => {
        it('should update item metadata (replace mode)', async () => {
            const req = createRequest('PATCH', `/items/${createdIds[0]}/metadata`, {
                metadata: { newKey: 'newValue', tag: 'updated' },
            });
            const res = await UPDATE_METADATA(req, { params: Promise.resolve({ id: createdIds[0] }) });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.metadata.newKey).toBe('newValue');
            expect(data.metadata.tag).toBe('updated');
            // Old keys should be gone in replace mode
            expect(data.metadata.index).toBeUndefined();
        });

        it('should merge metadata when merge=true', async () => {
            // First set some initial metadata
            await UPDATE_METADATA(
                createRequest('PATCH', `/items/${createdIds[1]}/metadata`, {
                    metadata: { original: 'value' },
                }),
                { params: Promise.resolve({ id: createdIds[1] }) }
            );

            // Then merge new metadata
            const req = createRequest('PATCH', `/items/${createdIds[1]}/metadata`, {
                metadata: { merged: 'newValue' },
                merge: true,
            });
            const res = await UPDATE_METADATA(req, { params: Promise.resolve({ id: createdIds[1] }) });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.metadata.original).toBe('value');
            expect(data.metadata.merged).toBe('newValue');
        });

        it('should return 404 for non-existent item', async () => {
            const req = createRequest('PATCH', '/items/00000000-0000-0000-0000-000000000000/metadata', {
                metadata: { key: 'value' },
            });
            const res = await UPDATE_METADATA(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) });

            expect(res.status).toBe(404);
        });
    });

    // ========== Enhanced Filtering Tests ==========
    describe('GET /items (Enhanced Filters)', () => {
        it('should filter by metadataKey', async () => {
            // Update one item with specific metadata
            await UPDATE_METADATA(
                createRequest('PATCH', `/items/${createdIds[0]}/metadata`, {
                    metadata: { specialKey: 'present' },
                }),
                { params: Promise.resolve({ id: createdIds[0] }) }
            );

            const req = createRequest('GET', '/items?metadataKey=specialKey');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            // At least the item we just updated should have this key
            const found = data.items.find((i: { id: string }) => i.id === createdIds[0]);
            expect(found).toBeDefined();
        });

        it('should filter by IDs', async () => {
            const req = createRequest('GET', `/items?ids=${createdIds[0]},${createdIds[1]}`);
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.items.length).toBeLessThanOrEqual(2);
        });

        it('should filter by createdAfter', async () => {
            const pastTime = Date.now() - 1000 * 60 * 60; // 1 hour ago
            const req = createRequest('GET', `/items?createdAfter=${pastTime}`);
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            data.items.forEach((item: { createdAt: number }) => {
                expect(item.createdAt).toBeGreaterThanOrEqual(pastTime);
            });
        });
    });

    // ========== Import API Tests ==========
    describe('POST /import/items', () => {
        it('should import items successfully', async () => {
            const req = createRequest('POST', '/import/items', {
                items: [
                    {
                        type: 'text',
                        encryptedData: 'imported_encrypted_data',
                        decryptAt: Date.now() + 1000 * 60 * 60,
                        roundNumber: 12345,
                    },
                ],
            });
            const res = await IMPORT_ITEMS(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.imported).toBe(1);
            expect(data.importedIds).toHaveLength(1);
        });

        it('should skip existing IDs with skip strategy', async () => {
            // Import with a known ID first - use valid UUID v4 format
            const testId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
            await IMPORT_ITEMS(
                createRequest('POST', '/import/items', {
                    items: [
                        {
                            id: testId,
                            type: 'text',
                            encryptedData: 'first_import',
                            decryptAt: Date.now() + 1000 * 60 * 60,
                            roundNumber: 123,
                        },
                    ],
                })
            );

            // Try to import again with same ID
            const req = createRequest('POST', '/import/items', {
                items: [
                    {
                        id: testId,
                        type: 'text',
                        encryptedData: 'second_import',
                        decryptAt: Date.now() + 1000 * 60 * 60,
                        roundNumber: 456,
                    },
                ],
                conflictStrategy: 'skip',
            });
            const res = await IMPORT_ITEMS(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.skipped).toBe(1);
            expect(data.imported).toBe(0);
        });

        it('should fail with validation error for invalid input', async () => {
            const req = createRequest('POST', '/import/items', {
                items: [
                    {
                        type: 'invalid', // Invalid type
                        encryptedData: 'data',
                        decryptAt: Date.now() + 1000,
                        roundNumber: 1,
                    },
                ],
            });
            const res = await IMPORT_ITEMS(req);

            expect(res.status).toBe(400);
        });
    });

    // Cleanup: Remove test items
    afterAll(async () => {
        if (createdIds.length > 0) {
            const req = createRequest('POST', '/items/batch/delete', {
                ids: createdIds,
            });
            await BATCH_DELETE(req);
        }
    });
});
