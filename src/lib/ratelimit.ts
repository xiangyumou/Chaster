/**
 * Redis-based Rate Limiting
 * Supports multi-instance deployments and persistent rate limit tracking
 */

import { getRedisClient, isRedisConnected } from './redis';
import { logger } from './logger';

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

/**
 * Check if a request should be rate limited using Redis
 * @param key - Unique identifier (typically IP address)
 * @param limit - Maximum number of requests allowed in the time window
 * @param windowMs - Time window in milliseconds (default: 60000ms = 1 minute)
 * @returns Rate limit result
 */
export async function checkRateLimit(
    key: string,
    limit: number = 100,
    windowMs: number = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
): Promise<RateLimitResult> {
    try {
        const redis = getRedisClient();

        // Check Redis connection
        if (!isRedisConnected()) {
            logger.warn('Redis not connected, allowing request (fail-open)');
            return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
        }

        // Calculate current window
        const now = Date.now();
        const window = Math.floor(now / windowMs);
        const redisKey = `ratelimit:${key}:${window}`;
        const resetAt = (window + 1) * windowMs;

        // Atomically increment counter
        const count = await redis.incr(redisKey);

        // Set TTL on first increment
        if (count === 1) {
            const ttl = Math.ceil(windowMs / 1000);
            await redis.expire(redisKey, ttl);
        }

        const allowed = count <= limit;
        const remaining = Math.max(0, limit - count);

        return { allowed, remaining, resetAt };
    } catch (error) {
        // Fail-open: allow request if Redis fails
        logger.error('Rate limit check failed, allowing request (fail-open)', error);
        return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
    }
}

/**
 * Get current rate limit stats for a key
 * @param key - Unique identifier
 * @param windowMs - Time window in milliseconds
 * @returns Current count and reset time, or null if no record exists
 */
export async function getRateLimitStats(
    key: string,
    windowMs: number = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
): Promise<{ count: number; resetAt: number } | null> {
    try {
        if (!isRedisConnected()) {
            return null;
        }

        const redis = getRedisClient();
        const window = Math.floor(Date.now() / windowMs);
        const redisKey = `ratelimit:${key}:${window}`;

        const count = await redis.get(redisKey);
        if (!count) {
            return null;
        }

        const resetAt = (window + 1) * windowMs;
        return { count: parseInt(count, 10), resetAt };
    } catch (error) {
        logger.error('Failed to get rate limit stats', error);
        return null;
    }
}
