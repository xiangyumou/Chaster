import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/admin/tokens/route';
import { DELETE } from '@/app/api/v1/admin/tokens/[token]/route';
import { POST as BATCH_POST } from '@/app/api/v1/items/batch/route';

const TEST_TOKEN = process.env.TEST_TOKEN || 'tok_test';
const BASE_URL = 'http://localhost:3000/api/v1';

function createRequest(method: string, path: string, body?: any) {
    const url = `${BASE_URL}${path}`;
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

describe('Admin & Batch API (In-Process)', () => {
    let newToken: string;

    it('should list tokens', async () => {
        const req = createRequest('GET', '/admin/tokens');
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.tokens).toBeInstanceOf(Array);
    });

    it('should create a new token', async () => {
        const req = createRequest('POST', '/admin/tokens', {
            name: 'Coverage Temp Token'
        });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.token).toBeDefined();
        newToken = data.token;
    });

    it('should revoke the token', async () => {
        const req = createRequest('DELETE', `/admin/tokens/${newToken}`);
        const res = await DELETE(req, { params: Promise.resolve({ token: newToken }) });

        expect(res.status).toBe(200);
    });

    it('should batch create items', async () => {
        const req = createRequest('POST', '/items/batch', [
            { type: 'text', content: 'Batch 1', durationMinutes: 5 },
            { type: 'text', content: 'Batch 2', durationMinutes: 5 }
        ]);

        const res = await BATCH_POST(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.count).toBe(2);
        expect(data.ids.length).toBe(2);
    });
});
