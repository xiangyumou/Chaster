/**
 * Stress test scenarios and endpoint testers
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import { RequestResult } from './metrics.js';
import { TestConfig, generateTextContent, generateImageBase64, generateMetadata, randomDuration } from './fixtures.js';

export class EndpointTester {
    constructor(private config: TestConfig) { }

    private async makeRequest(
        endpoint: string,
        method: string,
        body?: any
    ): Promise<RequestResult> {
        const start = performance.now();
        const url = `${this.config.baseUrl}${endpoint}`;

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${this.config.token}`,
                    'Content-Type': 'application/json'
                },
                body: body ? JSON.stringify(body) : undefined
            });

            const duration = performance.now() - start;
            const success = res.ok;

            return {
                success,
                status: res.status,
                duration,
                endpoint,
                timestamp: Date.now()
            };
        } catch (e: any) {
            return {
                success: false,
                status: 0,
                duration: performance.now() - start,
                endpoint,
                error: e.message,
                timestamp: Date.now()
            };
        }
    }

    // POST /api/v1/items - Create text item
    async createTextItem(index: number): Promise<RequestResult> {
        return this.makeRequest('/items', 'POST', {
            type: 'text',
            content: generateTextContent(index),
            durationMinutes: randomDuration(),
            metadata: generateMetadata(index)
        });
    }

    // POST /api/v1/items - Create image item
    async createImageItem(index: number): Promise<RequestResult> {
        return this.makeRequest('/items', 'POST', {
            type: 'image',
            content: generateImageBase64('small'),
            durationMinutes: randomDuration(),
            originalName: `test-image-${index}.png`,
            metadata: generateMetadata(index)
        });
    }

    // GET /api/v1/items/:id - Get single item
    async getItem(itemId: string): Promise<RequestResult> {
        return this.makeRequest(`/items/${itemId}`, 'GET');
    }

    // GET /api/v1/items - List items
    async listItems(page: number = 1, limit: number = 20): Promise<RequestResult> {
        return this.makeRequest(`/items?page=${page}&limit=${limit}`, 'GET');
    }

    // POST /api/v1/items/:id/extend - Extend item
    async extendItem(itemId: string, additionalMinutes: number = 60): Promise<RequestResult> {
        return this.makeRequest(`/items/${itemId}/extend`, 'POST', {
            additionalMinutes
        });
    }

    // DELETE /api/v1/items/:id - Delete item
    async deleteItem(itemId: string): Promise<RequestResult> {
        return this.makeRequest(`/items/${itemId}`, 'DELETE');
    }

    // GET /api/v1/stats - Get stats
    async getStats(): Promise<RequestResult> {
        return this.makeRequest('/stats', 'GET');
    }

    // GET /api/v1/admin/tokens - List tokens
    async listTokens(): Promise<RequestResult> {
        return this.makeRequest('/admin/tokens', 'GET');
    }

    // POST /api/v1/admin/tokens - Create token
    async createToken(name: string): Promise<RequestResult> {
        return this.makeRequest('/admin/tokens', 'POST', { name });
    }

    // DELETE /api/v1/admin/tokens/:token - Delete token
    async deleteToken(token: string): Promise<RequestResult> {
        return this.makeRequest(`/admin/tokens/${token}`, 'DELETE');
    }

    // GET /api/health - Health check
    async healthCheck(): Promise<RequestResult> {
        const url = this.config.baseUrl.replace('/api/v1', '/api/health');
        const start = performance.now();

        try {
            const res = await fetch(url);
            const duration = performance.now() - start;

            return {
                success: res.ok,
                status: res.status,
                duration,
                endpoint: '/health',
                timestamp: Date.now()
            };
        } catch (e: any) {
            return {
                success: false,
                status: 0,
                duration: performance.now() - start,
                endpoint: '/health',
                error: e.message,
                timestamp: Date.now()
            };
        }
    }
}

export interface ScenarioConfig {
    name: string;
    concurrency: number;
    totalRequests: number;
    description: string;
}

export const TEST_SCENARIOS: Record<string, ScenarioConfig> = {
    basic: {
        name: 'Basic Load Test',
        concurrency: 50,
        totalRequests: 100,
        description: 'Low concurrency test for baseline performance'
    },
    high: {
        name: 'High Concurrency Test',
        concurrency: 200,
        totalRequests: 500,
        description: 'High load test to identify bottlenecks'
    },
    extreme: {
        name: 'Extreme Stress Test',
        concurrency: 500,
        totalRequests: 1000,
        description: 'Maximum load test to find breaking points'
    },
    sustained: {
        name: 'Sustained Load Test',
        concurrency: 100,
        totalRequests: 1000,
        description: 'Long-duration test for stability verification'
    }
};
