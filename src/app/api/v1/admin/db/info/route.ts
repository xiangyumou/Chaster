import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

/**
 * @swagger
 * /admin/db/info:
 *   get:
 *     summary: Get database info
 *     description: Get information about the database including size, type, and record counts.
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
 *                 path:
 *                   type: string
 *                 sizeBytes:
 *                   type: integer
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
        const projectRoot = process.cwd();
        const dbPath = path.join(projectRoot, 'data', 'chaster.db');

        // Get file size
        let sizeBytes = 0;
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            sizeBytes = stats.size;

            // Include WAL file size if exists
            const walPath = `${dbPath}-wal`;
            if (fs.existsSync(walPath)) {
                sizeBytes += fs.statSync(walPath).size;
            }
        }

        // Get record counts
        const [itemCount, tokenCount, logCount, configCount] = await Promise.all([
            prisma.item.count(),
            prisma.apiToken.count(),
            prisma.apiLog.count(),
            prisma.systemConfig.count(),
        ]);

        return successResponse({
            type: 'sqlite',
            path: dbPath,
            sizeBytes,
            sizeMB: Math.round(sizeBytes / 1024 / 1024 * 100) / 100,
            itemCount,
            tokenCount,
            logCount,
            configCount,
        });
    } catch (error) {
        console.error('DB info error:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to get database info', 500);
    }
}
