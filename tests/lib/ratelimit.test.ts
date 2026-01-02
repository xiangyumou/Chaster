import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, getRateLimitStats } from '@/lib/ratelimit';
import * as redisModule from '@/lib/redis';

/**
 * Rate Limit Core Logic Tests
 * 
 * These tests verify the actual rate limiting logic in ratelimit.ts,
 * not just the wrapper. We mock the Redis module to test different scenarios:
 * - Fail-open when Redis is disconnected
 * - Counter increment logic
 * - Limit exceeded blocking
 * - TTL setting on first increment
 */

describe('Lib: Rate Limit Core Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('checkRateLimit', () => {
        it('should allow request and return remaining count when Redis is connected', async () => {
            // Mock Redis connected and returning incrementing count
            vi.spyOn(redisModule, 'isRedisConnected').mockReturnValue(true);
            const mockRedis = {
                incr: vi.fn().mockResolvedValue(1),
                expire: vi.fn().mockResolvedValue(1),
            };
            vi.spyOn(redisModule, 'getRedisClient').mockReturnValue(mockRedis as unknown as ReturnType<typeof redisModule.getRedisClient>);

            const result = await checkRateLimit('test-ip', 100, 60000);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(99);
            expect(mockRedis.incr).toHaveBeenCalled();
            // First call should set TTL
            expect(mockRedis.expire).toHaveBeenCalled();
        });

        it('should block request when limit is exceeded', async () => {
            vi.spyOn(redisModule, 'isRedisConnected').mockReturnValue(true);
            const mockRedis = {
                incr: vi.fn().mockResolvedValue(101), // Over limit of 100
                expire: vi.fn().mockResolvedValue(1),
            };
            vi.spyOn(redisModule, 'getRedisClient').mockReturnValue(mockRedis as unknown as ReturnType<typeof redisModule.getRedisClient>);

            const result = await checkRateLimit('test-ip', 100, 60000);

            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it('should return exactly at limit as allowed', async () => {
            vi.spyOn(redisModule, 'isRedisConnected').mockReturnValue(true);
            const mockRedis = {
                incr: vi.fn().mockResolvedValue(100), // Exactly at limit
                expire: vi.fn().mockResolvedValue(1),
            };
            vi.spyOn(redisModule, 'getRedisClient').mockReturnValue(mockRedis as unknown as ReturnType<typeof redisModule.getRedisClient>);

            const result = await checkRateLimit('test-ip', 100, 60000);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(0);
        });

        it('should fail-closed (deny) when Redis is not connected by default', async () => {
            // Temporarily set fail-open to false to test fail-closed behavior
            const originalEnv = process.env.RATE_LIMIT_FAIL_OPEN;
            process.env.RATE_LIMIT_FAIL_OPEN = 'false';

            // Re-import to get fresh module with mocks
            vi.resetModules();
            const { checkRateLimit: checkRL } = await import('@/lib/ratelimit');
            const redis = await import('@/lib/redis');

            vi.spyOn(redis, 'isRedisConnected').mockReturnValue(false);

            const result = await checkRL('test-ip-disconnected', 100, 60000);

            // Default behavior is fail-closed (deny request)
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);

            // Restore
            if (originalEnv !== undefined) {
                process.env.RATE_LIMIT_FAIL_OPEN = originalEnv;
            } else {
                delete process.env.RATE_LIMIT_FAIL_OPEN;
            }
        });

        it('should fail-closed (deny) when Redis throws an error by default', async () => {
            // Temporarily set fail-open to false to test fail-closed behavior
            const originalEnv = process.env.RATE_LIMIT_FAIL_OPEN;
            process.env.RATE_LIMIT_FAIL_OPEN = 'false';

            // Re-import to get fresh module with mocks
            vi.resetModules();
            const { checkRateLimit: checkRL } = await import('@/lib/ratelimit');
            const redis = await import('@/lib/redis');

            vi.spyOn(redis, 'isRedisConnected').mockReturnValue(true);
            const mockRedis = {
                incr: vi.fn().mockRejectedValue(new Error('Redis connection lost')),
            };
            vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as unknown as ReturnType<typeof redis.getRedisClient>);

            const result = await checkRL('test-ip-error', 100, 60000);

            // Default behavior is fail-closed (deny request)
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);

            // Restore
            if (originalEnv !== undefined) {
                process.env.RATE_LIMIT_FAIL_OPEN = originalEnv;
            } else {
                delete process.env.RATE_LIMIT_FAIL_OPEN;
            }
        });

        it('should fail-open (allow) when RATE_LIMIT_FAIL_OPEN is true and Redis disconnected', async () => {
            const originalEnv = process.env.RATE_LIMIT_FAIL_OPEN;
            process.env.RATE_LIMIT_FAIL_OPEN = 'true';

            vi.spyOn(redisModule, 'isRedisConnected').mockReturnValue(false);

            const result = await checkRateLimit('test-ip', 100, 60000);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(100);

            // Restore
            if (originalEnv !== undefined) {
                process.env.RATE_LIMIT_FAIL_OPEN = originalEnv;
            } else {
                delete process.env.RATE_LIMIT_FAIL_OPEN;
            }
        });

        it('should not set TTL on subsequent increments', async () => {
            vi.spyOn(redisModule, 'isRedisConnected').mockReturnValue(true);
            const mockRedis = {
                incr: vi.fn().mockResolvedValue(5), // Not first call
                expire: vi.fn().mockResolvedValue(1),
            };
            vi.spyOn(redisModule, 'getRedisClient').mockReturnValue(mockRedis as unknown as ReturnType<typeof redisModule.getRedisClient>);

            await checkRateLimit('test-ip', 100, 60000);

            // expire should NOT be called when count > 1
            expect(mockRedis.expire).not.toHaveBeenCalled();
        });

        it('should calculate correct resetAt time', async () => {
            vi.spyOn(redisModule, 'isRedisConnected').mockReturnValue(true);
            const mockRedis = {
                incr: vi.fn().mockResolvedValue(1),
                expire: vi.fn().mockResolvedValue(1),
            };
            vi.spyOn(redisModule, 'getRedisClient').mockReturnValue(mockRedis as unknown as ReturnType<typeof redisModule.getRedisClient>);

            const windowMs = 60000;
            const now = Date.now();
            const result = await checkRateLimit('test-ip', 100, windowMs);

            // resetAt should be at the end of the current window
            expect(result.resetAt).toBeGreaterThan(now);
            expect(result.resetAt).toBeLessThanOrEqual(now + windowMs);
        });

        it('should use custom limit parameter', async () => {
            vi.spyOn(redisModule, 'isRedisConnected').mockReturnValue(true);
            const mockRedis = {
                incr: vi.fn().mockResolvedValue(6), // Over custom limit of 5
                expire: vi.fn().mockResolvedValue(1),
            };
            vi.spyOn(redisModule, 'getRedisClient').mockReturnValue(mockRedis as unknown as ReturnType<typeof redisModule.getRedisClient>);

            const result = await checkRateLimit('test-ip', 5, 60000);

            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });
    });

    describe('getRateLimitStats', () => {
        it('should return null when Redis is not connected', async () => {
            vi.spyOn(redisModule, 'isRedisConnected').mockReturnValue(false);

            const result = await getRateLimitStats('test-ip');

            expect(result).toBeNull();
        });

        it('should return count and resetAt when key exists', async () => {
            vi.spyOn(redisModule, 'isRedisConnected').mockReturnValue(true);
            const mockRedis = {
                get: vi.fn().mockResolvedValue('42'),
            };
            vi.spyOn(redisModule, 'getRedisClient').mockReturnValue(mockRedis as unknown as ReturnType<typeof redisModule.getRedisClient>);

            const result = await getRateLimitStats('test-ip');

            expect(result).not.toBeNull();
            expect(result!.count).toBe(42);
            expect(result!.resetAt).toBeGreaterThan(Date.now());
        });

        it('should return null when key does not exist', async () => {
            vi.spyOn(redisModule, 'isRedisConnected').mockReturnValue(true);
            const mockRedis = {
                get: vi.fn().mockResolvedValue(null),
            };
            vi.spyOn(redisModule, 'getRedisClient').mockReturnValue(mockRedis as unknown as ReturnType<typeof redisModule.getRedisClient>);

            const result = await getRateLimitStats('test-ip');

            expect(result).toBeNull();
        });

        it('should return null when Redis throws an error', async () => {
            vi.spyOn(redisModule, 'isRedisConnected').mockReturnValue(true);
            const mockRedis = {
                get: vi.fn().mockRejectedValue(new Error('Redis error')),
            };
            vi.spyOn(redisModule, 'getRedisClient').mockReturnValue(mockRedis as unknown as ReturnType<typeof redisModule.getRedisClient>);

            const result = await getRateLimitStats('test-ip');

            expect(result).toBeNull();
        });
    });
});
