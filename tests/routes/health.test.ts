import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('Health API (In-Process)', () => {
    describe('GET /health', () => {
        it('should return health status with ok status', async () => {
            const res = await GET();
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.status).toBe('ok');
        });

        it('should return version from package.json', async () => {
            const res = await GET();
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.version).toBeDefined();
            expect(typeof data.version).toBe('string');
            // Version should match semver pattern
            expect(data.version).toMatch(/^\d+\.\d+\.\d+/);
        });

        it('should return uptime as a number', async () => {
            const res = await GET();
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(typeof data.uptime).toBe('number');
            expect(data.uptime).toBeGreaterThan(0);
        });

        it('should return current timestamp', async () => {
            const beforeCall = Date.now();
            const res = await GET();
            const data = await res.json();
            const afterCall = Date.now();

            expect(res.status).toBe(200);
            expect(typeof data.timestamp).toBe('number');
            // Timestamp should be within the call window
            expect(data.timestamp).toBeGreaterThanOrEqual(beforeCall);
            expect(data.timestamp).toBeLessThanOrEqual(afterCall);
        });

        it('should return all required fields', async () => {
            const res = await GET();
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data).toHaveProperty('status');
            expect(data).toHaveProperty('version');
            expect(data).toHaveProperty('uptime');
            expect(data).toHaveProperty('timestamp');
        });
    });
});
