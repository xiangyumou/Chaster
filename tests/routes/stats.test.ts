import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/v1/stats/route';

const TEST_TOKEN = process.env.UNIT_TEST_TOKEN || process.env.TEST_TOKEN || 'tok_test';
const BASE_URL = 'http://localhost:3000/api/v1';

function createRequest(method: string, path: string) {
    const url = `${BASE_URL}${path}`;
    return new NextRequest(url, {
        method,
        headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
}

describe('Stats API (In-Process)', () => {
    describe('GET /stats', () => {
        it('should get system stats with all required fields', async () => {
            const req = createRequest('GET', '/stats');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);

            // Core counts
            expect(typeof data.totalItems).toBe('number');
            expect(typeof data.lockedItems).toBe('number');
            expect(typeof data.unlockedItems).toBe('number');

            // Counts should be non-negative
            expect(data.totalItems).toBeGreaterThanOrEqual(0);
            expect(data.lockedItems).toBeGreaterThanOrEqual(0);
            expect(data.unlockedItems).toBeGreaterThanOrEqual(0);
        });

        it('should return correct byType breakdown', async () => {
            const req = createRequest('GET', '/stats');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.byType).toBeDefined();
            expect(typeof data.byType.text).toBe('number');
            expect(typeof data.byType.image).toBe('number');

            // Type breakdown should sum to total
            expect(data.byType.text + data.byType.image).toBe(data.totalItems);
        });

        it('should return avgLockDurationMinutes', async () => {
            const req = createRequest('GET', '/stats');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(typeof data.avgLockDurationMinutes).toBe('number');
            expect(data.avgLockDurationMinutes).toBeGreaterThanOrEqual(0);
        });

        it('should return timestamp boundaries', async () => {
            const req = createRequest('GET', '/stats');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            // Validate types - should be number or null
            expect(data.oldestItem === null || typeof data.oldestItem === 'number').toBe(true);
            expect(data.newestItem === null || typeof data.newestItem === 'number').toBe(true);
            // When items exist (created by other tests), validate ordering
            // Note: If both are numbers, the assertion runs; if null, test still passes type validation
            if (data.oldestItem !== null && data.newestItem !== null) {
                expect(data.oldestItem).toBeLessThanOrEqual(data.newestItem);
            }
        });

        it('should have consistent locked/unlocked count', async () => {
            const req = createRequest('GET', '/stats');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            // lockedItems + unlockedItems should equal totalItems
            expect(data.lockedItems + data.unlockedItems).toBe(data.totalItems);
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/stats`, {
                method: 'GET',
            });
            const res = await GET(req);

            expect(res.status).toBe(401);
        });

        it('should fail with invalid token', async () => {
            const req = new NextRequest(`${BASE_URL}/stats`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer invalid_token_12345',
                },
            });
            const res = await GET(req);

            expect(res.status).toBe(401);
        });
    });
});
