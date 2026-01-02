import Redis from 'ioredis';
import { logger } from './logger';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance (singleton)
 */
export function getRedisClient(): Redis {
    if (!redisClient) {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                // Retry with exponential backoff, max 3 seconds
                const delay = Math.min(times * 50, 3000);
                return delay;
            },
            reconnectOnError(err) {
                // Reconnect on connection errors
                const targetErrors = ['READONLY', 'ECONNREFUSED', 'ENOTFOUND'];
                return targetErrors.some(target => err.message.includes(target));
            },
        });

        redisClient.on('error', (error) => {
            logger.error('Redis client error', error);
        });

        redisClient.on('connect', () => {
            logger.info('Redis client connected', { url: redisUrl });
        });

        redisClient.on('ready', () => {
            logger.info('Redis client ready');
        });

        redisClient.on('reconnecting', () => {
            logger.warn('Redis client reconnecting');
        });
    }

    return redisClient;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisClient(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}

/**
 * Check if Redis client is connected
 */
export function isRedisConnected(): boolean {
    return redisClient?.status === 'ready';
}
