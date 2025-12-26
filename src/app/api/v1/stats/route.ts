import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';

/**
 * GET /api/v1/stats - Get statistics
 */
export async function GET(request: NextRequest) {
    // Authenticate
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const prisma = getPrismaClient();
        const now = Date.now();

        // Get all items
        const allItems = await prisma.item.findMany();

        // Calculate stats
        const totalItems = allItems.length;
        const lockedItems = allItems.filter((item) => Number(item.decryptAt) > now).length;
        const unlockedItems = totalItems - lockedItems;

        const textItems = allItems.filter((item) => item.type === 'text').length;
        const imageItems = allItems.filter((item) => item.type === 'image').length;

        // Calculate average lock duration (in minutes)
        let avgLockDurationMinutes = 0;
        if (allItems.length > 0) {
            const totalDuration = allItems.reduce(
                (sum, item) => sum + (Number(item.decryptAt) - Number(item.createdAt)),
                0
            );
            avgLockDurationMinutes = Math.round(totalDuration / allItems.length / 60000);
        }

        // Get oldest and newest items
        const oldestItem = allItems.length > 0
            ? Math.min(...allItems.map((item) => Number(item.createdAt)))
            : null;
        const newestItem = allItems.length > 0
            ? Math.max(...allItems.map((item) => Number(item.createdAt)))
            : null;

        return successResponse({
            totalItems,
            lockedItems,
            unlockedItems,
            byType: {
                text: textItems,
                image: imageItems,
            },
            avgLockDurationMinutes,
            oldestItem,
            newestItem,
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to fetch statistics', 500);
    }
}
