import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { decrypt } from '@/lib/decryption';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import pLimit from 'p-limit';

const batchGetSchema = z.object({
    ids: z.array(z.string()).min(1).max(100),
    includeContent: z.boolean().optional().default(true),
});

// Limit concurrent decryptions to prevent CPU saturation and drand API rate limiting
const DECRYPTION_CONCURRENCY_LIMIT = 10;

/**
 * Core batch get logic shared between GET and POST handlers
 */
async function handleBatchGet(ids: string[], includeContent: boolean) {
    const prisma = getPrismaClient();
    const now = Date.now();

    // Fetch all requested items
    const items = await prisma.item.findMany({
        where: { id: { in: ids } },
    });

    const foundIds = new Set(items.map((item) => item.id));
    const notFoundIds = ids.filter((id) => !foundIds.has(id));

    // Create concurrency limiter for decryption operations
    const limit = pLimit(DECRYPTION_CONCURRENCY_LIMIT);

    // Process items with optional decryption (with concurrency limit)
    const processedItems = await Promise.all(
        items.map((item) => limit(async () => {
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
            } else if (includeContent) {
                try {
                    const decryptedBuffer = await decrypt(
                        item.encryptedData
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
        }))
    );

    return successResponse({
        items: processedItems,
        found: processedItems.length,
        notFound: notFoundIds,
    });
}

/**
 * @swagger
 * /items/batch/get:
 *   get:
 *     summary: Batch get items
 *     description: Retrieve multiple items by IDs in a single request. Automatically decrypts unlocked items.
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: ids
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated list of item IDs to retrieve (max 100)
 *       - in: query
 *         name: includeContent
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to include decrypted content for unlocked items
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
export async function GET(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const { searchParams } = new URL(request.url);
        const idsParam = searchParams.get('ids');
        const includeContentParam = searchParams.get('includeContent');

        if (!idsParam) {
            return errorResponse('VALIDATION_ERROR', 'ids parameter is required', 400);
        }

        const ids = idsParam.split(',').map(id => id.trim()).filter(id => id.length > 0);

        if (ids.length === 0) {
            return errorResponse('VALIDATION_ERROR', 'At least one ID is required', 400);
        }

        if (ids.length > 100) {
            return errorResponse('VALIDATION_ERROR', 'Maximum 100 IDs allowed', 400);
        }

        const includeContent = includeContentParam !== 'false';

        return handleBatchGet(ids, includeContent);
    } catch (error: unknown) {
        logger.error('Batch get error', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to batch get items', 500);
    }
}

/**
 * @swagger
 * /items/batch/get:
 *   post:
 *     summary: Batch get items (legacy)
 *     description: |
 *       Retrieve multiple items by IDs in a single request.
 *       **Deprecated**: Prefer GET /items/batch/get?ids=id1,id2 for RESTful semantics.
 *     tags: [Items]
 *     deprecated: true
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

        return handleBatchGet(validated.ids, validated.includeContent);
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            const message = error.issues?.[0]?.message || 'Validation error';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }
        logger.error('Batch get error', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to batch get items', 500);
    }
}
