import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import path from 'path';

const TEST_DB_PATH = path.join(process.cwd(), 'prisma/data/test.db');
const TEST_DB_WAL = TEST_DB_PATH + '-wal';
const TEST_DB_SHM = TEST_DB_PATH + '-shm';

export async function setup() {
    console.log('🔧 Setting up test database...');

    // Set test environment
    (process.env as any).NODE_ENV = 'test';
    (process.env as any).DATABASE_URL = `file:${TEST_DB_PATH}`;

    // Clean up any existing test database
    cleanupTestDb();

    // Create test database and run migrations
    try {
        execSync('npx prisma db push --skip-generate', {
            stdio: 'pipe',
            env: {
                ...process.env,
                DATABASE_URL: `file:${TEST_DB_PATH}`
            }
        });

        console.log('✅ Test database created successfully');

        // Create a test token for integration tests
        await createTestToken();

    } catch (error: any) {
        console.error('❌ Failed to setup test database:', error.message);
        throw error;
    }
}

export async function teardown() {
    console.log('🧹 Cleaning up test database...');
    cleanupTestDb();
    console.log('✅ Test database cleanup complete');
}

function cleanupTestDb() {
    [TEST_DB_PATH, TEST_DB_WAL, TEST_DB_SHM].forEach(file => {
        if (existsSync(file)) {
            try {
                unlinkSync(file);
            } catch (e) {
                console.warn(`Warning: Could not delete ${file}`);
            }
        }
    });
}

async function createTestToken() {
    // Import dynamically to avoid loading before env is set
    const { getPrismaClient } = await import('../src/lib/prisma.js');
    const db = getPrismaClient();

    const testToken = 'tok_test_vitest_' + Date.now();

    await db.apiToken.create({
        data: {
            token: testToken,
            name: 'Vitest Test Token',
            createdAt: BigInt(Date.now()),
            isActive: true
        }
    });

    // Export for tests to use
    process.env.TEST_TOKEN = testToken;

    console.log(`✅ Created test token: ${testToken.substring(0, 20)}...`);
}
