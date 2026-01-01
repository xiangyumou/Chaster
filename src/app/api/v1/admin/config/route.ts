import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { z } from 'zod';

const createConfigSchema = z.object({
    key: z.string().min(1).max(100),
    value: z.string(),
});

/**
 * @swagger
 * /admin/config:
 *   get:
 *     summary: Get all system config
 *     description: Retrieve all system configuration key-value pairs.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Configuration object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 config:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const prisma = getPrismaClient();
        const configs = await prisma.systemConfig.findMany();

        // Convert to key-value object
        const configObj: Record<string, string> = {};
        for (const config of configs) {
            configObj[config.key] = config.value;
        }

        return successResponse({ config: configObj });
    } catch (error) {
        console.error('Config get error:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to get config', 500);
    }
}

/**
 * @swagger
 * /admin/config:
 *   post:
 *     summary: Create or update config
 *     description: Set a system configuration value.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, value]
 *             properties:
 *               key:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Config saved
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const body = await request.json();
        const validated = createConfigSchema.parse(body);

        const prisma = getPrismaClient();

        await prisma.systemConfig.upsert({
            where: { key: validated.key },
            update: { value: validated.value },
            create: { key: validated.key, value: validated.value },
        });

        return successResponse({
            key: validated.key,
            value: validated.value,
        });
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            const message = error.issues?.[0]?.message || 'Validation error';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }
        console.error('Config set error:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to set config', 500);
    }
}
