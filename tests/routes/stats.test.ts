import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/v1/stats/route';

const TEST_TOKEN = process.env.TEST_TOKEN || 'tok_test';
const BASE_URL = 'http://localhost:3000/api/v1';

function createRequest(method: string, path: string) {
    const url = `${BASE_URL}${path}`;
    const init: RequestInit = {
        method,
        headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
        }
    } as any;
    return new NextRequest(url, init);
}

describe('Stats API (In-Process)', () => {
    it('should get system stats', async () => {
        const req = createRequest('GET', '/stats');
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.totalItems).toBeDefined();
        expect(data.lockedItems).toBeDefined();
        expect(typeof data.totalItems).toBe('number');
    });
});
