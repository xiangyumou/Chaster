import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/v1/admin/config/[key]/route';
import { POST } from '@/app/api/v1/admin/config/route';
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

describe('Admin Config [key] API (In-Process)', () => {
    const testKey = `test_key_${Date.now()}`;
    const testValue = 'test_value_initial';

    // Create config key before tests
    beforeAll(async () => {
        const req = createRequest('POST', '/admin/config', {
            key: testKey,
            value: testValue,
        });
        await POST(req);
    });

    // Clean up after tests
    afterAll(async () => {
        const prisma = getPrismaClient();
        await prisma.systemConfig.deleteMany({
            where: { key: { startsWith: 'test_key_' } },
        });
    });

    describe('GET /admin/config/[key]', () => {
        it('should get config by key', async () => {
            const req = createRequest('GET', `/admin/config/${testKey}`);
            const res = await GET(req, { params: Promise.resolve({ key: testKey }) });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.key).toBe(testKey);
            expect(data.value).toBe(testValue);
        });

        it('should return 404 for non-existent key', async () => {
            const req = createRequest('GET', '/admin/config/non_existent_key_12345');
            const res = await GET(req, { params: Promise.resolve({ key: 'non_existent_key_12345' }) });
            const data = await res.json();

            expect(res.status).toBe(404);
            expect(data.error.code).toBe('CONFIG_NOT_FOUND');
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/config/${testKey}`, {
                method: 'GET',
            });
            const res = await GET(req, { params: Promise.resolve({ key: testKey }) });

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /admin/config/[key]', () => {
        it('should update existing config', async () => {
            const newValue = 'updated_value_123';
            const req = createRequest('PUT', `/admin/config/${testKey}`, {
                value: newValue,
            });
            const res = await PUT(req, { params: Promise.resolve({ key: testKey }) });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.key).toBe(testKey);
            expect(data.value).toBe(newValue);
        });

        it('should create new config via upsert', async () => {
            const newKey = `new_key_${Date.now()}`;
            const req = createRequest('PUT', `/admin/config/${newKey}`, {
                value: 'new_value',
            });
            const res = await PUT(req, { params: Promise.resolve({ key: newKey }) });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.key).toBe(newKey);
            expect(data.value).toBe('new_value');
        });

        it('should fail with missing value', async () => {
            const req = createRequest('PUT', `/admin/config/${testKey}`, {});
            const res = await PUT(req, { params: Promise.resolve({ key: testKey }) });

            expect(res.status).toBe(400);
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/config/${testKey}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: 'test' }),
            });
            const res = await PUT(req, { params: Promise.resolve({ key: testKey }) });

            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /admin/config/[key]', () => {
        it('should delete existing config', async () => {
            // Create a key to delete
            const deleteKey = `delete_key_${Date.now()}`;
            await POST(createRequest('POST', '/admin/config', {
                key: deleteKey,
                value: 'to_be_deleted',
            }));

            const req = createRequest('DELETE', `/admin/config/${deleteKey}`);
            const res = await DELETE(req, { params: Promise.resolve({ key: deleteKey }) });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should return 404 for non-existent key', async () => {
            const req = createRequest('DELETE', '/admin/config/non_existent_delete_key');
            const res = await DELETE(req, { params: Promise.resolve({ key: 'non_existent_delete_key' }) });
            const data = await res.json();

            expect(res.status).toBe(404);
            expect(data.error.code).toBe('CONFIG_NOT_FOUND');
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/config/${testKey}`, {
                method: 'DELETE',
            });
            const res = await DELETE(req, { params: Promise.resolve({ key: testKey }) });

            expect(res.status).toBe(401);
        });
    });
});
