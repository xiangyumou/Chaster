import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        testTimeout: 30000,
        hookTimeout: 30000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/app/api/**/*.ts', 'src/lib/**/*.ts'],
            exclude: ['src/app/api/auth/[...nextauth]/route.ts', '**/*.test.ts']
        }
    },
});
