import { NextRequest, NextResponse } from 'next/server';
import { getAllItems, createItem, getLastDuration, setLastDuration } from '@/lib/db';
import { encrypt, getRoundForTime } from '@/lib/tlock';
import { getCurrentUserId } from '@/lib/user-context';
import { v4 as uuidv4 } from 'uuid';

// GET /api/items - List all items
export async function GET() {
    try {
        const userId = getCurrentUserId();
        const items = getAllItems(userId);
        const lastDuration = getLastDuration(userId);
        return NextResponse.json({ items, lastDuration });
    } catch (error) {
        console.error('Error fetching items:', error);
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }
}

// POST /api/items - Create new encrypted item
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const type = formData.get('type') as 'text' | 'image';
        const durationMinutes = formData.get('durationMinutes') ? parseInt(formData.get('durationMinutes') as string, 10) : null;
        const decryptAtTimestamp = formData.get('decryptAt') ? parseInt(formData.get('decryptAt') as string, 10) : null;

        if (!type || (!durationMinutes && !decryptAtTimestamp)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let dataToEncrypt: Buffer;
        let originalName: string | null = null;

        if (type === 'text') {
            const text = formData.get('content') as string;
            if (!text) {
                return NextResponse.json({ error: 'Missing text content' }, { status: 400 });
            }
            dataToEncrypt = Buffer.from(text, 'utf-8');
        } else {
            const file = formData.get('file') as File;
            if (!file) {
                return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
            }
            originalName = file.name;
            const arrayBuffer = await file.arrayBuffer();
            dataToEncrypt = Buffer.from(arrayBuffer);
        }

        // Calculate decrypt time
        let decryptAt: Date;
        if (decryptAtTimestamp) {
            decryptAt = new Date(decryptAtTimestamp);
            if (isNaN(decryptAt.getTime()) || decryptAt.getTime() <= Date.now()) {
                return NextResponse.json({ error: 'Invalid decrypt time, must be in the future' }, { status: 400 });
            }
        } else {
            // Fallback to duration (guaranteed to be present due to check above)
            decryptAt = new Date(Date.now() + (durationMinutes!) * 60 * 1000);
        }

        // Encrypt with tlock
        const { ciphertext, roundNumber } = await encrypt(dataToEncrypt, decryptAt);

        // Save to database
        const item = createItem({
            id: uuidv4(),
            type,
            encrypted_data: ciphertext,
            original_name: originalName,
            decrypt_at: decryptAt.getTime(),
            round_number: roundNumber,
            created_at: Date.now(),
            last_duration_minutes: durationMinutes // Can be null if using absolute time
        });

        // Update last used duration only if duration was used or calculated
        const userId = getCurrentUserId();
        if (durationMinutes) {
            setLastDuration(durationMinutes, userId);
        }

        return NextResponse.json({
            success: true,
            item: {
                id: item.id,
                type: item.type,
                original_name: item.original_name,
                decrypt_at: item.decrypt_at,
                created_at: item.created_at
            }
        });
    } catch (error) {
        console.error('Error creating item:', error);
        return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }
}
