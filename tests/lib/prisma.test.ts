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
        it('should have item model available', () => {
            const prisma = getPrismaClient();
            expect(prisma.item).toBeDefined();
        });

        it('should have apiToken model available', () => {
            const prisma = getPrismaClient();
            expect(prisma.apiToken).toBeDefined();
        });

        it('should have apiLog model available', () => {
            const prisma = getPrismaClient();
            expect(prisma.apiLog).toBeDefined();
        });

        it('should have systemConfig model available', () => {
            const prisma = getPrismaClient();
            expect(prisma.systemConfig).toBeDefined();
        });
    });

    describe('Query Capabilities', () => {
        it('should be able to count items', async () => {
            const prisma = getPrismaClient();
            const count = await prisma.item.count();
            expect(typeof count).toBe('number');
            expect(count).toBeGreaterThanOrEqual(0);
        });

        it('should be able to count tokens', async () => {
            const prisma = getPrismaClient();
            const count = await prisma.apiToken.count();
            expect(typeof count).toBe('number');
            expect(count).toBeGreaterThanOrEqual(0);
        });

        it('should be able to query with filters', async () => {
            const prisma = getPrismaClient();
            const items = await prisma.item.findMany({
                take: 1,
                orderBy: { createdAt: 'desc' },
            });
            expect(Array.isArray(items)).toBe(true);
        });
    });
});
