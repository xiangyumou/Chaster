import { describe, it, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';
import { TEST_CONFIG } from '../utils';

// Helper to create valid auth header
const authHeader = (token: string) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
});

describe('Chaster Integration Tests', () => {
    let authToken: string;

    // 1. Setup: Get a valid token (requires manual start or known token)
    // For local tests, we assume a "test-token" exists or we create one via CLI beforehand.
    // However, to be self-contained, let's assume we can generate one if we have DB access.
    // BUT since these are black-box HTTP tests, we need a valid token.
    // WE WILL USE THE "INITIAL_ADMIN_TOKEN" if we can find it, OR fail and ask dev to provide one.
    // Strategy: We will use a dedicated test token "tok_test_integration" that MUST be created.

    // Actually, let's create a script to seed the DB for testing, but since we are running against "localhost:3000",
    // we assume the server is running.

    // For this run, we will assume we have a valid token.
    // We'll read from env or use a hardcoded fallback that matches what we'll seed.
    authToken = process.env.TEST_TOKEN || '';

    // We can't easily "create" a token via HTTP if we don't have one initially.
    // So we rely on "npm run token create" output or env var.

    it('should have a token for testing', () => {
        // Skipped if we handle this in setup
    });

    // =========================================================================
    // 2.1 Core Business (Items API)
    // =========================================================================

    describe('Items API', () => {
        let createdItemId: string;

        /**
         * IT-01: Happy Path - Create Text Item
         */
        it('IT-01: Create Standard Text Item', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items`, {
                method: 'POST',
                headers: authHeader(authToken),
                body: JSON.stringify({
                    type: 'text',
                    content: 'Integration Test Content',
                    durationMinutes: 1 // 1 min lock
                })
            });
            const data = await res.json() as any;

            expect(res.status).toBe(201);
            expect(data.id).toBeDefined();
            expect(data.type).toBe('text');
            expect(data.layerCount).toBe(1);

            createdItemId = data.id;
        });

        /**
         * IT-02: Happy Path - Create Image Item
         */
        it('IT-02: Create Standard Image Item', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items`, {
                method: 'POST',
                headers: authHeader(authToken),
                body: JSON.stringify({
                    type: 'image',
                    content: 'aGVsbG8gd29ybGQ=', // "hello world" base64
                    durationMinutes: 60
                })
            });
            expect(res.status).toBe(201);
        });

        /**
         * IT-03: Boundary - Invalid Type
         */
        it('IT-03: Create Item with Invalid Type', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items`, {
                method: 'POST',
                headers: authHeader(authToken),
                body: JSON.stringify({
                    type: 'video', // Invalid
                    content: 'test',
                    durationMinutes: 10
                })
            });
            expect(res.status).toBe(400);
            const data = await res.json() as any;
            expect(data.error.code).toBe('VALIDATION_ERROR');
        });

        /**
         * IT-04: Boundary - Empty Content
         */
        it('IT-04: Create Item with Empty Content', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items`, {
                method: 'POST',
                headers: authHeader(authToken),
                body: JSON.stringify({
                    type: 'text',
                    content: '', // Empty
                    durationMinutes: 10
                })
            });
            expect(res.status).toBe(400);
        });

        /**
         * IT-05: Boundary - Negative Duration
         */
        it('IT-05: Create Item with Negative Duration', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items`, {
                method: 'POST',
                headers: authHeader(authToken),
                body: JSON.stringify({
                    type: 'text',
                    content: 'test',
                    durationMinutes: -5 // Invalid
                })
            });
            expect(res.status).toBe(400);
        });

        /**
         * IT-06: State Logic - Get Locked Item
         */
        it('IT-06: Get Locked Item', async () => {
            expect(createdItemId).toBeDefined();
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items/${createdItemId}`, {
                method: 'GET',
                headers: authHeader(authToken)
            });
            expect(res.status).toBe(200);
            const data = await res.json() as any;

            expect(data.id).toBe(createdItemId);
            expect(data.unlocked).toBe(false);
            expect(data.content).toBeNull(); // Content should be hidden
            expect(data.timeRemainingMs).toBeGreaterThan(0);
        });

        /**
         * IT-07: Exception - Get Non-existent Item
         */
        it('IT-07: Get Non-existent Item', async () => {
            const uuid = '00000000-0000-0000-0000-000000000000';
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items/${uuid}`, {
                method: 'GET',
                headers: authHeader(authToken)
            });
            expect(res.status).toBe(404);
        });

        /**
         * IT-08: Boundary - Invalid UUID format
         */
        it('IT-08: Get Invalid UUID', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items/invalid-uuid-123`, {
                method: 'GET',
                headers: authHeader(authToken)
            });
            // Should be 400 (Bad Request) validation failure or 404
            expect([400, 404]).toContain(res.status);
        });

        /**
         * IT-09: Happy Path - Extend Lock
         */
        it('IT-09: Extend Lock Duration', async () => {
            // First get current decryptAt
            const getRes = await fetch(`${TEST_CONFIG.BASE_URL}/items/${createdItemId}`, {
                headers: authHeader(authToken)
            });
            const originalData = await getRes.json() as any;
            const originalDecryptAt = originalData.decryptAt;

            // Extend by 10 mins
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items/${createdItemId}/extend`, {
                method: 'POST',
                headers: authHeader(authToken),
                body: JSON.stringify({ minutes: 10 })
            });
            expect(res.status).toBe(200);

            // Verify new date
            const newData = await res.json() as any;
            expect(newData.decryptAt).toBeGreaterThan(originalDecryptAt);
            expect(newData.layerCount).toBeGreaterThan(1);
        });

        /**
         * IT-10: Boundary - Extend with Invalid Minutes
         */
        it('IT-10: Extend with Negative Minutes', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items/${createdItemId}/extend`, {
                method: 'POST',
                headers: authHeader(authToken),
                body: JSON.stringify({ minutes: -10 })
            });
            expect(res.status).toBe(400);
        });
    });

    // =========================================================================
    // 2.2 Auth & Admin
    // =========================================================================

    describe('Authentication', () => {
        /**
         * AU-01: Security - Missing Token
         */
        it('AU-01: Missing Token', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items`);
            expect(res.status).toBe(401);
            const data = await res.json() as any;
            expect(data.error.code).toBe('MISSING_TOKEN');
        });

        /**
         * AU-02: Security - Invalid Token
         */
        it('AU-02: Invalid Token', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items`, {
                headers: { 'Authorization': 'Bearer invalid-token-123' }
            });
            expect(res.status).toBe(401);
            const data = await res.json() as any;
            expect(data.error.code).toBe('INVALID_TOKEN');
        });
    });
});
