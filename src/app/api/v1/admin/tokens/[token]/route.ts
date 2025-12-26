import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';

/**
 * @swagger
 * /admin/tokens/{token}:
 *   delete:
 *     summary: Revoke API token
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Token deleted }
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const prisma = getPrismaClient();
        // prevent deleting the last token? maybe.

        await prisma.apiToken.delete({
            where: { token: params.token },
        });

        return successResponse({ success: true });
    } catch (error) {
        return errorResponse('INTERNAL_ERROR', 'Failed to delete token', 500);
    }
}

/**
 * @swagger
 * /admin/tokens/{token}:
 *   patch:
 *     summary: Update API token
 *     tags: [Admin]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Token updated }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const body = await request.json();
        const prisma = getPrismaClient();

        const updated = await prisma.apiToken.update({
            where: { token: params.token },
            data: {
                isActive: body.isActive,
            },
        });

        return successResponse({
            ...updated,
            createdAt: Number(updated.createdAt),
            lastUsedAt: updated.lastUsedAt ? Number(updated.lastUsedAt) : null,
        });
    } catch (error) {
        return errorResponse('INTERNAL_ERROR', 'Failed to update token', 500);
    }
}
