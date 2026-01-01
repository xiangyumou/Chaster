import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { z } from 'zod';

const deleteByIdsSchema = z.object({
    ids: z.array(z.string().uuid()).min(1).max(1000),
});

const deleteByFilterSchema = z.object({
    filter: z.object({
        status: z.enum(['locked', 'unlocked']).optional(),
        beforeDate: z.number().int().positive().optional(),
        afterDate: z.number().int().positive().optional(),
        type: z.enum(['text', 'image']).optional(),
    }),
});

const batchDeleteSchema = z.union([deleteByIdsSchema, deleteByFilterSchema]);

/**
 * @swagger
 * /items/batch/delete:
 *   post:
 *     summary: Batch delete items
 *     description: Delete multiple items by IDs or filter criteria.
 *     tags: [Items]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [ids]
 *                 properties:
 *                   ids:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of item IDs to delete
 *               - type: object
 *                 required: [filter]
 *                 properties:
 *                   filter:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                         enum: [locked, unlocked]
 *                       beforeDate:
 *                         type: integer
 *                         description: Delete items created before this timestamp (ms)
 *                       afterDate:
 *                         type: integer
 *                         description: Delete items created after this timestamp (ms)
 *                       type:
 *                         type: string
 *                         enum: [text, image]
 *     responses:
 *       200:
 *         description: Deletion result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deletedCount:
 *                   type: integer
 *                 deletedIds:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const body = await request.json();
        const validated = batchDeleteSchema.parse(body);

        const prisma = getPrismaClient();
        const now = Date.now();
        let deletedIds: string[] = [];

        if ('ids' in validated) {
            // Delete by specific IDs
            const existingItems = await prisma.item.findMany({
                where: { id: { in: validated.ids } },
                select: { id: true },
            });
            deletedIds = existingItems.map((item) => item.id);

            if (deletedIds.length > 0) {
                await prisma.item.deleteMany({
                    where: { id: { in: deletedIds } },
                });
            }
        } else {
            // Delete by filter
            const { filter } = validated;

            // First, fetch items matching filter
            const allItems = await prisma.item.findMany({
                select: { id: true, decryptAt: true, createdAt: true, type: true },
            });

            const matchingItems = allItems.filter((item) => {
                // Status filter
                if (filter.status) {
                    const unlocked = Number(item.decryptAt) <= now;
                    if (filter.status === 'unlocked' && !unlocked) return false;
                    if (filter.status === 'locked' && unlocked) return false;
                }

                // Date filters
                if (filter.beforeDate && Number(item.createdAt) >= filter.beforeDate) {
                    return false;
                }
                if (filter.afterDate && Number(item.createdAt) <= filter.afterDate) {
                    return false;
                }

                // Type filter
                if (filter.type && item.type !== filter.type) {
                    return false;
                }

                return true;
            });

            deletedIds = matchingItems.map((item) => item.id);

            if (deletedIds.length > 0) {
                await prisma.item.deleteMany({
                    where: { id: { in: deletedIds } },
                });
            }
        }

        return successResponse({
            deletedCount: deletedIds.length,
            deletedIds,
        });
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            const message = error.issues?.[0]?.message || 'Validation error';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }
        console.error('Batch delete error:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to batch delete items', 500);
    }
}
