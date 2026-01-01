// Database types for UI components
// These types mirror the Prisma models for use in client components

export interface ItemListView {
    id: string;
    type: 'text' | 'image';
    original_name: string | null;
    decrypt_at: number;
    created_at: number;
    layer_count: number;
}

export interface Item extends ItemListView {
    encrypted_data: string;
    round_number: number;
    metadata: string | null;
}
