import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';

/**
 * Auth Tests - Using Environment Variable Token
 * 
 * These tests verify authentication logic using the API_TOKEN environment variable.
 */
describe('Lib: Auth', () => {
    const ORIGINAL_ENV = process.env.API_TOKEN;
    const TEST_TOKEN = 'test_token_12345';

    beforeAll(() => {
        process.env.API_TOKEN = TEST_TOKEN;
    });

    afterAll(() => {
        if (ORIGINAL_ENV !== undefined) {
            process.env.API_TOKEN = ORIGINAL_ENV;
        } else {
            delete process.env.API_TOKEN;
        }
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

    describe('Token Validation', () => {
        it('should succeed with valid token', async () => {
            const req = new NextRequest('http://localhost/api', {
                headers: { 'Authorization': `Bearer ${TEST_TOKEN}` },
            });

            const result = await authenticate(req);
            expect(result).toHaveProperty('data');
            expect((result as any).data.token).toBe(TEST_TOKEN);
        });

        it('should fail with invalid token', async () => {
            const req = new NextRequest('http://localhost/api', {
                headers: { 'Authorization': 'Bearer wrong_token_12345' },
            });

            const result = await authenticate(req);
            expect(result).toHaveProperty('error');
            expect((result as any).error.status).toBe(401);
        });

        it('should fail with token of different length', async () => {
            const req = new NextRequest('http://localhost/api', {
                headers: { 'Authorization': 'Bearer short' },
            });

            const result = await authenticate(req);
            expect(result).toHaveProperty('error');
            expect((result as any).error.status).toBe(401);
        });
    });

    describe('Server Configuration', () => {
        it('should return 500 when API_TOKEN is not configured', async () => {
            const originalToken = process.env.API_TOKEN;
            delete process.env.API_TOKEN;

            const req = new NextRequest('http://localhost/api', {
                headers: { 'Authorization': 'Bearer any_token' },
            });

            const result = await authenticate(req);
            expect(result).toHaveProperty('error');
            expect((result as any).error.status).toBe(500);

            // Restore
            process.env.API_TOKEN = originalToken;
        });
    });
});
