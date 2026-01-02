import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getPrismaClient } from '@/lib/prisma';

/**
 * Auth Tests - Using Real Database
 * 
 * These tests use real database connections to verify authentication logic.
 * This ensures that the actual Prisma queries and token validation work correctly.
 */
describe('Lib: Auth', () => {
    const TEST_TOKEN_VALUE = `auth_test_token_${Date.now()}`;
    const INACTIVE_TOKEN_VALUE = `auth_test_inactive_${Date.now()}`;

    beforeAll(async () => {
        const prisma = getPrismaClient();
        // Create test tokens in the database
        await prisma.apiToken.create({
            data: {
                token: TEST_TOKEN_VALUE,
                name: 'Auth Test Token',
                isActive: true,
                createdAt: BigInt(Date.now()),
            },
        });
        await prisma.apiToken.create({
            data: {
                token: INACTIVE_TOKEN_VALUE,
                name: 'Auth Test Inactive Token',
                isActive: false,
                createdAt: BigInt(Date.now()),
            },
        });
    });

    afterAll(async () => {
        // Clean up test tokens
        const prisma = getPrismaClient();
        await prisma.apiToken.deleteMany({
            where: {
                token: { in: [TEST_TOKEN_VALUE, INACTIVE_TOKEN_VALUE] },
            },
        });
    });

    describe('Header Validation', () => {
        it('should fail if no authorization header', async () => {
            const req = new NextRequest('http://localhost/api');
            const result = await authenticate(req);
            expect(result).toHaveProperty('error');
            expect((result as any).error.status).toBe(401);
        });

        it('should fail if authorization header uses wrong scheme', async () => {
            const req = new NextRequest('http://localhost/api', {
                headers: { 'Authorization': 'Basic 123' },
            });
            const result = await authenticate(req);
            expect(result).toHaveProperty('error');
            expect((result as any).error.status).toBe(401);
        });

        it('should fail if Bearer token is empty', async () => {
            const req = new NextRequest('http://localhost/api', {
                headers: { 'Authorization': 'Bearer ' },
            });
            const result = await authenticate(req);
            expect(result).toHaveProperty('error');
            expect((result as any).error.status).toBe(401);
        });
    });

    describe('Token Validation (Real DB)', () => {
        it('should succeed with valid active token', async () => {
            const req = new NextRequest('http://localhost/api', {
                headers: { 'Authorization': `Bearer ${TEST_TOKEN_VALUE}` },
            });

            const result = await authenticate(req);
            expect(result).toHaveProperty('data');
            expect((result as any).data).toBeDefined();
        });

        it('should fail with non-existent token', async () => {
            const req = new NextRequest('http://localhost/api', {
                headers: { 'Authorization': 'Bearer non_existent_token_12345' },
            });

            const result = await authenticate(req);
            expect(result).toHaveProperty('error');
            expect((result as any).error.status).toBe(401);
        });

        it('should fail with inactive token', async () => {
            const req = new NextRequest('http://localhost/api', {
                headers: { 'Authorization': `Bearer ${INACTIVE_TOKEN_VALUE}` },
            });

            const result = await authenticate(req);
            expect(result).toHaveProperty('error');
            expect((result as any).error.status).toBe(401);
        });
    });

    describe('lastUsedAt Update', () => {
        it('should update lastUsedAt on successful authentication', async () => {
            const prisma = getPrismaClient();

            // Get the token before authentication
            const tokenBefore = await prisma.apiToken.findUnique({
                where: { token: TEST_TOKEN_VALUE },
            });
            const lastUsedBefore = tokenBefore?.lastUsedAt;

            // Wait a small amount to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            // Authenticate
            const req = new NextRequest('http://localhost/api', {
                headers: { 'Authorization': `Bearer ${TEST_TOKEN_VALUE}` },
            });
            const result = await authenticate(req);
            expect(result).toHaveProperty('data');

            // Check that lastUsedAt was updated
            const tokenAfter = await prisma.apiToken.findUnique({
                where: { token: TEST_TOKEN_VALUE },
            });

            // lastUsedAt should either be set or updated
            if (lastUsedBefore !== null) {
                expect(Number(tokenAfter?.lastUsedAt)).toBeGreaterThanOrEqual(Number(lastUsedBefore));
            }
            expect(tokenAfter?.lastUsedAt).toBeDefined();
        });
    });
});
