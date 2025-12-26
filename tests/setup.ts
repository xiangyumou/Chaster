// Global test setup - runs once before all tests
// Individual test files can add their own beforeEach/afterEach if needed

// Export test configuration
export const TEST_CONFIG = {
    BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000/api/v1',
    TOKEN: process.env.TEST_TOKEN || '',
};
