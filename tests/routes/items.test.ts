import { describe, it, expect, vi, Mock, beforeAll, afterAll } from 'vitest';
import { POST, GET } from '@/app/api/v1/items/route';
import { POST as EXTEND } from '@/app/api/v1/items/[id]/extend/route';
import { GET as GET_ONE, DELETE } from '@/app/api/v1/items/[id]/route';
import { createTestRequest } from '../utils';

// Mock tlock to control decryption state
vi.mock('@/lib/tlock', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/tlock')>();
    return {
        ...actual,
        encrypt: vi.fn().mockResolvedValue({ ciphertext: 'mock_ct', roundNumber: 100 }),
        decrypt: vi.fn(), // We will mock implementation in test
        canDecrypt: vi.fn()
    };
});

import { decrypt, canDecrypt } from '@/lib/tlock';

// Cast mocks to Mock type for proper typing
const mockedDecrypt = decrypt as Mock;
const mockedCanDecrypt = canDecrypt as Mock;

describe('Items API (In-Process Coverage)', () => {
    // Test data created in beforeAll for test isolation
    let testItemId: string;
    let testImageItemId: string;
    let testMetadataItemId: string;
    const createdItemIds: string[] = [];

    /**
     * Setup: Create test items once for all tests
     * This ensures tests are isolated and can run independently
     */
    beforeAll(async () => {
        // Create primary test text item
        const textReq = createTestRequest('POST', '/items', {
            type: 'text',
            content: 'Coverage Content',
            durationMinutes: 10
        });
        const textRes = await POST(textReq);
        const textData = await textRes.json();
        testItemId = textData.id;
        createdItemIds.push(testItemId);

        // Create image item for type-specific tests
        const imageReq = createTestRequest('POST', '/items', {
            type: 'image',
            content: 'SGVsbG8=',
            durationMinutes: 10
        });
        const imageRes = await POST(imageReq);
        const imageData = await imageRes.json();
        testImageItemId = imageData.id;
        createdItemIds.push(testImageItemId);

        // Create item with metadata for filter tests
        const metaReq = createTestRequest('POST', '/items', {
            type: 'text',
            content: 'With Metadata',
            durationMinutes: 10,
            metadata: { specialty: 'testing' }
        });
        const metaRes = await POST(metaReq);
        const metaData = await metaRes.json();
        testMetadataItemId = metaData.id;
        createdItemIds.push(testMetadataItemId);
    });

    /**
     * Cleanup: Delete all created items after tests complete
     */
    afterAll(async () => {
        for (const id of createdItemIds) {
            try {
                const req = createTestRequest('DELETE', `/items/${id}`);
                await DELETE(req, { params: Promise.resolve({ id }) });
            } catch {
                // Ignore cleanup errors - item may have been deleted in test
            }
        }
    });

    // =========================================================================
    // CREATE Tests
    // =========================================================================

    describe('POST /items', () => {
        it('should create a text item with valid data', async () => {
            const req = createTestRequest('POST', '/items', {
                type: 'text',
                content: 'New Test Content',
                durationMinutes: 5
            });
            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.id).toBeDefined();
            expect(data.type).toBe('text');
            createdItemIds.push(data.id);
        });

        it('should create an image item', async () => {
            const req = createTestRequest('POST', '/items', {
                type: 'image',
                content: 'SGVsbG8=',
                durationMinutes: 10
            });
            const res = await POST(req);
            expect(res.status).toBe(201);
            const data = await res.json();
            createdItemIds.push(data.id);
        });

        it('should fail with empty content', async () => {
            const req = createTestRequest('POST', '/items', {
                type: 'text',
                content: '',
                durationMinutes: 1
            });
            const res = await POST(req);
            expect(res.status).toBe(400);
        });

        it('should fail with past decryptAt', async () => {
            const req = createTestRequest('POST', '/items', {
                type: 'text',
                content: 'Future',
                decryptAt: Date.now() - 10000
            });
            const res = await POST(req);
            expect(res.status).toBe(400);
        });

        it('should fail without duration or decryptAt', async () => {
            const req = createTestRequest('POST', '/items', {
                type: 'text',
                content: 'Incomplete'
            });
            const res = await POST(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error.message).toContain('durationMinutes');
        });
    });

    // =========================================================================
    // READ Tests
    // =========================================================================

    describe('GET /items', () => {
        it('should list all items', async () => {
            const req = createTestRequest('GET', '/items');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.items).toBeInstanceOf(Array);
            expect(data.items.length).toBeGreaterThan(0);
        });

        it('should find created item in list', async () => {
            const req = createTestRequest('GET', '/items');
            const res = await GET(req);
            const data = await res.json();

            interface ListItem { id: string }
            const found = data.items.find((i: ListItem) => i.id === testItemId);
            expect(found).toBeDefined();
        });

        it('should filter items by status=locked', async () => {
            const req = createTestRequest('GET', '/items?status=locked');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(Array.isArray(data.items)).toBe(true);
            data.items.forEach((item: { unlocked: boolean }) => {
                expect(item.unlocked).toBe(false);
            });
        });

        it('should apply pagination with limit', async () => {
            const req = createTestRequest('GET', '/items?limit=1');
            const res = await GET(req);
            const data = await res.json();
            expect(res.status).toBe(200);
            expect(data.limit).toBe(1);
        });

        it('should sort items by decrypt_asc', async () => {
            const req = createTestRequest('GET', '/items?sort=decrypt_asc');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            const times = data.items.map((i: { decryptAt: number }) => i.decryptAt);
            const sortedTimes = [...times].sort((a, b) => a - b);
            expect(times).toEqual(sortedTimes);
        });

        it('should filter items by IDs', async () => {
            const req = createTestRequest('GET', `/items?ids=${testItemId}`);
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.items.length).toBe(1);
            expect(data.items[0].id).toBe(testItemId);
        });

        it('should filter items by createdAfter', async () => {
            const now = Date.now();
            const req = createTestRequest('GET', `/items?createdAfter=${now - 60000}`);
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.items.length).toBeGreaterThan(0);
            data.items.forEach((item: { createdAt: number }) => {
                expect(item.createdAt).toBeGreaterThanOrEqual(now - 60000);
            });
        });

        it('should filter items by metadataKey', async () => {
            const req = createTestRequest('GET', '/items?metadataKey=specialty');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.items.length).toBeGreaterThan(0);
            const found = data.items.find(
                (i: { metadata?: { specialty?: string } }) => i.metadata?.specialty === 'testing'
            );
            expect(found).toBeDefined();
        });
    });

    // =========================================================================
    // GET (Single Item) Tests
    // =========================================================================

    describe('GET /items/:id', () => {
        it('should get single locked item', async () => {
            const req = createTestRequest('GET', `/items/${testItemId}`);
            const res = await GET_ONE(req, { params: Promise.resolve({ id: testItemId }) });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.id).toBe(testItemId);
            expect(data.content).toBeNull(); // Still locked
        });

        it('should get unlocked item with decrypted content', async () => {
            vi.useFakeTimers();
            const future = new Date();
            future.setMinutes(future.getMinutes() + 20);
            vi.setSystemTime(future);

            mockedCanDecrypt.mockReturnValue(true);
            mockedDecrypt.mockResolvedValue(Buffer.from('Coverage Content'));

            const req = createTestRequest('GET', `/items/${testItemId}`);
            const res = await GET_ONE(req, { params: Promise.resolve({ id: testItemId }) });
            const data = await res.json();

            vi.useRealTimers();

            expect(res.status).toBe(200);
            expect(data.content).toBe('Coverage Content');
        });

        it('should return 404 for non-existent item', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const req = createTestRequest('GET', `/items/${nonExistentId}`);
            const res = await GET_ONE(req, { params: Promise.resolve({ id: nonExistentId }) });
            expect(res.status).toBe(404);
        });
    });

    // =========================================================================
    // EXTEND Tests
    // =========================================================================

    describe('POST /items/:id/extend', () => {
        it('should extend item lock duration', async () => {
            const req = createTestRequest('POST', `/items/${testItemId}/extend`, {
                minutes: 5
            });
            const res = await EXTEND(req, { params: Promise.resolve({ id: testItemId }) });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.layerCount).toBeGreaterThanOrEqual(1);
        });

        it('should return 400 with invalid minutes', async () => {
            const req = createTestRequest('POST', `/items/${testItemId}/extend`, {
                minutes: -10
            });
            const res = await EXTEND(req, { params: Promise.resolve({ id: testItemId }) });
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.error.code).toBe('VALIDATION_ERROR');
        });

        it('should return 404 for non-existent item', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const req = createTestRequest('POST', `/items/${nonExistentId}/extend`, {
                minutes: 10
            });
            const res = await EXTEND(req, { params: Promise.resolve({ id: nonExistentId }) });
            expect(res.status).toBe(404);
        });
    });

    // =========================================================================
    // DELETE Tests
    // =========================================================================

    describe('DELETE /items/:id', () => {
        it('should delete item and return 404 on subsequent get', async () => {
            // Create a dedicated item for delete test
            const createReq = createTestRequest('POST', '/items', {
                type: 'text',
                content: 'To Be Deleted',
                durationMinutes: 5
            });
            const createRes = await POST(createReq);
            const { id: deleteItemId } = await createRes.json();

            // Delete the item
            const deleteReq = createTestRequest('DELETE', `/items/${deleteItemId}`);
            const deleteRes = await DELETE(deleteReq, { params: Promise.resolve({ id: deleteItemId }) });
            expect(deleteRes.status).toBe(204);

            // Verify it's gone
            const getReq = createTestRequest('GET', `/items/${deleteItemId}`);
            const getRes = await GET_ONE(getReq, { params: Promise.resolve({ id: deleteItemId }) });
            expect(getRes.status).toBe(404);
        });
    });
});
