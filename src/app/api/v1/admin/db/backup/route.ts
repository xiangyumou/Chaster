import { NextRequest } from 'next/server';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * @swagger
 * /admin/db/backup:
 *   post:
 *     summary: Create database backup
 *     description: Trigger a database backup. Returns the backup file path and size.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Backup created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 backupPath:
 *                   type: string
 *                 size:
 *                   type: integer
 *                 createdAt:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Backup failed
 */
export async function POST(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const projectRoot = process.cwd();
        const backupsDir = path.join(projectRoot, 'backups');

        // Ensure backups directory exists
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }

        // Generate backup filename with timestamp
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupName = `chaster_backup_${timestamp}`;
        const dbPath = path.join(projectRoot, 'data', 'chaster.db');
        const backupPath = path.join(backupsDir, `${backupName}.db`);

        // Check if database exists
        if (!fs.existsSync(dbPath)) {
            return errorResponse('DB_NOT_FOUND', 'Database file not found', 404);
        }

        // Copy database file (SQLite can be safely copied when using WAL mode)
        fs.copyFileSync(dbPath, backupPath);

        // Also copy WAL and SHM files if they exist
        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;
        if (fs.existsSync(walPath)) {
            fs.copyFileSync(walPath, `${backupPath}-wal`);
        }
        if (fs.existsSync(shmPath)) {
            fs.copyFileSync(shmPath, `${backupPath}-shm`);
        }

        // Get backup size
        const stats = fs.statSync(backupPath);

        return successResponse({
            backupPath: backupPath,
            backupName: `${backupName}.db`,
            size: stats.size,
            createdAt: Date.now(),
        });
    } catch (error: unknown) {
        console.error('Backup error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return errorResponse('BACKUP_FAILED', `Backup failed: ${message}`, 500);
    }
}
