import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, errorResponse, successResponse } from '@/lib/auth';
import { decrypt } from '@/lib/decryption';

/**
 * GET /api/v1/items/:id - Get single item (auto-decrypt if time reached)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // Authenticate
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

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
        }

        return successResponse(response);
    } catch (error) {
        console.error('Error fetching item:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to fetch item', 500);
    }
}

/**
 * DELETE /api/v1/items/:id - Delete item
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // Authenticate
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

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
