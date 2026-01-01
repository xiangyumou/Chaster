import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { decrypt } from '@/lib/decryption';
import { z } from 'zod';

const batchGetSchema = z.object({
    ids: z.array(z.string()).min(1).max(100),
    includeContent: z.boolean().optional().default(true),
});

/**
 * @swagger
 * /items/batch/get:
 *   post:
 *     summary: Batch get items
 *     description: Retrieve multiple items by IDs in a single request. Automatically decrypts unlocked items.
 *     tags: [Items]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of item IDs to retrieve (max 100)
 *               includeContent:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to include decrypted content for unlocked items
 *     responses:
 *       200:
 *         description: List of items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Item'
 *                 found:
 *                   type: integer
 *                 notFound:
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
        const validated = batchGetSchema.parse(body);

        const prisma = getPrismaClient();
        const now = Date.now();

        // Fetch all requested items
        const items = await prisma.item.findMany({
            where: { id: { in: validated.ids } },
        });

        const foundIds = new Set(items.map((item) => item.id));
        const notFoundIds = validated.ids.filter((id) => !foundIds.has(id));

        // Process items with optional decryption
        const processedItems = await Promise.all(
            items.map(async (item) => {
                const unlocked = Number(item.decryptAt) <= now;
                const metadata = item.metadata ? JSON.parse(item.metadata) : null;

                const result: Record<string, unknown> = {
                    id: item.id,
                    type: item.type,
                    originalName: item.originalName,
                    decryptAt: Number(item.decryptAt),
                    createdAt: Number(item.createdAt),
                    layerCount: item.layerCount,
                    metadata,
                    unlocked,
                };

                if (!unlocked) {
                    result.timeRemainingMs = Number(item.decryptAt) - now;
                    result.content = null;
                } else if (validated.includeContent) {
                    try {
                        const decryptedBuffer = await decrypt(
                            item.encryptedData,
                            Number(item.roundNumber)
                        );
                        if (item.type === 'text') {
                            result.content = decryptedBuffer.toString('utf-8');
                        } else {
                            result.content = decryptedBuffer.toString('base64');
                        }
                    } catch {
                        result.content = null;
                        result.decryptionError = true;
                    }
                }

                return result;
            })
        );

        return successResponse({
            items: processedItems,
            found: processedItems.length,
            notFound: notFoundIds,
        });
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            const message = error.issues?.[0]?.message || 'Validation error';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }
        console.error('Batch get error:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to batch get items', 500);
    }
}
