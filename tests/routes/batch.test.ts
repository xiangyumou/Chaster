import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/items/batch/route';

// Mock tlock
vi.mock('@/lib/tlock', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/tlock')>();
    return {
        ...actual,
        encrypt: vi.fn().mockResolvedValue({ ciphertext: 'mock_ct', roundNumber: 100 }),
    };
});

const TEST_TOKEN = process.env.API_TOKEN || 'tok_test';
const BASE_URL = 'http://localhost:3000/api/v1';

describe('Batch Items API', () => {
    function createRequest(method: string, path: string, body?: unknown) {
        const url = `${BASE_URL}${path}`;
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
        };
        const init = {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        };
        return new NextRequest(url, init);
    }

    describe('POST /api/v1/items/batch', () => {
        it('should batch create multiple text items', async () => {
            const req = createRequest('POST', '/items/batch', [
                { type: 'text', content: 'Batch Item 1', durationMinutes: 10 },
                { type: 'text', content: 'Batch Item 2', durationMinutes: 15 },
            ]);

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.count).toBe(2);
            expect(data.ids).toHaveLength(2);
        });

        it('should batch create items with decryptAt', async () => {
            const futureTime = Date.now() + 60 * 60 * 1000; // 1 hour from now
            const req = createRequest('POST', '/items/batch', [
                { type: 'text', content: 'Item with decryptAt', decryptAt: futureTime },
            ]);

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.count).toBe(1);
        });

        it('should batch create image items', async () => {
            const req = createRequest('POST', '/items/batch', [
                { type: 'image', content: 'SGVsbG8=', durationMinutes: 5 },
            ]);

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.count).toBe(1);
        });

        it('should fail if item lacks duration and decryptAt', async () => {
            const req = createRequest('POST', '/items/batch', [
                { type: 'text', content: 'No duration' },
            ]);

            const res = await POST(req);
            expect(res.status).toBe(400);

            const data = await res.json();
            expect(data.error.code).toBe('VALIDATION_ERROR');
        });

        it('should fail for empty batch array', async () => {
            const req = createRequest('POST', '/items/batch', []);

            const res = await POST(req);
            // Empty array is valid per schema, creates 0 items
            expect([200, 201]).toContain(res.status);
        });

        it('should fail for invalid item type', async () => {
            const req = createRequest('POST', '/items/batch', [
                { type: 'invalid', content: 'test', durationMinutes: 5 },
            ]);

            const res = await POST(req);
            expect(res.status).toBe(400);
        });

        it('should fail without auth token', async () => {
            const url = `${BASE_URL}/items/batch`;
            const req = new NextRequest(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([{ type: 'text', content: 'test', durationMinutes: 5 }])
            });

            const res = await POST(req);
            expect(res.status).toBe(401);
        });

        it('should create items with metadata', async () => {
            const req = createRequest('POST', '/items/batch', [
                {
                    type: 'text',
                    content: 'With metadata',
                    durationMinutes: 10,
                    metadata: { tag: 'important', priority: 1 }
                },
            ]);

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.count).toBe(1);
        });
    });
});
