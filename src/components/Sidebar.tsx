'use client';

import { ItemListView } from '@/lib/db';

interface SidebarProps {
    items: ItemListView[];
    selectedId: string | null;
    onSelectItem: (id: string) => void;
    onAddClick: () => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ items, selectedId, onSelectItem, onAddClick, isOpen, onClose }: SidebarProps) {
    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
                onClick={onClose}
            />

            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                {/* Mobile close button */}
                <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
                    ×
                </button>

                <button className="add-button" onClick={onAddClick}>
                    <svg className="add-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add New
                </button>

                <div className="items-list">
                    {items.length === 0 ? (
                        <div className="empty-state">
                            No encrypted items yet
                        </div>
                    ) : (
                        items.map((item) => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                isSelected={item.id === selectedId}
                                onClick={() => onSelectItem(item.id)}
                            />
                        ))
                    )}
                </div>
            </div>
        </>
    );
}

interface ItemCardProps {
    item: ItemListView;
    isSelected: boolean;
    onClick: () => void;
}

function ItemCard({ item, isSelected, onClick }: ItemCardProps) {
    const now = Date.now();
    const isUnlocked = now >= item.decrypt_at;
    const timeRemaining = getTimeRemaining(item.decrypt_at);

    return (
        <div
            className={`item-card ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
        >
            <div className="item-icon">
                {item.type === 'text' ? '📝' : '🖼️'}
            </div>
            <div className="item-info">
                <div className="item-title">
                    {item.type === 'text' ? 'Text' : (item.original_name || 'Image')}
                </div>
                <div className={`item-status ${isUnlocked ? 'unlocked' : 'locked'}`}>
                    {isUnlocked ? '✅ Unlocked' : `🔒 ${timeRemaining}`}
                </div>
            </div>
        </div>
    );
}

function getTimeRemaining(decryptAt: number): string {
    const now = Date.now();
    const diff = decryptAt - now;

    if (diff <= 0) return 'Unlocked';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
}
