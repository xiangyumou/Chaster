import { describe, it, expect, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/v1/items/route';
import { POST as EXTEND } from '@/app/api/v1/items/[id]/extend/route';
import { GET as GET_ONE, DELETE } from '@/app/api/v1/items/[id]/route';

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

// Mock Auth: We will assume specific tokens exist or we need to add a way 
// to mock `authenticate` function if we don't want to use real tokens.
// But for Integration tests, using real DB and Tokens is better.
// We will use the same TEST_TOKEN env var.

const TEST_TOKEN = process.env.API_TOKEN || 'tok_test';
const BASE_URL = 'http://localhost:3000/api/v1';

// We need to ensure the DB has this token. 
// Ideally we mock the DB, but "In-Process Integration" usually implies real DB.

describe('Items API (In-Process Coverage)', () => {

    /**
     * Helper to create a NextRequest
     */
    function createRequest(method: string, path: string, body?: unknown, startParams?: string) {
        const url = `${BASE_URL}${path}${startParams || ''}`;
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
        interface ListItem { id: string }
        const found = data.items.find((i: ListItem) => i.id === createdId);
        expect(found).toBeDefined();
    });

    it('should filter items by status', async () => {
        const req = createRequest('GET', '/items?status=locked');
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(data.items)).toBe(true);
        // Ensure filter returns results to validate
        expect(data.items.length).toBeGreaterThan(0);
        // Verify all returned items have correct status (locked = unlocked:false)
        // This assertion always executes and validates the filter logic
        data.items.forEach((item: { unlocked: boolean }) => {
            expect(item.unlocked).toBe(false);
        });
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

    it('should get unlocked item (decrypted)', async () => {
        // Mock tlock to simulate time passed and successful decryption
        // We use Fake Timers to trick the Route Handler into thinking time passed
        vi.useFakeTimers();
        const future = new Date();
        future.setMinutes(future.getMinutes() + 20); // Advance 20 mins (Lock was 10 mins)
        vi.setSystemTime(future);

        mockedCanDecrypt.mockReturnValue(true);
        mockedDecrypt.mockResolvedValue(Buffer.from('Coverage Content'));

        const req = createRequest('GET', `/items/${createdId}`);
        const res = await GET_ONE(req, { params: Promise.resolve({ id: createdId }) });
        const data = await res.json();

        // Cleanup timers
        vi.useRealTimers();

        expect(res.status).toBe(200);
        expect(data.id).toBe(createdId);
        expect(data.content).toBe('Coverage Content'); // Should be present!
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

    it('should create an image item', async () => {
        const req = createRequest('POST', '/items', {
            type: 'image',
            content: 'SGVsbG8=',
            durationMinutes: 10
        });
        const res = await POST(req);
        // Do NOT update createdId to preserve Text Item for later tests
        expect(res.status).toBe(201);
    });

    it('should list items with status filter', async () => {
        const req = createRequest('GET', '/items?status=locked');
        const res = await GET(req);
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(Array.isArray(data.items)).toBe(true);
    });

    it('should list items with pagination', async () => {
        const req = createRequest('GET', '/items?limit=1');
        const res = await GET(req);
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.limit).toBe(1);
    });

    it('should fail creation with past decryptAt', async () => {
        const req = createRequest('POST', '/items', {
            type: 'text',
            content: 'Future',
            decryptAt: Date.now() - 10000
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('should fail creation without duration or decryptAt', async () => {
        const req = createRequest('POST', '/items', {
            type: 'text',
            content: 'Incomplete'
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('should delete item', async () => {
        const req = createRequest('DELETE', `/items/${createdId}`);
        const res = await DELETE(req, { params: Promise.resolve({ id: createdId }) });
        expect(res.status).toBe(200);
    });

    it('should return 404 for deleted item', async () => {
        const req = createRequest('GET', `/items/${createdId}`);
        const res = await GET_ONE(req, { params: Promise.resolve({ id: createdId }) });
        expect(res.status).toBe(404);
    });

});
