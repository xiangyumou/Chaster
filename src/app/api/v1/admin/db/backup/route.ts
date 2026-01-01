import { NextRequest } from 'next/server';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';

/**
 * @swagger
 * /admin/db/backup:
 *   post:
 *     summary: Create database backup
 *     description: |
 *       Trigger a database backup. For PostgreSQL, use pg_dump externally or 
 *       configure automated backups via your hosting provider.
 *       This endpoint returns guidance on backup options.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Backup guidance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 options:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    // PostgreSQL backups should be handled externally via pg_dump or hosting provider
    return successResponse({
        message: 'PostgreSQL backup should be configured externally',
        options: [
            'Use pg_dump for manual backups: pg_dump -U $POSTGRES_USER -d $POSTGRES_DB > backup.sql',
            'Configure automated backups via your hosting provider (e.g., Railway, Supabase, AWS RDS)',
            'Use Docker volume backups for the postgres_data volume',
        ],
        timestamp: Date.now(),
    });
}
