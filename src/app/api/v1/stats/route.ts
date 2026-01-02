import { NextRequest } from 'next/server'; // Added NextResponse
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { withRateLimit } from '@/lib/rate-limit-wrapper'; // Added import

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: System statistics
 *     description: Retrieve system-wide statistics (admin only in future, currently protected by token).
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalItems:
 *                   type: integer
 *                 lockedItems:
 *                   type: integer
 *                 unlockedItems:
 *                   type: integer
 *                 byType:
 *                   type: object
 *                   properties:
 *                     text: { type: integer }
 *                     image: { type: integer }
 *                 avgLockDurationMinutes:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
async function getStats(request: NextRequest) { // Renamed GET to getStats
    // Authenticate
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const prisma = getPrismaClient();
        const now = Date.now();
        const nowBigInt = BigInt(now);

        // Use efficient aggregate queries instead of loading all items
        const [totalItems, lockedItems, typeGroups, maxCreatedAt] = await Promise.all([
            // Total count
            prisma.item.count(),
            // Locked items count (decryptAt > now)
            prisma.item.count({ where: { decryptAt: { gt: nowBigInt } } }),
            // Group by type
            prisma.item.groupBy({
                by: ['type'],
                _count: true,
            }),
            // Get newest item timestamp
            prisma.item.aggregate({
                _max: {
                    createdAt: true,
                },
            }),
        ]);

        // Calculate unlocked items
        const unlockedItems = totalItems - lockedItems;

        // Process type breakdown
        const byType = {
            text: 0,
            image: 0,
        };
        for (const group of typeGroups) {
            if (group.type === 'text') {
                byType.text = group._count;
            } else if (group.type === 'image') {
                byType.image = group._count;
            }
        }

        // For average lock duration, we need a raw query or compute from a sample
        // Since Prisma doesn't support computed fields in aggregate, use a simpler approach
        let avgLockDurationMinutes = 0;
        if (totalItems > 0) {
            // Fetch only the fields needed for duration calculation (optimized query)
            const durationData = await prisma.item.findMany({
                select: {
                    createdAt: true,
                    decryptAt: true,
                },
                take: 1000, // Sample at most 1000 items for average calculation
            });

            if (durationData.length > 0) {
                const totalDuration = durationData.reduce(
                    (sum, item) => sum + (Number(item.decryptAt) - Number(item.createdAt)),
                    0
                );
                avgLockDurationMinutes = Math.round(totalDuration / durationData.length / 60000);
            }
        }

        // Get newest item timestamp
        const newestItem = maxCreatedAt._max.createdAt
            ? Number(maxCreatedAt._max.createdAt)
            : null;

        return successResponse({
            totalItems,
            lockedItems,
            unlockedItems,
            byType,
            avgLockDurationMinutes,
            newestItem,
        });
    } catch (error) {
        logger.error('Error fetching stats', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to fetch statistics', 500);
    }
}

export const GET = withRateLimit(getStats);
