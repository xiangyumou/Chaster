import { NextRequest, NextResponse } from 'next/server';
import { getItemById, updateItemEncryption } from '@/lib/db';
import { encrypt } from '@/lib/tlock';


interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { minutes } = body;

        // Valid presets: 1m, 1h, 6h, 12h, 1d
        const validMinutes = [1, 60, 360, 720, 1440];
        if (!minutes || !validMinutes.includes(minutes)) {
            return NextResponse.json({ error: 'Invalid minutes, must be 1, 60, 360, 720, or 1440' }, { status: 400 });
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

        // Update the item with new encryption layer
        const newLayerCount = item.layer_count + 1;
        updateItemEncryption(
            id,
            newCiphertext,
            newDecryptAt.getTime(),
            newRoundNumber,
            newLayerCount
        );

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
