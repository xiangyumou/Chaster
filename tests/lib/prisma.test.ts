import { expect, test } from 'vitest';
import { getPrismaClient } from '@/lib/prisma';

test('Prisma Singleton', () => {
    const p1 = getPrismaClient();
    const p2 = getPrismaClient();
    expect(p1).toBe(p2);
});
