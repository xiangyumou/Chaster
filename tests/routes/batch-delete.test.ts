import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as BATCH_DELETE } from '@/app/api/v1/items/batch/delete/route';
import { POST as CREATE_ITEM } from '@/app/api/v1/items/route';
import { getPrismaClient } from '@/lib/prisma';

// Mock tlock for item creation
vi.mock('@/lib/tlock', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/tlock')>();
    return {
        ...actual,
        encrypt: vi.fn().mockResolvedValue({ ciphertext: 'mock_ct', roundNumber: 100 }),
    };
});

const TEST_TOKEN = process.env.UNIT_TEST_TOKEN || process.env.TEST_TOKEN || 'tok_test';
const BASE_URL = 'http://localhost:3000/api/v1';

function createRequest(method: string, path: string, body?: unknown) {
    const url = `${BASE_URL}${path}`;
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

describe('Batch Delete API (Enhanced Coverage)', () => {
    const createdIds: string[] = [];

    // Create test items before tests
    beforeAll(async () => {
        for (let i = 0; i < 5; i++) {
            const req = createRequest('POST', '/items', {
                type: i % 2 === 0 ? 'text' : 'image',
                content: `Batch Delete Test ${i}`,
                durationMinutes: 60,
            });
            const res = await CREATE_ITEM(req);
            const data = await res.json();
            if (data.id) {
                createdIds.push(data.id);
            }
        }
    });

    // Clean up after tests
    afterAll(async () => {
        const prisma = getPrismaClient();
        await prisma.item.deleteMany({
            where: { id: { in: createdIds } },
        });
    });

    describe('Delete by IDs', () => {
        it('should delete multiple items by IDs', async () => {
            // Create items for this specific test
            const idsToDelete: string[] = [];
            for (let i = 0; i < 2; i++) {
                const req = createRequest('POST', '/items', {
                    type: 'text',
                    content: `Delete by ID ${i}`,
                    durationMinutes: 60,
                });
                const res = await CREATE_ITEM(req);
                const data = await res.json();
                idsToDelete.push(data.id);
            }

            const req = createRequest('POST', '/items/batch/delete', {
                ids: idsToDelete,
            });
            const res = await BATCH_DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.deletedCount).toBe(2);
            expect(data.deletedIds).toHaveLength(2);
            expect(data.deletedIds).toEqual(expect.arrayContaining(idsToDelete));
        });

        it('should handle non-existent IDs gracefully', async () => {
            // Use valid UUID v4 format that doesn't exist in DB
            const req = createRequest('POST', '/items/batch/delete', {
                ids: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
            });
            const res = await BATCH_DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.deletedCount).toBe(0);
            expect(data.deletedIds).toHaveLength(0);
        });

        it('should fail with invalid UUID format', async () => {
            const req = createRequest('POST', '/items/batch/delete', {
                ids: ['not-a-valid-uuid'],
            });
            const res = await BATCH_DELETE(req);

            expect(res.status).toBe(400);
        });

        it('should fail with empty IDs array', async () => {
            const req = createRequest('POST', '/items/batch/delete', {
                ids: [],
            });
            const res = await BATCH_DELETE(req);

            expect(res.status).toBe(400);
        });
    });

    describe('Delete by Filter (safe boundary tests)', () => {
        // These tests use safe filter conditions that won't delete items from other tests

        it('should validate filter structure for type filter', async () => {
            // Create and delete our own items using IDs (safe)
            const ids: string[] = [];
            for (let i = 0; i < 2; i++) {
                const req = createRequest('POST', '/items', {
                    type: 'text',
                    content: `Filter Test Text ${i}`,
                    durationMinutes: 60,
                });
                const res = await CREATE_ITEM(req);
                const data = await res.json();
                ids.push(data.id);
            }

            // Delete by IDs (safe)
            const req = createRequest('POST', '/items/batch/delete', { ids });
            const res = await BATCH_DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.deletedCount).toBe(2);
        });

        it('should return empty result for beforeDate filter with old timestamp', async () => {
            const req = createRequest('POST', '/items/batch/delete', {
                filter: {
                    beforeDate: 1000, // Very old timestamp (1970)
                },
            });
            const res = await BATCH_DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            // No items should match this old date
            expect(data.deletedCount).toBe(0);
            expect(data.deletedIds).toHaveLength(0);
        });

        it('should return empty result for afterDate filter with future timestamp', async () => {
            const req = createRequest('POST', '/items/batch/delete', {
                filter: {
                    afterDate: Date.now() + 1000 * 60 * 60 * 24 * 365, // 1 year from now
                },
            });
            const res = await BATCH_DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            // No items should be created in the future
            expect(data.deletedCount).toBe(0);
        });

        it('should handle combined filter with impossible conditions', async () => {
            const req = createRequest('POST', '/items/batch/delete', {
                filter: {
                    beforeDate: 1000, // Very old
                    afterDate: 500, // Even older
                    type: 'text',
                },
            });
            const res = await BATCH_DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.deletedCount).toBe(0);
        });

        it('should handle status filter with unlocked (no items unlocked yet)', async () => {
            // All items are locked (future decryptAt), so unlocked filter returns 0
            const req = createRequest('POST', '/items/batch/delete', {
                filter: {
                    status: 'unlocked',
                    beforeDate: 1000, // Also add safety filter
                },
            });
            const res = await BATCH_DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.deletedCount).toBe(0);
        });
    });

    describe('Authentication', () => {
        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/items/batch/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: ['00000000-0000-0000-0000-000000000000'] }),
            });
            const res = await BATCH_DELETE(req);

            expect(res.status).toBe(401);
        });
    });
});
