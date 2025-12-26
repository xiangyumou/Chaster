import { beforeEach, afterEach } from 'vitest';
import { getPrismaClient } from '@/lib/prisma';

// This runs before each test
beforeEach(async () => {
    const db = getPrismaClient();

    // Clean all tables (except ApiToken to keep test token)
    await db.item.deleteMany({});
    await db.apiLog.deleteMany({});
    await db.systemConfig.deleteMany({});
});

// This runs after each test for extra safety
afterEach(async () => {
    const db = getPrismaClient();

    // Clean again to ensure isolation
    await db.item.deleteMany({});
    await db.apiLog.deleteMany({});
});

// Export test configuration
export const TEST_CONFIG = {
    BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000/api/v1',
    TOKEN: process.env.TEST_TOKEN || '',
};
