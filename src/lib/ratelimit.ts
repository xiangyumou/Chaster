/**
 * In-memory Rate Limiting
 * Suitable for single-instance deployments
 * For multi-instance deployments, consider using Redis-based rate limiting
 */

interface RateLimitRecord {
    count: number;
    resetAt: number;
}

const requests = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (typically IP address)
 * @param limit - Maximum number of requests allowed in the time window
 * @param windowMs - Time window in milliseconds (default: 60000ms = 1 minute)
 * @returns Rate limit result
 */
export function checkRateLimit(
    key: string,
    limit: number = 100,
    windowMs: number = 60000
): RateLimitResult {
    const now = Date.now();
    const record = requests.get(key);

    // No record or expired record - allow and create new
    if (!record || now > record.resetAt) {
        const resetAt = now + windowMs;
        requests.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: limit - 1, resetAt };
    }

    // Limit exceeded
    if (record.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: record.resetAt };
    }

    // Increment count
    record.count++;
    return {
        allowed: true,
        remaining: limit - record.count,
        resetAt: record.resetAt,
    };
}

/**
 * Clean up expired records periodically
 * Runs every minute to prevent memory leaks
 */
function cleanupExpiredRecords() {
    const now = Date.now();
    for (const [key, value] of requests.entries()) {
        if (now > value.resetAt) {
            requests.delete(key);
        }
    }
}

// Run cleanup every minute
setInterval(cleanupExpiredRecords, 60000);

/**
 * Get current rate limit stats for a key
 * @param key - Unique identifier
 * @returns Current stats or null if no record exists
 */
export function getRateLimitStats(key: string): RateLimitRecord | null {
    const record = requests.get(key);
    if (!record || Date.now() > record.resetAt) {
        return null;
    }
    return record;
}
