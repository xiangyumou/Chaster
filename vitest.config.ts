import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        globalSetup: ['tests/test-db-setup.ts'],
        setupFiles: ['tests/setup.ts'],
        testTimeout: 30000,
        hookTimeout: 30000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/app/api/**/*.ts', 'src/lib/**/*.ts'],
            exclude: ['src/app/api/auth/[...nextauth]/route.ts', '**/*.test.ts', 'src/lib/types.ts']
        },
        env: {
            // Ensure these match tests/test-db-setup.ts
            TEST_TOKEN: 'tok_test_integration_fixed',
            UNIT_TEST_TOKEN: 'tok_test_integration_fixed',
            API_TOKEN: 'tok_test_integration_fixed',
            DATABASE_URL: 'postgresql://chaster:chaster_password@localhost:5432/chaster',
            // Enable fail-open for tests since Redis is not available in test environment
            RATE_LIMIT_FAIL_OPEN: 'true',
        }
    },
});
