import { describe, it, expect, afterAll } from 'vitest';
import { getPrismaClient } from '@/lib/prisma';

describe('Lib: Prisma', () => {
    const testItemIds: string[] = [];

    afterAll(async () => {
        // Clean up test items
        const prisma = getPrismaClient();
        if (testItemIds.length > 0) {
            await prisma.item.deleteMany({
                where: { id: { in: testItemIds } },
            });
        }
    });

    describe('Database Connectivity', () => {
        it('should be able to connect and execute a simple query', async () => {
            const prisma = getPrismaClient();
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

    describe('CRUD Operations', () => {
        it('should create, read, and delete an item', async () => {
            const prisma = getPrismaClient();

            // Create
            const created = await prisma.item.create({
                data: {
                    type: 'text',
                    encryptedData: 'test_crud_encrypted_with_special_chars_+=/',
                    decryptAt: BigInt(Date.now() + 60000),
                    roundNumber: 12345,
                    layerCount: 1,
                    createdAt: BigInt(Date.now()),
                },
            });
            testItemIds.push(created.id);

            expect(created.id).toBeDefined();
            expect(created.type).toBe('text');
            expect(created.encryptedData).toBe('test_crud_encrypted_with_special_chars_+=/');
            expect(created.layerCount).toBe(1);

            // Read
            const found = await prisma.item.findUnique({
                where: { id: created.id },
            });
            expect(found).not.toBeNull();
            expect(found!.id).toBe(created.id);
            expect(found!.type).toBe('text');

            // Update
            const updated = await prisma.item.update({
                where: { id: created.id },
                data: { layerCount: 2 },
            });
            expect(updated.layerCount).toBe(2);

            // Delete
            await prisma.item.delete({ where: { id: created.id } });
            testItemIds.pop(); // Remove from cleanup list
            const deleted = await prisma.item.findUnique({
                where: { id: created.id },
            });
            expect(deleted).toBeNull();
        });

        it('should handle transaction correctly', async () => {
            const prisma = getPrismaClient();

            const result = await prisma.$transaction(async (tx) => {
                const item = await tx.item.create({
                    data: {
                        type: 'image',
                        encryptedData: 'test_transaction',
                        decryptAt: BigInt(Date.now() + 60000),
                        roundNumber: 54321,
                        layerCount: 1,
                        createdAt: BigInt(Date.now()),
                    },
                });
                testItemIds.push(item.id);
                return item;
            });

            expect(result.id).toBeDefined();
            expect(result.type).toBe('image');
        });

        it('should return null when finding non-existent item', async () => {
            const prisma = getPrismaClient();
            const found = await prisma.item.findUnique({
                where: { id: 'non-existent-id-12345' },
            });
            expect(found).toBeNull();
        });

        it('should throw error when deleting non-existent item', async () => {
            const prisma = getPrismaClient();
            await expect(
                prisma.item.delete({
                    where: { id: 'non-existent-id-12345' },
                })
            ).rejects.toThrow();
        });
    });
});
