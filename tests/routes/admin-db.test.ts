import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as GET_DB_INFO } from '@/app/api/v1/admin/db/info/route';
import { POST as POST_BACKUP } from '@/app/api/v1/admin/db/backup/route';
import { POST as POST_VACUUM } from '@/app/api/v1/admin/db/vacuum/route';

const TEST_TOKEN = process.env.API_TOKEN || 'tok_test';
const BASE_URL = 'http://localhost:3000/api/v1';

function createRequest(method: string, apiPath: string, body?: unknown) {
    const url = `${BASE_URL}${apiPath}`;
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

describe('Admin DB API (In-Process)', () => {
    describe('GET /admin/db/info', () => {
        it('should return database information', async () => {
            const req = createRequest('GET', '/admin/db/info');
            const res = await GET_DB_INFO(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.type).toEqual('postgresql');
            // Postgres implementation returns databaseSize string
            expect(typeof data.databaseSize).toBe('string');
            // sizeBytes/sizeMB are not returned for Postgres implementation
        });

        it('should return record counts', async () => {
            const req = createRequest('GET', '/admin/db/info');
            const res = await GET_DB_INFO(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(typeof data.itemCount).toBe('number');
            expect(typeof data.logCount).toBe('number');
            expect(typeof data.configCount).toBe('number');
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/db/info`, {
                method: 'GET',
            });
            const res = await GET_DB_INFO(req);

            expect(res.status).toBe(401);
        });
    });

    describe('POST /admin/db/backup', () => {
        it('should return PostgreSQL backup guidance message', async () => {
            const req = createRequest('POST', '/admin/db/backup');
            const res = await POST_BACKUP(req);
            const data = await res.json();

            // PostgreSQL implementation always returns 200 with guidance
            expect(res.status).toBe(200);
            expect(data.message).toContain('PostgreSQL backup');
            expect(data.options).toBeInstanceOf(Array);
            expect(data.options.length).toBeGreaterThan(0);
            expect(data.timestamp).toBeDefined();
            // Timestamp is epoch ms (number) or ISO string
            expect(['number', 'string']).toContain(typeof data.timestamp);
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/db/backup`, {
                method: 'POST',
            });
            const res = await POST_BACKUP(req);

            expect(res.status).toBe(401);
        });
    });

    describe('POST /admin/db/vacuum', () => {
        it('should run vacuum successfully', async () => {
            const req = createRequest('POST', '/admin/db/vacuum');
            const res = await POST_VACUUM(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/db/vacuum`, {
                method: 'POST',
            });
            const res = await POST_VACUUM(req);

            expect(res.status).toBe(401);
        });
    });

    describe('Database Health Check', () => {
        it('should report consistent data between info calls', async () => {
            const req1 = createRequest('GET', '/admin/db/info');
            const res1 = await GET_DB_INFO(req1);
            const data1 = await res1.json();

            const req2 = createRequest('GET', '/admin/db/info');
            const res2 = await GET_DB_INFO(req2);
            const data2 = await res2.json();

            // Type and path should be stable
            expect(data1.type).toBe(data2.type);
            expect(data1.path).toBe(data2.path);

            // Counts might change slightly but should be valid numbers
            expect(typeof data2.itemCount).toBe('number');
        });
    });
});
