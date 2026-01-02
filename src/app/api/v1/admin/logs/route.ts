import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const querySchema = z.object({
    token: z.string().optional(),
    endpoint: z.string().optional(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
    statusCode: z.number().int().optional(),
    startTime: z.number().int().positive().optional(),
    endTime: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(1000).optional().default(100),
    offset: z.number().int().nonnegative().optional().default(0),
});

const deleteSchema = z.object({
    beforeTimestamp: z.number().int().positive().optional(),
    token: z.string().optional(),
});

/**
 * @swagger
 * /admin/logs:
 *   get:
 *     summary: Query API logs
 *     description: Query API call logs with various filters.
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Filter by token
 *       - in: query
 *         name: endpoint
 *         schema:
 *           type: string
 *         description: Filter by endpoint (partial match)
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [GET, POST, PUT, PATCH, DELETE]
 *       - in: query
 *         name: statusCode
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: integer
 *         description: Logs after this timestamp
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: integer
 *         description: Logs before this timestamp
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of logs
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const { searchParams } = new URL(request.url);
        const query = querySchema.parse({
            token: searchParams.get('token') || undefined,
            endpoint: searchParams.get('endpoint') || undefined,
            method: searchParams.get('method') || undefined,
            statusCode: searchParams.get('statusCode')
                ? parseInt(searchParams.get('statusCode')!)
                : undefined,
            startTime: searchParams.get('startTime')
                ? parseInt(searchParams.get('startTime')!)
                : undefined,
            endTime: searchParams.get('endTime')
                ? parseInt(searchParams.get('endTime')!)
                : undefined,
            limit: searchParams.get('limit')
                ? parseInt(searchParams.get('limit')!)
                : 100,
            offset: searchParams.get('offset')
                ? parseInt(searchParams.get('offset')!)
                : 0,
        });

        const prisma = getPrismaClient();

        // Build where clause
        const where: Record<string, unknown> = {};
        if (query.token) {
            where.token = query.token;
        }
        if (query.method) {
            where.method = query.method;
        }
        if (query.statusCode) {
            where.statusCode = query.statusCode;
        }

        // Fetch logs
        const allLogs = await prisma.apiLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
        });

        // Apply in-memory filters for more complex conditions
        let filteredLogs = allLogs;

        if (query.endpoint) {
            filteredLogs = filteredLogs.filter((log) =>
                log.endpoint.includes(query.endpoint!)
            );
        }
        if (query.startTime) {
            filteredLogs = filteredLogs.filter(
                (log) => Number(log.timestamp) >= query.startTime!
            );
        }
        if (query.endTime) {
            filteredLogs = filteredLogs.filter(
                (log) => Number(log.timestamp) <= query.endTime!
            );
        }

        // Paginate
        const total = filteredLogs.length;
        const paginatedLogs = filteredLogs.slice(
            query.offset,
            query.offset + query.limit
        );

        // Format response
        const logs = paginatedLogs.map((log) => ({
            id: log.id,
            token: log.token,
            endpoint: log.endpoint,
            method: log.method,
            statusCode: log.statusCode,
            timestamp: Number(log.timestamp),
            duration: log.duration,
        }));

        return successResponse({
            logs,
            total,
            limit: query.limit,
            offset: query.offset,
        });
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            const message = error.issues?.[0]?.message || 'Validation error';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }
        logger.error('Log query error', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to query logs', 500);
    }
}

/**
 * @swagger
 * /admin/logs:
 *   delete:
 *     summary: Delete API logs
 *     description: Delete API logs matching criteria.
 *     tags: [Admin]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               beforeTimestamp:
 *                 type: integer
 *                 description: Delete logs before this timestamp
 *               token:
 *                 type: string
 *                 description: Delete logs for this token
 *     responses:
 *       200:
 *         description: Deletion result
 *       401:
 *         description: Unauthorized
 */
export async function DELETE(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const body = await request.json().catch(() => ({}));
        const validated = deleteSchema.parse(body);

        const prisma = getPrismaClient();

        // Build where clause
        const where: Record<string, unknown> = {};

        if (validated.token) {
            where.token = validated.token;
        }

        // Need to fetch and filter for timestamp
        if (validated.beforeTimestamp) {
            const logsToDelete = await prisma.apiLog.findMany({
                where,
                select: { id: true, timestamp: true },
            });

            const idsToDelete = logsToDelete
                .filter((log) => Number(log.timestamp) < validated.beforeTimestamp!)
                .map((log) => log.id);

            if (idsToDelete.length > 0) {
                await prisma.apiLog.deleteMany({
                    where: { id: { in: idsToDelete } },
                });
            }

            return successResponse({
                deletedCount: idsToDelete.length,
            });
        }

        // Delete all matching logs (or all if no filter)
        const result = await prisma.apiLog.deleteMany({ where });

        return successResponse({
            deletedCount: result.count,
        });
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            const message = error.issues?.[0]?.message || 'Validation error';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }
        logger.error('Log delete error', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to delete logs', 500);
    }
}
