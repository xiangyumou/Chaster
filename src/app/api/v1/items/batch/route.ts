import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { encrypt } from '@/lib/tlock';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const createItemSchema = z.object({
    type: z.enum(['text', 'image']),
    content: z.string(),
    durationMinutes: z.number().int().positive().optional(),
    decryptAt: z.number().int().positive().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

const batchSchema = z.array(createItemSchema).max(50);

/**
 * @swagger
 * /items/batch:
 *   post:
 *     summary: Batch create items
 *     tags: [Items]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/ItemInput'
 *     responses:
 *       201:
 *         description: Items created
 */
export async function POST(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const body = await request.json();
        const items = batchSchema.parse(body);
        const prisma = getPrismaClient();

        // Validate each item logic
        for (const item of items) {
            if (item.durationMinutes === undefined && item.decryptAt === undefined) {
                return errorResponse('VALIDATION_ERROR', 'Either durationMinutes or decryptAt must be provided for all items', 400);
            }
        }

        const createdItems = await Promise.all(items.map(async (itemInput) => {
            let decryptAt: Date;
            if (itemInput.decryptAt) {
                decryptAt = new Date(itemInput.decryptAt);
            } else {
                decryptAt = new Date(Date.now() + itemInput.durationMinutes! * 60 * 1000);
            }

            let dataToEncrypt: Buffer;
            if (itemInput.type === 'text') {
                dataToEncrypt = Buffer.from(itemInput.content, 'utf-8');
            } else {
                dataToEncrypt = Buffer.from(itemInput.content, 'base64');
            }

            const { ciphertext, roundNumber } = await encrypt(dataToEncrypt, decryptAt);

            const id = uuidv4();

            return {
                id,
                type: itemInput.type,
                encryptedData: ciphertext,
                originalName: itemInput.type === 'image' ? 'image.png' : null,
                decryptAt: BigInt(decryptAt.getTime()),
                roundNumber: BigInt(roundNumber),
                createdAt: BigInt(Date.now()),
                layerCount: 1,
                metadata: itemInput.metadata ? JSON.stringify(itemInput.metadata) : null,
            };
        }));

        await prisma.item.createMany({
            data: createdItems,
        });

        return successResponse({
            count: createdItems.length,
            ids: createdItems.map(i => i.id)
        }, 201);

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            const message = (error as any).issues?.[0]?.message || (error as any).errors?.[0]?.message || 'Invalid batch input';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }
        return errorResponse('INTERNAL_ERROR', 'Failed to batch create', 500);
    }
}
