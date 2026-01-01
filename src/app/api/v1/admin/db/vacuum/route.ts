import { NextRequest } from 'next/server';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { getPrismaClient } from '@/lib/prisma';

/**
 * @swagger
 * /admin/db/vacuum:
 *   post:
 *     summary: Vacuum database
 *     description: Run PostgreSQL VACUUM ANALYZE to optimize the database.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Vacuum completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Vacuum failed
 */
export async function POST(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const prisma = getPrismaClient();

        // Run VACUUM ANALYZE on PostgreSQL
        await prisma.$executeRawUnsafe('VACUUM ANALYZE');

        return successResponse({
            success: true,
            message: 'VACUUM ANALYZE completed successfully',
        });
    } catch (error: unknown) {
        console.error('Vacuum error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return errorResponse('VACUUM_FAILED', `Vacuum failed: ${message}`, 500);
    }
}
