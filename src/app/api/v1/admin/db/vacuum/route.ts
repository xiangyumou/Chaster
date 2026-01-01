import { NextRequest } from 'next/server';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * @swagger
 * /admin/db/vacuum:
 *   post:
 *     summary: Vacuum database
 *     description: Run SQLite VACUUM command to optimize and compact the database file.
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
 *                 sizeBefore:
 *                   type: integer
 *                 sizeAfter:
 *                   type: integer
 *                 savedBytes:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Vacuum failed
 */
export async function POST(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const projectRoot = process.cwd();
        const dbPath = path.join(projectRoot, 'data', 'chaster.db');

        if (!fs.existsSync(dbPath)) {
            return errorResponse('DB_NOT_FOUND', 'Database file not found', 404);
        }

        // Get size before
        const sizeBefore = fs.statSync(dbPath).size;

        // Open a separate connection for vacuum
        const db = new Database(dbPath);

        try {
            // Run VACUUM
            db.exec('VACUUM');
        } finally {
            db.close();
        }

        // Get size after
        const sizeAfter = fs.statSync(dbPath).size;

        return successResponse({
            success: true,
            sizeBefore,
            sizeAfter,
            savedBytes: sizeBefore - sizeAfter,
            savedMB: Math.round((sizeBefore - sizeAfter) / 1024 / 1024 * 100) / 100,
        });
    } catch (error: unknown) {
        console.error('Vacuum error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return errorResponse('VACUUM_FAILED', `Vacuum failed: ${message}`, 500);
    }
}
