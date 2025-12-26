import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, errorResponse, successResponse } from '@/lib/auth';
import { encrypt } from '@/lib/tlock';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Validation schemas
const createItemSchema = z.object({
    type: z.enum(['text', 'image']),
    content: z.string().min(1, "Content cannot be empty"),
    durationMinutes: z.number().int().positive("Duration must be positive").optional(),
    decryptAt: z.number().int().positive("Decrypt time must be positive").optional(),
    metadata: z.record(z.string(), z.any()).optional(),
}).superRefine((data, ctx) => {
    if (data.durationMinutes === undefined && data.decryptAt === undefined) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Either durationMinutes or decryptAt must be provided',
            path: ['durationMinutes']
        });
    }
});

const querySchema = z.object({
    status: z.enum(['locked', 'unlocked', 'all']).optional().default('all'),
    type: z.enum(['text', 'image']).optional(),
    limit: z.number().int().positive().max(1000).optional().default(50),
    offset: z.number().int().nonnegative().optional().default(0),
    sort: z.enum(['created_asc', 'created_desc', 'decrypt_asc', 'decrypt_desc']).optional().default('created_desc'),
});

/**
 * GET /api/v1/items - List all items with filtering and pagination
 */
/**
 * @swagger
 * /items:
 *   get:
 *     summary: List items
 *     description: Retrieve a paginated list of encrypted items.
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, locked, unlocked]
 *           default: all
 *         description: Filter by lock status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [text, image]
 *         description: Filter by content type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Max items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
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
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
    // Authenticate
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const { searchParams } = new URL(request.url);

        // Parse query parameters
        const query = querySchema.parse({
            status: searchParams.get('status') || 'all',
            type: searchParams.get('type') || undefined,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
            offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
            sort: searchParams.get('sort') || 'created_desc',
        });

        const prisma = getPrismaClient();
        const now = Date.now();

        // Build where clause
        const where: any = {};
        if (query.type) {
            where.type = query.type;
        }

        // For status filtering, we need to fetch all and filter in memory
        // (SQLite doesn't support computed columns in WHERE)
        const allItems = await prisma.item.findMany({
            where,
            orderBy: query.sort.startsWith('created')
                ? { createdAt: query.sort === 'created_asc' ? 'asc' : 'desc' }
                : { decryptAt: query.sort === 'decrypt_asc' ? 'asc' : 'desc' },
        });

        // Filter by status
        let filteredItems = allItems;
        if (query.status !== 'all') {
            filteredItems = allItems.filter((item: any) => {
                const unlocked = Number(item.decryptAt) <= now;
                return query.status === 'unlocked' ? unlocked : !unlocked;
            });
        }

        // Paginate
        const total = filteredItems.length;
        const paginatedItems = filteredItems.slice(query.offset, query.offset + query.limit);

        // Format response
        const items = paginatedItems.map((item: any) => {
            const unlocked = Number(item.decryptAt) <= now;
            const metadata = item.metadata ? JSON.parse(item.metadata) : null;

            return {
                id: item.id,
                type: item.type,
                originalName: item.originalName,
                decryptAt: Number(item.decryptAt),
                createdAt: Number(item.createdAt),
                layerCount: item.layerCount,
                unlocked,
                metadata,
                timeRemainingMs: unlocked ? undefined : Number(item.decryptAt) - now,
            };
        });

        return successResponse({
            items,
            total,
            limit: query.limit,
            offset: query.offset,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            const message = (error as any).issues?.[0]?.message || (error as any).errors?.[0]?.message || 'Validation error';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }

        console.error('Error fetching items:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to fetch items', 500);
    }
}

/**
 * POST /api/v1/items - Create new encrypted item
 */
export async function POST(request: NextRequest) {
    // Authenticate
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const body = await request.json();
        const validated = createItemSchema.parse(body);

        // Calculate decrypt time
        let decryptAt: Date;
        if (validated.decryptAt) {
            decryptAt = new Date(validated.decryptAt);
            if (isNaN(decryptAt.getTime()) || decryptAt.getTime() <= Date.now()) {
                return errorResponse('INVALID_TIME', 'decryptAt must be in the future', 400);
            }
        } else {
            decryptAt = new Date(Date.now() + validated.durationMinutes! * 60 * 1000);
        }

        // Prepare content for encryption
        let dataToEncrypt: Buffer;
        if (validated.type === 'text') {
            dataToEncrypt = Buffer.from(validated.content, 'utf-8');
        } else {
            // For images, content should be base64 encoded
            try {
                dataToEncrypt = Buffer.from(validated.content, 'base64');
            } catch {
                return errorResponse('INVALID_CONTENT', 'Image content must be base64 encoded', 400);
            }
        }

        // Encrypt with tlock
        const { ciphertext, roundNumber } = await encrypt(dataToEncrypt, decryptAt);

        // Save to database
        const prisma = getPrismaClient();
        const item = await prisma.item.create({
            data: {
                id: uuidv4(),
                type: validated.type,
                encryptedData: ciphertext,
                originalName: validated.type === 'image' ? 'image.png' : null,
                decryptAt: BigInt(decryptAt.getTime()),
                roundNumber: BigInt(roundNumber),
                createdAt: BigInt(Date.now()),
                layerCount: 1,
                metadata: validated.metadata ? JSON.stringify(validated.metadata) : null,
            },
        });

        const metadata = item.metadata ? JSON.parse(item.metadata) : null;

        return successResponse(
            {
                id: item.id,
                type: item.type,
                originalName: item.originalName,
                decryptAt: Number(item.decryptAt),
                createdAt: Number(item.createdAt),
                layerCount: item.layerCount,
                metadata,
            },
            201
        );
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            const message = (error as any).issues?.[0]?.message || (error as any).errors?.[0]?.message || 'Validation error';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }

        console.log('Caught Error:', error);
        console.log('Is ZodError?', error instanceof z.ZodError);
        console.error('Error creating item:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to create item', 500);
    }
}
