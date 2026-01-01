import { describe, it, expect, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as GET_DB_INFO } from '@/app/api/v1/admin/db/info/route';
import { POST as POST_BACKUP } from '@/app/api/v1/admin/db/backup/route';
import { POST as POST_VACUUM } from '@/app/api/v1/admin/db/vacuum/route';
import fs from 'fs';

const TEST_TOKEN = process.env.UNIT_TEST_TOKEN || process.env.TEST_TOKEN || 'tok_test';
const BASE_URL = 'http://localhost:3000/api/v1';

function createRequest(method: string, apiPath: string, body?: unknown) {
    const url = `${BASE_URL}${apiPath}`;
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

describe('Admin DB API (In-Process)', () => {
    describe('GET /admin/db/info', () => {
        it('should return database information', async () => {
            const req = createRequest('GET', '/admin/db/info');
            const res = await GET_DB_INFO(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.type).toBe('sqlite');
            expect(data.path).toBeDefined();
            expect(typeof data.sizeBytes).toBe('number');
            expect(typeof data.sizeMB).toBe('number');
        });

        it('should return record counts', async () => {
            const req = createRequest('GET', '/admin/db/info');
            const res = await GET_DB_INFO(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(typeof data.itemCount).toBe('number');
            expect(typeof data.tokenCount).toBe('number');
            expect(typeof data.logCount).toBe('number');
            expect(typeof data.configCount).toBe('number');
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/db/info`, {
                method: 'GET',
            });
            const res = await GET_DB_INFO(req);

            expect(res.status).toBe(401);
        });
    });

    describe('POST /admin/db/backup', () => {
        const createdBackups: string[] = [];

        afterAll(() => {
            // Clean up created backup files
            for (const backupPath of createdBackups) {
                try {
                    if (fs.existsSync(backupPath)) {
                        fs.unlinkSync(backupPath);
                    }
                    // Also remove WAL and SHM files if they exist
                    const walPath = `${backupPath}-wal`;
                    const shmPath = `${backupPath}-shm`;
                    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
                    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
                } catch {
                    // Ignore cleanup errors
                }
            }
        });

        it('should create a database backup or report DB not found', async () => {
            const req = createRequest('POST', '/admin/db/backup');
            const res = await POST_BACKUP(req);
            const data = await res.json();

            // In test environment, the production DB might not exist
            // Either backup succeeds (200) or DB not found (404)
            expect([200, 404]).toContain(res.status);

            if (res.status === 200) {
                expect(data.backupPath).toBeDefined();
                expect(data.backupName).toContain('chaster_backup_');
                expect(data.backupName).toMatch(/\.db$/);
                expect(typeof data.size).toBe('number');
                expect(data.size).toBeGreaterThan(0);
                expect(typeof data.createdAt).toBe('number');

                // Track for cleanup
                if (data.backupPath) {
                    createdBackups.push(data.backupPath);
                }
            } else {
                // 404 means DB not found - valid response in test environment
                expect(data.error.code).toBe('DB_NOT_FOUND');
            }
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/db/backup`, {
                method: 'POST',
            });
            const res = await POST_BACKUP(req);

            expect(res.status).toBe(401);
        });
    });

    describe('POST /admin/db/vacuum', () => {
        it('should run vacuum or report DB not found', async () => {
            const req = createRequest('POST', '/admin/db/vacuum');
            const res = await POST_VACUUM(req);
            const data = await res.json();

            // In test environment, the production DB might not exist
            expect([200, 404]).toContain(res.status);

            if (res.status === 200) {
                expect(data.success).toBe(true);
                expect(typeof data.sizeBefore).toBe('number');
                expect(typeof data.sizeAfter).toBe('number');
                expect(typeof data.savedBytes).toBe('number');
                expect(typeof data.savedMB).toBe('number');
                // Size after should be less than or equal to size before
                expect(data.sizeAfter).toBeLessThanOrEqual(data.sizeBefore);
                // savedBytes should equal the difference
                expect(data.savedBytes).toBe(data.sizeBefore - data.sizeAfter);
            } else {
                // 404 means DB not found - valid in test environment
                expect(data.error.code).toBe('DB_NOT_FOUND');
            }
        });

        it('should fail without authentication', async () => {
            const req = new NextRequest(`${BASE_URL}/admin/db/vacuum`, {
                method: 'POST',
            });
            const res = await POST_VACUUM(req);

            expect(res.status).toBe(401);
        });
    });

    describe('Database Health Check', () => {
        it('should report consistent data between info calls', async () => {
            const req1 = createRequest('GET', '/admin/db/info');
            const res1 = await GET_DB_INFO(req1);
            const data1 = await res1.json();

            const req2 = createRequest('GET', '/admin/db/info');
            const res2 = await GET_DB_INFO(req2);
            const data2 = await res2.json();

            // Type and path should be stable
            expect(data1.type).toBe(data2.type);
            expect(data1.path).toBe(data2.path);

            // Counts might change slightly but should be valid numbers
            expect(typeof data2.itemCount).toBe('number');
            expect(typeof data2.tokenCount).toBe('number');
        });
    });
});
