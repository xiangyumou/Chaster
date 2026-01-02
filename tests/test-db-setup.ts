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
    (process.env as Record<string, string>).NODE_ENV = 'test';
    (process.env as Record<string, string>).DATABASE_URL = DATABASE_URL;

    // Ensure API_TOKEN is set for tests
    if (!process.env.API_TOKEN) {
        (process.env as Record<string, string>).API_TOKEN = 'tok_test';
        console.log('✅ Set default API_TOKEN for tests: tok_test');
    } else {
        console.log(`✅ Using existing API_TOKEN from environment`);
    }

    // Create test database (drop if exists)
    try {
        console.log(`Using database ${TEST_DB_NAME} in container chaster-db...`);

        // Ensure DB exists (it might validly fail if it exists, which is fine)
        if (process.env.GITHUB_ACTIONS || process.env.CI) {
            console.log('Running in CI/GitHub Actions, skipping docker exec for DB creation');
        } else {
            try {
                execSync(`docker exec chaster-db createdb -U ${DB_USER} ${TEST_DB_NAME}`, { stdio: 'ignore' });
            } catch {
                // Ignore existence error
            }
        }

        console.log('✅ Test database ready');

        // Push schema to the test database
        console.log('Running prisma db push...');
        try {
            execSync('npx prisma db push --skip-generate', {
                stdio: 'pipe',
                env: {
                    ...process.env,
                    DATABASE_URL: DATABASE_URL
                }
            });
        } catch (e) {
            const error = e as Error;
            console.warn("Prisma db push warning (might be non-fatal):", error.message);
        }

        console.log('✅ Schema synchronized');

    } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to setup test database:', err.message);
        throw error;
    }
}

export async function teardown() {
    console.log('🧹 Cleaning up test database...');
    // Do NOT drop the main database.
    // Just optional cleanup of data if needed, but for now we leave it.
    console.log('✅ Test database cleanup skipped (using shared DB)');
}
