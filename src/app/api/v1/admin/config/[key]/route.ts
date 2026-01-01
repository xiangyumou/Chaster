import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { z } from 'zod';

const updateConfigSchema = z.object({
    value: z.string(),
});

/**
 * @swagger
 * /admin/config/{key}:
 *   get:
 *     summary: Get config by key
 *     description: Retrieve a specific configuration value.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Config value
 *       404:
 *         description: Config not found
 *       401:
 *         description: Unauthorized
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ key: string }> }
) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    const params = await props.params;

    try {
        const prisma = getPrismaClient();
        const config = await prisma.systemConfig.findUnique({
            where: { key: params.key },
        });

        if (!config) {
            return errorResponse('CONFIG_NOT_FOUND', 'Config key not found', 404);
        }

        return successResponse({
            key: config.key,
            value: config.value,
        });
    } catch (error) {
        console.error('Config get error:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to get config', 500);
    }
}

/**
 * @swagger
 * /admin/config/{key}:
 *   put:
 *     summary: Update config
 *     description: Update a specific configuration value.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Config updated
 *       401:
 *         description: Unauthorized
 */
export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ key: string }> }
) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    const params = await props.params;

    try {
        const body = await request.json();
        const validated = updateConfigSchema.parse(body);

        const prisma = getPrismaClient();

        await prisma.systemConfig.upsert({
            where: { key: params.key },
            update: { value: validated.value },
            create: { key: params.key, value: validated.value },
        });

        return successResponse({
            key: params.key,
            value: validated.value,
        });
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            const message = error.issues?.[0]?.message || 'Validation error';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }
        console.error('Config update error:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to update config', 500);
    }
}

/**
 * @swagger
 * /admin/config/{key}:
 *   delete:
 *     summary: Delete config
 *     description: Delete a configuration key.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Config deleted
 *       404:
 *         description: Config not found
 *       401:
 *         description: Unauthorized
 */
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ key: string }> }
) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    const params = await props.params;

    try {
        const prisma = getPrismaClient();

        const existing = await prisma.systemConfig.findUnique({
            where: { key: params.key },
        });

        if (!existing) {
            return errorResponse('CONFIG_NOT_FOUND', 'Config key not found', 404);
        }

        await prisma.systemConfig.delete({
            where: { key: params.key },
        });

        return successResponse({ success: true });
    } catch (error) {
        console.error('Config delete error:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to delete config', 500);
    }
}
