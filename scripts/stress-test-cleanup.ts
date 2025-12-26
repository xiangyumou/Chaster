#!/usr/bin/env node
/**
 * Stress Test Cleanup Script
 * Removes all stress test data from the database
 */

import { getPrismaClient } from '../src/lib/prisma.js';

async function cleanup() {
    console.log('🧹 Cleaning up stress test data...');

    const db = getPrismaClient();

    try {
        // Delete all items with stress-test markers
        const result = await db.item.deleteMany({
            where: {
                OR: [
                    { metadata: { contains: '"_testType":"stress"' } },
                    { metadata: { contains: '"_test":true' } },
                    { metadata: { contains: 'stress-test' } },
                    { metadata: { contains: 'Stress Test' } }
                ]
            }
        });

        console.log(`✅ Cleaned up ${result.count} stress test items`);

        // Also clean up test API logs if any
        const logResult = await db.apiLog.deleteMany({
            where: {
                token: { contains: 'test' }
            }
        });

        console.log(`✅ Cleaned up ${logResult.count} test API logs`);

        await db.$disconnect();

        console.log('✨ Cleanup complete!');

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        await db.$disconnect();
        process.exit(1);
    }
}

// Run cleanup immediately when script is executed
cleanup();

