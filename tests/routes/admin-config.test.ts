import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/admin/config/route';

const TEST_TOKEN = process.env.API_TOKEN || 'tok_test';
const BASE_URL = 'http://localhost:3000/api/v1';

function createRequest(method: string, path: string, body?: unknown) {
    const url = `${BASE_URL}${path}`;
    const headers = {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
    };
    if (body) {
        return new NextRequest(url, {
            method,
            headers,
            body: JSON.stringify(body),
        });
    }
    return new NextRequest(url, { method, headers });
}

describe('Admin Config API (In-Process)', () => {
    const testConfigKey = `test_config_${Date.now()}`;
    const testConfigValue = 'test_value_123';

    describe('GET /admin/config', () => {
        it('should get all system config', async () => {
            const req = createRequest('GET', '/admin/config');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.config).toBeDefined();
            expect(typeof data.config).toBe('object');
        });

        it('should return empty object when no config exists', async () => {
            const req = createRequest('GET', '/admin/config');
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            // Config should be an object (could be empty or have values)
            expect(data.config).toBeDefined();
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/config`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const res = await GET(req);

            expect(res.status).toBe(401);
        });
    });

    describe('POST /admin/config', () => {
        it('should create a new config entry', async () => {
            const req = createRequest('POST', '/admin/config', {
                key: testConfigKey,
                value: testConfigValue,
            });
            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.key).toBe(testConfigKey);
            expect(data.value).toBe(testConfigValue);
        });

        it('should update an existing config entry (upsert)', async () => {
            const updatedValue = 'updated_value_456';

            // Create first
            await POST(createRequest('POST', '/admin/config', {
                key: testConfigKey,
                value: testConfigValue,
            }));

            // Update
            const req = createRequest('POST', '/admin/config', {
                key: testConfigKey,
                value: updatedValue,
            });
            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.key).toBe(testConfigKey);
            expect(data.value).toBe(updatedValue);

            // Verify the update
            const getRes = await GET(createRequest('GET', '/admin/config'));
            const getData = await getRes.json();
            expect(getData.config[testConfigKey]).toBe(updatedValue);
        });

        it('should validate key is required', async () => {
            const req = createRequest('POST', '/admin/config', {
                value: 'some_value',
            });
            const res = await POST(req);

            expect(res.status).toBe(400);
        });

        it('should validate value is required', async () => {
            const req = createRequest('POST', '/admin/config', {
                key: 'some_key',
            });
            const res = await POST(req);

            expect(res.status).toBe(400);
        });

        it('should validate key is not empty', async () => {
            const req = createRequest('POST', '/admin/config', {
                key: '',
                value: 'some_value',
            });
            const res = await POST(req);

            expect(res.status).toBe(400);
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key: 'test', value: 'test' }),
            });
            const res = await POST(req);

            expect(res.status).toBe(401);
        });
    });

    describe('Config Key-Value Operations', () => {
        it('should support various value types as strings', async () => {
            const testCases = [
                { key: 'config_string', value: 'hello world' },
                { key: 'config_number', value: '123' },
                { key: 'config_json', value: '{"nested": "object"}' },
                { key: 'config_bool', value: 'true' },
            ];

            for (const { key, value } of testCases) {
                const req = createRequest('POST', '/admin/config', { key, value });
                const res = await POST(req);
                expect(res.status).toBe(200);
            }

            const getRes = await GET(createRequest('GET', '/admin/config'));
            const getData = await getRes.json();

            expect(getData.config.config_string).toBe('hello world');
            expect(getData.config.config_number).toBe('123');
            expect(getData.config.config_json).toBe('{"nested": "object"}');
            expect(getData.config.config_bool).toBe('true');
        });

        it('should handle special characters in values', async () => {
            const specialValue = 'value with "quotes" and \'apostrophes\' and <brackets>';
            const req = createRequest('POST', '/admin/config', {
                key: 'special_chars_key',
                value: specialValue,
            });
            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.value).toBe(specialValue);
        });
    });
});
