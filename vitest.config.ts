import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        testTimeout: 30000, // 30s timeout for slower integration tests
        hookTimeout: 30000,
    },
});
