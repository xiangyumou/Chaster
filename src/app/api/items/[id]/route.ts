import { NextRequest, NextResponse } from 'next/server';
import { getItemById, deleteItem } from '@/lib/db';
import { canDecrypt } from '@/lib/tlock';
import { decryptLayers } from '@/lib/decryption';
import { getCurrentUserId } from '@/lib/user-context';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/items/[id] - Get item with decryption attempt
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const userId = getCurrentUserId();
        const item = getItemById(id, userId);

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // Check if we can decrypt (outermost layer time has passed)
        if (canDecrypt(item.decrypt_at)) {
            try {
                const decryptedData = await decryptLayers(item.encrypted_data, item.layer_count);

                if (decryptedData) {
                    let content: string;

                    if (item.type === 'text') {
                        content = decryptedData.toString('utf-8');
                    } else {
                        // For images, return base64
                        content = `data:image/${getImageExtension(item.original_name)};base64,${decryptedData.toString('base64')}`;
                    }

                    return NextResponse.json({
                        id: item.id,
                        type: item.type,
                        original_name: item.original_name,
                        decrypt_at: item.decrypt_at,
                        created_at: item.created_at,
                        layer_count: item.layer_count,
                        unlocked: true,
                        content
                    });
                }
            } catch (error) {
                // Decryption failed, might still be too early
                console.error('Decryption error:', error);
            }
        }

        // Still locked
        return NextResponse.json({
            id: item.id,
            type: item.type,
            original_name: item.original_name,
            decrypt_at: item.decrypt_at,
            created_at: item.created_at,
            layer_count: item.layer_count,
            unlocked: false,
            content: null
        });
    } catch (error) {
        console.error('Error fetching item:', error);
        return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
    }
}

// DELETE /api/items/[id] - Delete item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const userId = getCurrentUserId();
        const success = deleteItem(id, userId);

        if (!success) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting item:', error);
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}

function getImageExtension(filename: string | null): string {
    if (!filename) return 'png';
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'jpg':
        case 'jpeg':
            return 'jpeg';
        case 'gif':
            return 'gif';
        case 'webp':
            return 'webp';
        case 'svg':
            return 'svg+xml';
        default:
            return 'png';
    }
}
