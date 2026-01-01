// Global test setup - runs once before all tests
// Individual test files can add their own beforeEach/afterEach if needed

// Mock localStorage for zustand persist middleware (needed by store.ts)
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (i: number) => Object.keys(store)[i] || null,
    };
})();

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

// Export test configuration
export const TEST_CONFIG = {
    BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000/api/v1',
    TOKEN: process.env.TEST_TOKEN || '',
};
console.log('DEBUG: TEST_CONFIG.TOKEN:', TEST_CONFIG.TOKEN);
