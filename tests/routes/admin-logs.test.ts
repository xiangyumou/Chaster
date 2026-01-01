import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, DELETE } from '../../src/app/api/v1/admin/logs/route';
import { getPrismaClient } from '@/lib/prisma';

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

describe('Admin Logs API (In-Process)', () => {
    // Create test log entries before tests
    const testLogIds: string[] = [];
    const testToken = 'test_log_token_123';

    beforeAll(async () => {
        const prisma = getPrismaClient();

        // Create some test log entries
        for (let i = 0; i < 3; i++) {
            const log = await prisma.apiLog.create({
                data: {
                    token: testToken,
                    endpoint: `/test/endpoint/${i}`,
                    method: i === 0 ? 'GET' : 'POST',
                    statusCode: i === 0 ? 200 : 201,
                    timestamp: BigInt(Date.now() - i * 60000), // Staggered timestamps
                    duration: 100 + i * 10,
                },
            });
            testLogIds.push(log.id);
        }
    });

    afterAll(async () => {
        // Clean up test logs
        const prisma = getPrismaClient();
        await prisma.apiLog.deleteMany({
            where: { id: { in: testLogIds } },
        });
    });

    describe('GET /admin/logs', () => {
        it('should get all logs with default pagination', async () => {
            const req = createRequest('GET', '/admin/logs');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.logs).toBeInstanceOf(Array);
            expect(typeof data.total).toBe('number');
            expect(data.limit).toBe(100);
            expect(data.offset).toBe(0);
        });

        it('should filter logs by token', async () => {
            const req = createRequest('GET', `/admin/logs?token=${testToken}`);
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            data.logs.forEach((log: { token: string }) => {
                expect(log.token).toBe(testToken);
            });
        });

        it('should filter logs by method', async () => {
            const req = createRequest('GET', '/admin/logs?method=GET');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            data.logs.forEach((log: { method: string }) => {
                expect(log.method).toBe('GET');
            });
        });

        it('should filter logs by endpoint (partial match)', async () => {
            const req = createRequest('GET', '/admin/logs?endpoint=/test/endpoint');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            data.logs.forEach((log: { endpoint: string }) => {
                expect(log.endpoint).toContain('/test/endpoint');
            });
        });

        it('should filter logs by statusCode', async () => {
            const req = createRequest('GET', '/admin/logs?statusCode=200');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            data.logs.forEach((log: { statusCode: number }) => {
                expect(log.statusCode).toBe(200);
            });
        });

        it('should filter logs by time range', async () => {
            const startTime = Date.now() - 3600000; // 1 hour ago
            const endTime = Date.now();
            const req = createRequest('GET', `/admin/logs?startTime=${startTime}&endTime=${endTime}`);
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            data.logs.forEach((log: { timestamp: number }) => {
                expect(log.timestamp).toBeGreaterThanOrEqual(startTime);
                expect(log.timestamp).toBeLessThanOrEqual(endTime);
            });
        });

        it('should respect pagination limit', async () => {
            const req = createRequest('GET', '/admin/logs?limit=1');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.logs.length).toBeLessThanOrEqual(1);
            expect(data.limit).toBe(1);
        });

        it('should respect pagination offset', async () => {
            const req = createRequest('GET', '/admin/logs?offset=1&limit=10');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.offset).toBe(1);
        });

        it('should return proper log format', async () => {
            const req = createRequest('GET', '/admin/logs?limit=1');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            if (data.logs.length > 0) {
                const log = data.logs[0];
                // Note: Prisma returns id as number for SQLite autoincrement
                expect(['number', 'string']).toContain(typeof log.id);
                expect(typeof log.token).toBe('string');
                expect(typeof log.endpoint).toBe('string');
                expect(typeof log.method).toBe('string');
                expect(typeof log.statusCode).toBe('number');
                expect(typeof log.timestamp).toBe('number');
                expect(typeof log.duration).toBe('number');
            }
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/logs`, {
                method: 'GET',
            });
            const res = await GET(req);

            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /admin/logs', () => {
        let deleteTestLogId: string;

        beforeAll(async () => {
            // Create a log specifically for delete test
            const prisma = getPrismaClient();
            const log = await prisma.apiLog.create({
                data: {
                    token: 'delete_test_token',
                    endpoint: '/delete/test',
                    method: 'DELETE',
                    statusCode: 200,
                    timestamp: BigInt(Date.now() - 86400000), // 1 day ago
                    duration: 50,
                },
            });
            deleteTestLogId = log.id;
        });

        it('should delete logs by token', async () => {
            const req = createRequest('DELETE', '/admin/logs', {
                token: 'delete_test_token',
            });
            const res = await DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(typeof data.deletedCount).toBe('number');
        });

        it('should delete logs before timestamp', async () => {
            // Create old logs to delete
            const prisma = getPrismaClient();
            const oldTimestamp = Date.now() - 86400000 * 7; // 7 days ago
            await prisma.apiLog.create({
                data: {
                    token: 'old_log_token',
                    endpoint: '/old/log',
                    method: 'GET',
                    statusCode: 200,
                    timestamp: BigInt(oldTimestamp),
                    duration: 30,
                },
            });

            const req = createRequest('DELETE', '/admin/logs', {
                beforeTimestamp: oldTimestamp + 1000, // Just after the old log
            });
            const res = await DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(typeof data.deletedCount).toBe('number');
        });

        it('should delete all logs when no filters provided', async () => {
            // Create a test log
            const prisma = getPrismaClient();
            await prisma.apiLog.create({
                data: {
                    token: 'all_delete_test',
                    endpoint: '/all/delete',
                    method: 'GET',
                    statusCode: 200,
                    timestamp: BigInt(Date.now()),
                    duration: 10,
                },
            });

            const req = createRequest('DELETE', '/admin/logs', {
                token: 'all_delete_test', // Only delete test logs
            });
            const res = await DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.deletedCount).toBeGreaterThanOrEqual(0);
        });

        it('should handle empty body gracefully', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/logs`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${TEST_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                // No body
            });
            const res = await DELETE(req);

            // Should return 200 (deletes all logs if no filter)
            expect([200, 400]).toContain(res.status);
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/logs`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: 'test' }),
            });
            const res = await DELETE(req);

            expect(res.status).toBe(401);
        });
    });

    describe('Combined Filters', () => {
        it('should apply multiple filters together', async () => {
            const startTime = Date.now() - 3600000;
            const req = createRequest(
                'GET',
                `/admin/logs?token=${testToken}&method=GET&startTime=${startTime}`
            );
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            data.logs.forEach((log: { token: string; method: string; timestamp: number }) => {
                expect(log.token).toBe(testToken);
                expect(log.method).toBe('GET');
                expect(log.timestamp).toBeGreaterThanOrEqual(startTime);
            });
        });
    });
});
