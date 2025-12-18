import { NextRequest, NextResponse } from 'next/server';
import { getItemById, updateItemEncryption } from '@/lib/db';
import { encrypt, canDecrypt } from '@/lib/tlock';
import { decryptLayers } from '@/lib/decryption';

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

        // Determine what data to encrypt
        let dataToEncrypt: Buffer;
        const isUnlocked = canDecrypt(item.decrypt_at);

        if (isUnlocked) {
            // Item is unlocked - decrypt all layers to get plaintext, then re-encrypt
            const decryptedData = await decryptLayers(item.encrypted_data, item.layer_count);

            if (!decryptedData) {
                return NextResponse.json({ error: 'Failed to decrypt unlocked item' }, { status: 500 });
            }

            dataToEncrypt = decryptedData;
        } else {
            // Item is still locked - re-encrypt the current ciphertext (adds another layer)
            dataToEncrypt = Buffer.from(item.encrypted_data, 'utf-8');
        }

        // New decrypt time = current time + minutes
        const newDecryptAt = new Date(Date.now() + minutes * 60 * 1000);

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
