import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /admin/db/info:
 *   get:
 *     summary: Get database info
 *     description: Get information about the database including type and record counts.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Database information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                 itemCount:
 *                   type: integer
 *                 tokenCount:
 *                   type: integer
 *                 logCount:
 *                   type: integer
 *                 configCount:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const prisma = getPrismaClient();

        // Get record counts
        const [itemCount, logCount, configCount] = await Promise.all([
            prisma.item.count(),
            prisma.apiLog.count(),
            prisma.systemConfig.count(),
        ]);

        // Get database size (PostgreSQL specific)
        let databaseSize = 'Unknown';
        try {
            const result = await prisma.$queryRaw<[{ pg_size_pretty: string }]>`
                SELECT pg_size_pretty(pg_database_size(current_database())) as pg_size_pretty
            `;
            databaseSize = result[0]?.pg_size_pretty || 'Unknown';
        } catch {
            // Size query may fail in some environments
        }

        return successResponse({
            type: 'postgresql',
            databaseSize,
            itemCount,
            logCount,
            configCount,
        });
    } catch (error) {
        logger.error('DB info error', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to get database info', 500);
    }
}
