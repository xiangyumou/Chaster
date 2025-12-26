import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, errorResponse, successResponse } from '@/lib/auth';
import { decrypt } from '@/lib/decryption';
import { encrypt } from '@/lib/tlock';
import { z } from 'zod';

const extendSchema = z.object({
    minutes: z.number().int().positive(),
});

/**
 * POST /api/v1/items/:id/extend - Extend lock duration (re-encrypt)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // Authenticate
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const body = await request.json();
        const { minutes } = extendSchema.parse(body);

        const prisma = getPrismaClient();
        const item = await prisma.item.findUnique({
            where: { id: params.id },
        });

        if (!item) {
            return errorResponse('ITEM_NOT_FOUND', 'Item not found', 404);
        }

        const now = Date.now();
        const unlocked = Number(item.decryptAt) <= now;

        // Get content to re-encrypt
        let contentToEncrypt: Buffer;

        if (unlocked) {
            // Decrypt first
            try {
                contentToEncrypt = await decrypt(item.encryptedData, Number(item.roundNumber));
            } catch (error) {
                console.error('Decryption failed during extend:', error);
                return errorResponse('DECRYPTION_FAILED', 'Failed to decrypt content for re-encryption', 500);
            }
        } else {
            // Use existing ciphertext as-is (nested encryption)
            contentToEncrypt = Buffer.from(item.encryptedData, 'utf-8');
        }

        // Calculate new decrypt time
        const newDecryptAt = new Date(now + minutes * 60 * 1000);

        // Re-encrypt
        const { ciphertext, roundNumber } = await encrypt(contentToEncrypt, newDecryptAt);

        // Update database with optimistic locking
        const updated = await prisma.item.updateMany({
            where: {
                id: params.id,
                layerCount: item.layerCount, // Ensure no concurrent modification
            },
            data: {
                encryptedData: ciphertext,
                decryptAt: BigInt(newDecryptAt.getTime()),
                roundNumber: BigInt(roundNumber),
                layerCount: item.layerCount + 1,
            },
        });

        if (updated.count === 0) {
            return errorResponse('CONFLICT', 'Item was modified during operation, please retry', 409);
        }

        return successResponse({
            success: true,
            decryptAt: newDecryptAt.getTime(),
            layerCount: item.layerCount + 1,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return errorResponse('VALIDATION_ERROR', error.errors[0].message, 400);
        }

        console.error('Error extending item:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to extend item', 500);
    }
}
