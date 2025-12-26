import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';

const createTokenSchema = z.object({
    name: z.string().min(1).max(50),
});

/**
 * @swagger
 * /admin/tokens:
 *   get:
 *     summary: List API tokens
 *     description: List all API tokens.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of tokens
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const prisma = getPrismaClient();
        const tokens = await prisma.apiToken.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return successResponse(tokens.map(t => ({
            ...t,
            createdAt: Number(t.createdAt),
            lastUsedAt: t.lastUsedAt ? Number(t.lastUsedAt) : null,
        })));
    } catch (error) {
        return errorResponse('INTERNAL_ERROR', 'Failed to fetch tokens', 500);
    }
}

/**
 * @swagger
 * /admin/tokens:
 *   post:
 *     summary: Create API token
 *     description: Generate a new API token.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Token created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 name: { type: string }
 */
export async function POST(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const body = await request.json();
        const { name } = createTokenSchema.parse(body);

        const token = `tok_${crypto.randomBytes(32).toString('hex')}`;
        const prisma = getPrismaClient();

        const created = await prisma.apiToken.create({
            data: {
                token,
                name,
                createdAt: BigInt(Date.now()),
                isActive: true,
            },
        });

        return successResponse({
            token: created.token,
            name: created.name,
            createdAt: Number(created.createdAt),
        }, 201);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return errorResponse('VALIDATION_ERROR', (error as any).errors[0]?.message || 'Invalid input', 400);
        }
        return errorResponse('INTERNAL_ERROR', 'Failed to create token', 500);
    }
}
