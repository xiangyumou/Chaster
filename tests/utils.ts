export const TEST_CONFIG = {
    BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000/api/v1',
    ADMIN_TOKEN: process.env.TEST_ADMIN_TOKEN || '', // Will be populated dynamically or via env
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
