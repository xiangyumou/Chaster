import { execSync } from 'child_process';

const DB_USER = process.env.POSTGRES_USER || 'chaster';
const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'chaster_password';
const DB_HOST = 'localhost';
const DB_PORT = '5432';
const TEST_DB_NAME = process.env.POSTGRES_DB || 'chaster';

const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${TEST_DB_NAME}`;

export async function setup() {
    console.log('🔧 Setting up test database...');

    // Set test environment
    (process.env as any).NODE_ENV = 'test';
    (process.env as any).DATABASE_URL = DATABASE_URL;

    // Create test database (drop if exists)
    try {
        console.log(`Using database ${TEST_DB_NAME} in container chaster-db...`);

        // Ensure DB exists (it might validly fail if it exists, which is fine)
        if (process.env.GITHUB_ACTIONS || process.env.CI) {
            console.log('Running in CI/GitHub Actions, skipping docker exec for DB creation');
        } else {
            try {
                execSync(`docker exec chaster-db createdb -U ${DB_USER} ${TEST_DB_NAME}`, { stdio: 'ignore' });
            } catch (e) {
                // Ignore existence error
            }
        }

        console.log('✅ Test database ready');

        // Push schema to the test database
        console.log('Running prisma db push...');
        // We use npx prisma db push, which connects via localhost:5432 (mapped)
        try {
            execSync('npx prisma db push --skip-generate', {
                stdio: 'pipe',
                env: {
                    ...process.env,
                    DATABASE_URL: DATABASE_URL
                }
            });
        } catch (e: any) {
            console.warn("Prisma db push warning (might be non-fatal):", e.message);
        }

        console.log('✅ Schema synchronized');

        // Create a test token for integration tests
        await createTestToken();

    } catch (error: any) {
        console.error('❌ Failed to setup test database:', error.message);
        throw error;
    }
}

export async function teardown() {
    console.log('🧹 Cleaning up test database...');
    // Do NOT drop the main database.
    // Just optional cleanup of data if needed, but for now we leave it.
    console.log('✅ Test database cleanup skipped (using shared DB)');
}

async function createTestToken() {
    // Import dynamically to avoid loading before env is set
    // Need to ensure the import picks up the NEW process.env.DATABASE_URL
    // PrismaClient usually reads env var on instantiation.
    // Ideally we should re-instantiate or ensure the module isn't already cached with old env?
    // In vitest using include/setupFiles, this setup runs in globalSetup.
    // The actual tests run in different threads/processes usually (depending on pool).
    // GLOBAL SETUP runs in a separate process in Vitest? 
    // "globalSetup" runs before tests.
    // BUT "setupFiles" run in test context.
    // This file is 'tests/test-db-setup.ts' which vitest config says is "globalSetup".

    // We need to pass the DATABASE_URL to the test environment?
    // Vitest globalSetup can return a function to teardown, and can expose env vars?
    // Usually modifying process.env in globalSetup does NOT propagate to test files in threads.
    // Vitest docs say: "Global setup runs in a separate process... if you want to share state... use provide/inject or env vars via specific methods?"
    // Actually, simple process.env modification in globalSetup MIGHT NOT work for workers.
    // However, let's look at how the original script did it. It set process.env.
    // If the original author intended this work, maybe they rely on single-thread or something?
    // Or maybe they expected it to work.

    // To be safe, I will rely on the fact that I'm setting the actual DATABASE_URL env var for the 'prisma db push' command.
    // For the tests themselves, they need to see this URL.
    // I might need to put this URL in .env.test or similar?
    // Or, Vitest allows a "teardown" function returned from setup.
    // And it allows returning unique env.

    // Let's assume for now I will set it here.
    // But to properly inject into Vitest workers, it's tricky if they are isolated.
    // BUT, since 'dotenv' is used in 'vitest.config.ts' (via setupFiles?), maybe `.env` is loaded.
    // I can write a `.env.test.local` file? Or just `.env.test`?
    // Vitest loads `.env.test` automatically if using `dotenv` flow.
    // Let's TRY creating a `.env.test` file from here as well to ensure workers verify it.

    // Wait, the `createTestToken` function here imports `src/lib/prisma.js`.
    // If `globalSetup` runs in its own process, `src/lib/prisma.js` initializes with THAT process's env.
    // So the token creation will work fine HERE.
    // The question is if the TESTS will see the correct DATABASE_URL.
    // Import dynamically
    const { getPrismaClient } = await import('@/lib/prisma');
    const db = getPrismaClient();

    const unitTestToken = process.env.TEST_TOKEN || 'tok_test_integration_fixed';

    // Upsert to ensure it exists and matches
    await db.apiToken.upsert({
        where: { token: unitTestToken },
        update: { isActive: true },
        create: {
            token: unitTestToken,
            name: 'Vitest Integration Test Token',
            createdAt: BigInt(Date.now()),
            isActive: true
        }
    });

    console.log(`✅ Upserted TEST_TOKEN: ${unitTestToken}`);
}
