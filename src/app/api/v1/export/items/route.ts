import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticate, successResponse, errorResponse } from '@/lib/auth';
import { decrypt } from '@/lib/decryption';
import { z } from 'zod';

const querySchema = z.object({
    format: z.enum(['json', 'csv', 'ndjson']).optional().default('json'),
    includeContent: z.coerce.boolean().optional().default(false),
    status: z.enum(['all', 'locked', 'unlocked']).optional().default('all'),
    includeEncryptedData: z.coerce.boolean().optional().default(true),
});

/**
 * @swagger
 * /export/items:
 *   get:
 *     summary: Export all items
 *     description: Export all items in various formats. Supports filtering and optional content decryption.
 *     tags: [Export]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, ndjson]
 *           default: json
 *         description: Export format
 *       - in: query
 *         name: includeContent
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include decrypted content for unlocked items
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, locked, unlocked]
 *           default: all
 *         description: Filter by lock status
 *       - in: query
 *         name: includeEncryptedData
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include encrypted data (for backup purposes)
 *     responses:
 *       200:
 *         description: Exported data
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
    const authResult = await authenticate(request);
    if ('error' in authResult) return authResult.error;

    try {
        const { searchParams } = new URL(request.url);
        const query = querySchema.parse({
            format: searchParams.get('format') || 'json',
            includeContent: searchParams.get('includeContent') || 'false',
            status: searchParams.get('status') || 'all',
            includeEncryptedData: searchParams.get('includeEncryptedData') ?? 'true',
        });

        const prisma = getPrismaClient();
        const now = Date.now();

        // Fetch all items
        const allItems = await prisma.item.findMany({
            orderBy: { createdAt: 'desc' },
        });

        // Filter by status
        let filteredItems = allItems;
        if (query.status !== 'all') {
            filteredItems = allItems.filter((item) => {
                const unlocked = Number(item.decryptAt) <= now;
                return query.status === 'unlocked' ? unlocked : !unlocked;
            });
        }

        // Process items
        const processedItems = await Promise.all(
            filteredItems.map(async (item) => {
                const unlocked = Number(item.decryptAt) <= now;
                const metadata = item.metadata ? JSON.parse(item.metadata) : null;

                const exportItem: Record<string, unknown> = {
                    id: item.id,
                    type: item.type,
                    originalName: item.originalName,
                    decryptAt: Number(item.decryptAt),
                    roundNumber: Number(item.roundNumber),
                    createdAt: Number(item.createdAt),
                    layerCount: item.layerCount,
                    metadata,
                    unlocked,
                };

                // Include encrypted data if requested (default true for backup)
                if (query.includeEncryptedData) {
                    exportItem.encryptedData = item.encryptedData;
                }

                // Optionally include decrypted content for unlocked items
                if (query.includeContent && unlocked) {
                    try {
                        const decryptedBuffer = await decrypt(
                            item.encryptedData,
                            Number(item.roundNumber)
                        );
                        if (item.type === 'text') {
                            exportItem.content = decryptedBuffer.toString('utf-8');
                        } else {
                            exportItem.content = decryptedBuffer.toString('base64');
                        }
                    } catch {
                        exportItem.content = null;
                        exportItem.decryptionError = true;
                    }
                }

                return exportItem;
            })
        );

        // Format output
        if (query.format === 'json') {
            return successResponse({
                exportedAt: Date.now(),
                totalCount: processedItems.length,
                items: processedItems,
            });
        }

        if (query.format === 'ndjson') {
            const ndjson = processedItems.map((item) => JSON.stringify(item)).join('\n');
            return new Response(ndjson, {
                headers: {
                    'Content-Type': 'application/x-ndjson',
                    'Content-Disposition': `attachment; filename="chaster-export-${Date.now()}.ndjson"`,
                },
            });
        }

        if (query.format === 'csv') {
            // CSV format (simplified, metadata as JSON string)
            const headers = [
                'id',
                'type',
                'originalName',
                'decryptAt',
                'createdAt',
                'layerCount',
                'unlocked',
                'metadata',
            ];
            const csvRows = [headers.join(',')];

            for (const item of processedItems) {
                const row = [
                    item.id,
                    item.type,
                    item.originalName || '',
                    item.decryptAt,
                    item.createdAt,
                    item.layerCount,
                    item.unlocked,
                    item.metadata ? JSON.stringify(item.metadata).replace(/"/g, '""') : '',
                ];
                csvRows.push(row.map((v) => `"${v}"`).join(','));
            }

            return new Response(csvRows.join('\n'), {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="chaster-export-${Date.now()}.csv"`,
                },
            });
        }

        return errorResponse('INVALID_FORMAT', 'Unsupported format', 400);
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            const message = error.issues?.[0]?.message || 'Validation error';
            return errorResponse('VALIDATION_ERROR', message, 400);
        }
        console.error('Export error:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to export items', 500);
    }
}
