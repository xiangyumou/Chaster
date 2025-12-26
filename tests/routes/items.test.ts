import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/v1/items/route';
import { POST as EXTEND } from '@/app/api/v1/items/[id]/extend/route';
import { GET as GET_ONE } from '@/app/api/v1/items/[id]/route';

// Mock Auth: We will assume specific tokens exist or we need to add a way 
// to mock `authenticate` function if we don't want to use real tokens.
// But for Integration tests, using real DB and Tokens is better.
// We will use the same TEST_TOKEN env var.

const TEST_TOKEN = process.env.TEST_TOKEN || 'tok_test';
const BASE_URL = 'http://localhost:3000/api/v1';

// We need to ensure the DB has this token. 
// Ideally we mock the DB, but "In-Process Integration" usually implies real DB.

describe('Items API (In-Process Coverage)', () => {

    /**
     * Helper to create a NextRequest
     */
    function createRequest(method: string, path: string, body?: any, startParams?: string) {
        const url = `${BASE_URL}${path}${startParams || ''}`;
        const init: RequestInit = {
            method,
            headers: {
                'Authorization': `Bearer ${TEST_TOKEN}`,
                'Content-Type': 'application/json'
            }
        } as any;
        if (body) {
            init.body = JSON.stringify(body);
        }
        return new NextRequest(url, init);
    }

    let createdId: string;

    it('should create a text item', async () => {
        const req = createRequest('POST', '/items', {
            type: 'text',
            content: 'Coverage Content',
            durationMinutes: 10
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.id).toBeDefined();
        createdId = data.id;
    });

    it('should list items', async () => {
        const req = createRequest('GET', '/items');
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.items).toBeInstanceOf(Array);
        expect(data.items.length).toBeGreaterThan(0);

        // Verify created item is in list
        const found = data.items.find((i: any) => i.id === createdId);
        expect(found).toBeDefined();
    });

    it('should filter items by status', async () => {
        const req = createRequest('GET', '/items?status=locked');
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        // All items should be locked (since we just created one for 10 mins)
        // Note: other tests might exist, so we just check logic "if any returned, check status"
        if (data.items.length > 0) {
            expect(data.items[0].unlocked).toBe(false);
        }
    });

    it('should get single item', async () => {
        const req = createRequest('GET', `/items/${createdId}`);
        // We need to mock params. params is a Promise in Next.js 15+ (and 16?)
        // The handler signature: params is the second argument.

        const res = await GET_ONE(req, { params: Promise.resolve({ id: createdId }) });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.id).toBe(createdId);
        expect(data.content).toBeNull(); // Locked
    });

    it('should extend item', async () => {
        const req = createRequest('POST', `/items/${createdId}/extend`, {
            minutes: 5
        });

        const res = await EXTEND(req, { params: Promise.resolve({ id: createdId }) });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.layerCount).toBeGreaterThan(1);
    });

    // Validations (Coverage for catch blocks)
    it('should fail creation with empty content', async () => {
        const req = createRequest('POST', '/items', {
            type: 'text',
            content: '',
            durationMinutes: 1
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

});
