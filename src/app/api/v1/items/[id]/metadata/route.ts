import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const updateMetadataSchema = z.object({
    metadata: z.record(z.string(), z.any()),
    merge: z.boolean().optional().default(false),
});

/**
 * @swagger
 * /items/{id}/metadata:
 *   patch:
 *     summary: Update item metadata
 *     description: Update the metadata field of an item. Supports merge or replace modes.
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [metadata]
 *             properties:
 *               metadata:
 *                 type: object
 *                 description: New metadata object
 *               merge:
 *                 type: boolean
 *                 default: false
 *                 description: If true, merge with existing metadata. If false, replace entirely.
 *     responses:
 *       200:
 *         description: Updated item
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    const params = await props.params;

    try {
        const body = await request.json();
        const validated = updateMetadataSchema.parse(body);

        const prisma = getPrismaClient();

        // Check if item exists
        const item = await prisma.item.findUnique({
            where: { id: params.id },
        });

        if (!item) {
            return errorResponse('ITEM_NOT_FOUND', 'Item not found', 404);
        }

        // Prepare new metadata
        let newMetadata: Record<string, unknown>;
        if (validated.merge && item.metadata) {
            const existingMetadata = JSON.parse(item.metadata);
            newMetadata = { ...existingMetadata, ...validated.metadata };
        } else {
            newMetadata = validated.metadata;
        }

        // Update item
        const updatedItem = await prisma.item.update({
            where: { id: params.id },
            data: {
                metadata: JSON.stringify(newMetadata),
            },
        });

        const now = Date.now();
        const unlocked = Number(updatedItem.decryptAt) <= now;

        return successResponse({
            id: updatedItem.id,
            type: updatedItem.type,
            originalName: updatedItem.originalName,
            decryptAt: Number(updatedItem.decryptAt),
            createdAt: Number(updatedItem.createdAt),
            layerCount: updatedItem.layerCount,
            metadata: newMetadata,
            unlocked,
            timeRemainingMs: unlocked ? undefined : Number(updatedItem.decryptAt) - now,
        });
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            const message = error.issues?.[0]?.message || 'Validation error';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }
        logger.error('Update metadata error', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to update metadata', 500);
    }
}
