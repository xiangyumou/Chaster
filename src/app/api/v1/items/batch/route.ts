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
    metadata: z.record(z.any()).optional(),
}).refine(
    (data) => data.durationMinutes !== undefined || data.decryptAt !== undefined,
    { message: 'Either durationMinutes or decryptAt must be provided' }
);

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

        const results = [];

        // Process in parallel (limited) or serial? Serial for simplicity and rate limiting implicitly
        // tlock encrypt involves network calls (drand), so parallel is better but maybe too heavy?
        // Let's do `Promise.all`

        // Note: This logic duplicates single creation logic. Ideally refactor.
        // For now, I'll inline.

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

        // Batch insert
        // Prisma createMany is not supported nicely with different data? 
        // Wait, createMany supports array of data. Yes!
        await prisma.item.createMany({
            data: createdItems,
        });

        return successResponse({
            count: createdItems.length,
            ids: createdItems.map(i => i.id)
        }, 201);

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return errorResponse('VALIDATION_ERROR', 'Invalid batch input', 400);
        }
        return errorResponse('INTERNAL_ERROR', 'Failed to batch create', 500);
    }
}
