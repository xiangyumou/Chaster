import { NextRequest } from 'next/server';

export const TEST_CONFIG = {
    BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000/api/v1',
    ADMIN_TOKEN: process.env.TEST_ADMIN_TOKEN || '', // Will be populated dynamically or via env
    TOKEN: process.env.API_TOKEN || process.env.TEST_TOKEN || 'tok_test',
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create authorization header object for authenticated requests
 */
export function authHeader(token: string = TEST_CONFIG.TOKEN): Record<string, string> {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

/**
 * Create a NextRequest for in-process route testing
 * @param method HTTP method
 * @param path API path (e.g., '/items')
 * @param body Optional request body
 * @param token Optional auth token (defaults to TEST_CONFIG.TOKEN)
 */
export function createTestRequest(
    method: string,
    path: string,
    body?: unknown,
    token: string = TEST_CONFIG.TOKEN
): NextRequest {
    const url = `${TEST_CONFIG.BASE_URL}${path}`;
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
    const init = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    };
    return new NextRequest(url, init as ConstructorParameters<typeof NextRequest>[1]);
}

/**
 * Common response type interfaces for test assertions
 */
export interface ItemResponse {
    id: string;
    type: string;
    layerCount: number;
    unlocked: boolean;
    content: string | null;
    timeRemainingMs?: number;
    decryptAt: number;
    createdAt: number;
    metadata?: Record<string, unknown>;
}

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: unknown[];
    };
}

export interface ListResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
}
