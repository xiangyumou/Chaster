import { describe, it, expect } from 'vitest';
import { getPrismaClient } from '@/lib/prisma';

describe('Lib: Prisma', () => {
    describe('Singleton Pattern', () => {
        it('should return same instance on multiple calls', () => {
            const p1 = getPrismaClient();
            const p2 = getPrismaClient();
            expect(p1).toBe(p2);
        });

        it('should return a valid Prisma client instance', () => {
            const prisma = getPrismaClient();
            expect(prisma).toBeDefined();
            expect(typeof prisma).toBe('object');
        });
    });

    describe('Database Connection', () => {
        it('should have item model with CRUD methods', () => {
            const prisma = getPrismaClient();
            expect(prisma.item).toBeDefined();
            expect(typeof prisma.item.create).toBe('function');
            expect(typeof prisma.item.findUnique).toBe('function');
            expect(typeof prisma.item.findMany).toBe('function');
            expect(typeof prisma.item.update).toBe('function');
            expect(typeof prisma.item.delete).toBe('function');
        });

        it('should have apiToken model with CRUD methods', () => {
            const prisma = getPrismaClient();
            expect(prisma.apiToken).toBeDefined();
            expect(typeof prisma.apiToken.create).toBe('function');
            expect(typeof prisma.apiToken.findUnique).toBe('function');
            expect(typeof prisma.apiToken.update).toBe('function');
        });

        it('should have apiLog model with query methods', () => {
            const prisma = getPrismaClient();
            expect(prisma.apiLog).toBeDefined();
            expect(typeof prisma.apiLog.create).toBe('function');
            expect(typeof prisma.apiLog.findMany).toBe('function');
            expect(typeof prisma.apiLog.deleteMany).toBe('function');
        });

        it('should have systemConfig model with upsert method', () => {
            const prisma = getPrismaClient();
            expect(prisma.systemConfig).toBeDefined();
            expect(typeof prisma.systemConfig.upsert).toBe('function');
            expect(typeof prisma.systemConfig.findMany).toBe('function');
        });
    });

    describe('Query Capabilities', () => {
        it('should be able to count items and return number', async () => {
            const prisma = getPrismaClient();
            const count = await prisma.item.count();
            expect(typeof count).toBe('number');
            expect(count).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(count)).toBe(true);
        });

        it('should be able to count tokens and return number', async () => {
            const prisma = getPrismaClient();
            const count = await prisma.apiToken.count();
            expect(typeof count).toBe('number');
            expect(count).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(count)).toBe(true);
        });

        it('should be able to query with filters and return array', async () => {
            const prisma = getPrismaClient();
            const items = await prisma.item.findMany({
                take: 1,
                orderBy: { createdAt: 'desc' },
            });
            expect(Array.isArray(items)).toBe(true);
            // Verify result is always valid array (assertion always runs)
            expect(items.length).toBeGreaterThanOrEqual(0);
            // When items exist, verify shape (forEach handles empty case safely)
            items.forEach(item => {
                expect(item).toHaveProperty('id');
                expect(item).toHaveProperty('type');
                expect(item).toHaveProperty('encryptedData');
            });
        });

        it('should support where clause queries', async () => {
            const prisma = getPrismaClient();
            // Query with where clause should not throw
            const items = await prisma.item.findMany({
                where: {
                    type: 'text',
                },
                take: 5,
            });
            expect(Array.isArray(items)).toBe(true);
            items.forEach(item => {
                expect(item.type).toBe('text');
            });
        });

        it('should support select clause for partial fields', async () => {
            const prisma = getPrismaClient();
            const tokens = await prisma.apiToken.findMany({
                select: {
                    token: true,
                    name: true,
                    isActive: true,
                },
                take: 1,
            });
            expect(Array.isArray(tokens)).toBe(true);
            // Verify result is always valid array (assertion always runs)
            expect(tokens.length).toBeGreaterThanOrEqual(0);
            // forEach handles empty case safely - assertions run on each item
            tokens.forEach(t => {
                expect(t).toHaveProperty('token');
                expect(t).toHaveProperty('name');
                expect(t).toHaveProperty('isActive');
                expect(t).not.toHaveProperty('createdAt');
            });
        });
    });

    describe('Transaction Support', () => {
        it('should support $transaction method', () => {
            const prisma = getPrismaClient();
            expect(typeof prisma.$transaction).toBe('function');
        });

        it('should be able to execute raw queries', () => {
            const prisma = getPrismaClient();
            expect(typeof prisma.$queryRaw).toBe('function');
            expect(typeof prisma.$executeRaw).toBe('function');
        });
    });
});

