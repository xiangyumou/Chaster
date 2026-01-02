import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE, PATCH } from '@/app/api/v1/admin/tokens/[token]/route';
import { POST as CREATE_TOKEN, GET as LIST_TOKENS } from '@/app/api/v1/admin/tokens/route';
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

describe('Admin Tokens [token] API (In-Process)', () => {
    let createdToken: string;

    // Create a test token before tests
    beforeAll(async () => {
        const req = createRequest('POST', '/admin/tokens', {
            name: 'P1 Test Token',
        });
        const res = await CREATE_TOKEN(req);
        const data = await res.json();
        createdToken = data.token;
    });

    // Clean up after tests
    afterAll(async () => {
        const prisma = getPrismaClient();
        await prisma.apiToken.deleteMany({
            where: { name: { contains: 'P1 Test' } },
        });
    });

    describe('PATCH /admin/tokens/[token]', () => {
        it('should disable token (set isActive to false)', async () => {
            const req = createRequest('PATCH', `/admin/tokens/${createdToken}`, {
                isActive: false,
            });
            const res = await PATCH(req, { params: Promise.resolve({ token: createdToken }) });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.isActive).toBe(false);
            expect(data.token).toBe(createdToken);
        });

        it('should enable token (set isActive to true)', async () => {
            const req = createRequest('PATCH', `/admin/tokens/${createdToken}`, {
                isActive: true,
            });
            const res = await PATCH(req, { params: Promise.resolve({ token: createdToken }) });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.isActive).toBe(true);
        });

        it('should return timestamps as numbers', async () => {
            const req = createRequest('PATCH', `/admin/tokens/${createdToken}`, {
                isActive: true,
            });
            const res = await PATCH(req, { params: Promise.resolve({ token: createdToken }) });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(typeof data.createdAt).toBe('number');
        });

        it('should fail for non-existent token', async () => {
            const req = createRequest('PATCH', '/admin/tokens/non_existent_token_12345', {
                isActive: false,
            });
            const res = await PATCH(req, { params: Promise.resolve({ token: 'non_existent_token_12345' }) });

            expect(res.status).toBe(500); // Internal error from Prisma not finding record
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/tokens/${createdToken}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: false }),
            });
            const res = await PATCH(req, { params: Promise.resolve({ token: createdToken }) });

            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /admin/tokens/[token]', () => {
        it('should delete existing token', async () => {
            // Create a token specifically for deletion
            const createReq = createRequest('POST', '/admin/tokens', {
                name: 'P1 Test Token Delete',
            });
            const createRes = await CREATE_TOKEN(createReq);
            const createData = await createRes.json();
            const tokenToDelete = createData.token;

            const req = createRequest('DELETE', `/admin/tokens/${tokenToDelete}`);
            const res = await DELETE(req, { params: Promise.resolve({ token: tokenToDelete }) });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should fail for non-existent token', async () => {
            const req = createRequest('DELETE', '/admin/tokens/non_existent_token_delete');
            const res = await DELETE(req, { params: Promise.resolve({ token: 'non_existent_token_delete' }) });

            expect(res.status).toBe(500); // Internal error from Prisma
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/tokens/${createdToken}`, {
                method: 'DELETE',
            });
            const res = await DELETE(req, { params: Promise.resolve({ token: createdToken }) });

            expect(res.status).toBe(401);
        });
    });
});
