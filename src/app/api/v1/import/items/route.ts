import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

const importItemSchema = z.object({
    id: z.string().uuid().optional(),
    type: z.enum(['text', 'image']),
    encryptedData: z.string(),
    originalName: z.string().nullable().optional(),
    decryptAt: z.number().int().positive(),
    roundNumber: z.number().int().positive(),
    createdAt: z.number().int().positive().optional(),
    layerCount: z.number().int().positive().optional().default(1),
    metadata: z.record(z.string(), z.any()).nullable().optional(),
});

const importSchema = z.object({
    items: z.array(importItemSchema).min(1).max(1000),
    conflictStrategy: z.enum(['skip', 'overwrite', 'error']).optional().default('skip'),
});

/**
 * @swagger
 * /import/items:
 *   post:
 *     summary: Import items
 *     description: Import items from a backup. Supports conflict resolution strategies.
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [type, encryptedData, decryptAt, roundNumber]
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Original item ID (optional, will generate new if not provided)
 *                     type:
 *                       type: string
 *                       enum: [text, image]
 *                     encryptedData:
 *                       type: string
 *                     decryptAt:
 *                       type: integer
 *                     roundNumber:
 *                       type: integer
 *                     createdAt:
 *                       type: integer
 *                     layerCount:
 *                       type: integer
 *                     metadata:
 *                       type: object
 *               conflictStrategy:
 *                 type: string
 *                 enum: [skip, overwrite, error]
 *                 default: skip
 *                 description: How to handle ID conflicts
 *     responses:
 *       200:
 *         description: Import result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imported:
 *                   type: integer
 *                 skipped:
 *                   type: integer
 *                 overwritten:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Validation error or conflict
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const body = await request.json();
        const validated = importSchema.parse(body);

        const prisma = getPrismaClient();
        const now = Date.now();

        // Check for existing IDs
        const providedIds = validated.items
            .filter((item) => item.id)
            .map((item) => item.id!);

        const existingItems = providedIds.length > 0
            ? await prisma.item.findMany({
                where: { id: { in: providedIds } },
                select: { id: true },
            })
            : [];

        const existingIds = new Set(existingItems.map((item) => item.id));

        let imported = 0;
        let skipped = 0;
        let overwritten = 0;
        const errors: Array<{ id: string; error: string }> = [];
        const importedIds: string[] = [];

        for (const item of validated.items) {
            const itemId = item.id || uuidv4();
            const hasConflict = existingIds.has(itemId);

            if (hasConflict) {
                if (validated.conflictStrategy === 'error') {
                    errors.push({ id: itemId, error: 'ID already exists' });
                    continue;
                }
                if (validated.conflictStrategy === 'skip') {
                    skipped++;
                    continue;
                }
                // overwrite: delete existing first
                await prisma.item.delete({ where: { id: itemId } });
                overwritten++;
            }

            // Create the item
            try {
                await prisma.item.create({
                    data: {
                        id: itemId,
                        type: item.type,
                        encryptedData: item.encryptedData,
                        originalName: item.originalName || null,
                        decryptAt: BigInt(item.decryptAt),
                        roundNumber: BigInt(item.roundNumber),
                        createdAt: BigInt(item.createdAt || now),
                        layerCount: item.layerCount || 1,
                        metadata: item.metadata ? JSON.stringify(item.metadata) : null,
                    },
                });
                imported++;
                importedIds.push(itemId);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                errors.push({ id: itemId, error: message });
            }
        }

        return successResponse({
            imported,
            skipped,
            overwritten,
            total: validated.items.length,
            errors: errors.length > 0 ? errors : undefined,
            importedIds,
        });
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            const message = error.issues?.[0]?.message || 'Validation error';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }
        logger.error('Import error', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to import items', 500);
    }
}
