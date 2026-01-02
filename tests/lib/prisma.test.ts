import { describe, it, expect } from 'vitest';
import { getPrismaClient } from '@/lib/prisma';

describe('Lib: Prisma', () => {
    describe('Database Connectivity', () => {
        it('should be able to connect and execute a simple query', async () => {
            const prisma = getPrismaClient();
            // A simple count query is sufficient to verify DB connection and schema alignment
            const count = await prisma.item.count();
            expect(typeof count).toBe('number');
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Singleton Pattern', () => {
        it('should return same instance on multiple calls', () => {
            const p1 = getPrismaClient();
            const p2 = getPrismaClient();
            expect(p1).toBe(p2);
        });
    });
});
