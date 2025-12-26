import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, errorResponse, successResponse } from '@/lib/auth';
import { decrypt } from '@/lib/decryption';

/**
 * @swagger
 * /items/{id}:
 *   get:
 *     summary: Get item
 *     description: Get item details. If the lock time has passed, includes the decrypted content.
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Item'
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    // Authenticate
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    const params = await props.params;

    try {
        const prisma = getPrismaClient();
        const item = await prisma.item.findUnique({
            where: { id: params.id },
        });

        if (!item) {
            return errorResponse('ITEM_NOT_FOUND', 'Item not found', 404);
        }

        const now = Date.now();
        const unlocked = Number(item.decryptAt) <= now;
        const metadata = item.metadata ? JSON.parse(item.metadata) : null;

        // Build base response
        const response: any = {
            id: item.id,
            type: item.type,
            originalName: item.originalName,
            decryptAt: Number(item.decryptAt),
            createdAt: Number(item.createdAt),
            layerCount: item.layerCount,
            unlocked,
            metadata,
        };

        // If unlocked, decrypt and include content
        if (unlocked) {
            try {
                const decryptedBuffer = await decrypt(item.encryptedData, Number(item.roundNumber));

                if (item.type === 'text') {
                    response.content = decryptedBuffer.toString('utf-8');
                } else {
                    // Return base64 for images
                    response.content = decryptedBuffer.toString('base64');
                }
            } catch (error) {
                console.error('Decryption failed:', error);
                return errorResponse('DECRYPTION_FAILED', 'Failed to decrypt content', 500);
            }
        } else {
            response.timeRemainingMs = Number(item.decryptAt) - now;
            response.content = null;
        }

        return successResponse(response);
    } catch (error) {
        console.error('Error fetching item:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to fetch item', 500);
    }
}

/**
 * @swagger
 * /items/{id}:
 *   delete:
 *     summary: Delete item
 *     description: Permanently delete an item.
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item deleted
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    // Authenticate
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    const params = await props.params;

    try {
        const prisma = getPrismaClient();

        // Check if item exists
        const item = await prisma.item.findUnique({
            where: { id: params.id },
        });

        if (!item) {
            return errorResponse('ITEM_NOT_FOUND', 'Item not found', 404);
        }

        // Delete item
        await prisma.item.delete({
            where: { id: params.id },
        });

        return successResponse({ success: true });
    } catch (error) {
        console.error('Error deleting item:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to delete item', 500);
    }
}
