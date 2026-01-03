import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import { TEST_CONFIG } from '../setup.js';
import { authHeader, ItemResponse, ErrorResponse } from '../utils';

// These are live integration tests that require a running server
// They are skipped by default. To run them:
// 1. Start the dev server: npm run dev
// 2. Set TEST_TOKEN env var with a valid token
// 3. Run: npm run test:integration
const describeIntegration = process.env.RUN_INTEGRATION_TESTS ? describe : describe.skip;

describeIntegration('Chaster Integration Tests', () => {
    let authToken: string;

    beforeAll(() => {
        // Read token from TEST_CONFIG which is set by test setup
        authToken = TEST_CONFIG.TOKEN || process.env.TEST_TOKEN || '';

        if (!authToken) {
            console.warn('⚠️  WARNING: TEST_TOKEN not set. Integration tests may fail.');
            console.warn('Set TEST_TOKEN env var or the test will use auto-generated token.');
        }
    });

    it('should have a token for testing', () => {
        expect(authToken).toBeTruthy();
    });

    // =========================================================================
    // Items API Tests
    // =========================================================================

    describe('Items API', () => {
        // Test data created in beforeAll for test isolation
        let testItemId: string;
        const createdItemIds: string[] = [];

        /**
         * Setup: Create primary test item once for all tests in this describe block
         * This ensures tests are isolated and can run independently
         */
        beforeAll(async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items`, {
                method: 'POST',
                headers: authHeader(authToken),
                body: JSON.stringify({
                    type: 'text',
                    content: 'Integration Test Content',
                    durationMinutes: 5
                })
            });
            const data = await res.json() as ItemResponse;
            testItemId = data.id;
            createdItemIds.push(testItemId);
        });

        /**
         * Cleanup: Delete all created items after tests complete
         */
        afterAll(async () => {
            for (const id of createdItemIds) {
                try {
                    await fetch(`${TEST_CONFIG.BASE_URL}/items/${id}`, {
                        method: 'DELETE',
                        headers: authHeader(authToken)
                    });
                } catch {
                    // Ignore cleanup errors
                }
            }
        });

        // =================================================================
        // CREATE Tests
        // =================================================================

        it('should create a text item', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items`, {
                method: 'POST',
                headers: authHeader(authToken),
                body: JSON.stringify({
                    type: 'text',
                    content: 'New Integration Test Item',
                    durationMinutes: 1
                })
            });
            const data = await res.json() as ItemResponse;

            expect(res.status).toBe(201);
            expect(data.id).toBeDefined();
            expect(data.type).toBe('text');
            expect(data.layerCount).toBe(1);
            createdItemIds.push(data.id);
        });

        it('should create an image item', async () => {
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
            const data = await res.json() as ItemResponse;
            createdItemIds.push(data.id);
        });

        it('should fail with invalid type', async () => {
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
            const data = await res.json() as ErrorResponse;
            expect(data.error.code).toBe('VALIDATION_ERROR');
        });

        it('should fail with empty content', async () => {
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

        it('should fail with negative duration', async () => {
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

        // =================================================================
        // READ Tests
        // =================================================================

        it('should get locked item with hidden content', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items/${testItemId}`, {
                method: 'GET',
                headers: authHeader(authToken)
            });
            expect(res.status).toBe(200);
            const data = await res.json() as ItemResponse;

            expect(data.id).toBe(testItemId);
            expect(data.unlocked).toBe(false);
            expect(data.content).toBeNull(); // Content should be hidden
            expect(data.timeRemainingMs).toBeGreaterThan(0);
        });

        it('should return 404 for non-existent item', async () => {
            const uuid = '00000000-0000-0000-0000-000000000000';
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items/${uuid}`, {
                method: 'GET',
                headers: authHeader(authToken)
            });
            expect(res.status).toBe(404);
        });

        it('should handle invalid UUID format', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items/invalid-uuid-123`, {
                method: 'GET',
                headers: authHeader(authToken)
            });
            // Should be 400 (Bad Request) validation failure or 404
            expect([400, 404]).toContain(res.status);
        });

        // =================================================================
        // EXTEND Tests
        // =================================================================

        it('should extend lock duration', async () => {
            // First get current decryptAt
            const getRes = await fetch(`${TEST_CONFIG.BASE_URL}/items/${testItemId}`, {
                headers: authHeader(authToken)
            });
            const originalData = await getRes.json() as ItemResponse;
            const originalDecryptAt = originalData.decryptAt;

            // Extend by 10 mins
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items/${testItemId}/extend`, {
                method: 'POST',
                headers: authHeader(authToken),
                body: JSON.stringify({ minutes: 10 })
            });
            expect(res.status).toBe(200);

            // Verify new date is original + 10 minutes
            const newData = await res.json() as ItemResponse;
            const expectedDecryptAt = originalDecryptAt + (10 * 60 * 1000);
            expect(newData.decryptAt).toBe(expectedDecryptAt);
            expect(newData.layerCount).toBeGreaterThan(1);
        });

        it('should fail to extend with negative minutes', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items/${testItemId}/extend`, {
                method: 'POST',
                headers: authHeader(authToken),
                body: JSON.stringify({ minutes: -10 })
            });
            expect(res.status).toBe(400);
        });
    });

    // =========================================================================
    // Authentication Tests
    // =========================================================================

    describe('Authentication', () => {
        it('should return 401 when token is missing', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items`);
            expect(res.status).toBe(401);
            const data = await res.json() as ErrorResponse;
            expect(data.error.code).toBe('MISSING_TOKEN');
        });

        it('should return 401 with invalid token', async () => {
            const res = await fetch(`${TEST_CONFIG.BASE_URL}/items`, {
                headers: { 'Authorization': 'Bearer invalid-token-123' }
            });
            expect(res.status).toBe(401);
            const data = await res.json() as ErrorResponse;
            expect(data.error.code).toBe('INVALID_TOKEN');
        });
    });
});
