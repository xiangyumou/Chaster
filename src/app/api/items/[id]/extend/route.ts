import { NextRequest, NextResponse } from 'next/server';
import { getItemById, updateItemEncryptionOptimistic } from '@/lib/db';
import { encrypt } from '@/lib/tlock';


interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { minutes } = body;

        // Valid presets: 1m, 10m, 1h, 6h, 1d
        const validMinutes = [1, 10, 60, 360, 1440];
        if (!minutes || !validMinutes.includes(minutes)) {
            return NextResponse.json({ error: 'Invalid minutes, must be 1, 10, 60, 360, or 1440' }, { status: 400 });
        }

        const item = getItemById(id);
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // Always treat current encrypted_data as the data to be encrypted again (layered encryption)
        const dataToEncrypt = Buffer.from(item.encrypted_data, 'utf-8');

        // New decrypt time = max(now, existing decrypt_at) + minutes
        const baseTime = Math.max(Date.now(), item.decrypt_at);
        const newDecryptAt = new Date(baseTime + minutes * 60 * 1000);

        const { ciphertext: newCiphertext, roundNumber: newRoundNumber } = await encrypt(
            dataToEncrypt,
            newDecryptAt
        );

        // Use optimistic locking: only update if layer_count hasn't changed
        const expectedLayerCount = item.layer_count;
        const newLayerCount = expectedLayerCount + 1;
        const success = updateItemEncryptionOptimistic(
            id,
            newCiphertext,
            newDecryptAt.getTime(),
            newRoundNumber,
            expectedLayerCount,
            newLayerCount
        );

        if (!success) {
            // Concurrent modification detected - another request updated the item first
            return NextResponse.json({
                error: 'Concurrent modification detected. Please refresh and try again.'
            }, { status: 409 });
        }

        return NextResponse.json({
            success: true,
            decrypt_at: newDecryptAt.getTime(),
            layer_count: newLayerCount
        });
    } catch (error) {
        console.error('Error extending lock:', error);
        return NextResponse.json({ error: 'Failed to extend lock' }, { status: 500 });
    }
}
