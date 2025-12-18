'use client';

import { useState, useEffect } from 'react';

interface ItemDetail {
    id: string;
    type: 'text' | 'image';
    original_name: string | null;
    decrypt_at: number;
    created_at: number;
    layer_count: number;
    unlocked: boolean;
    content: string | null;
}

interface ContentViewProps {
    selectedId: string | null;
    onDelete: (id: string) => void;
    onItemUpdated?: () => void;
    onMenuClick: () => void;
}

export default function ContentView({ selectedId, onDelete, onItemUpdated, onMenuClick }: ContentViewProps) {
    const [item, setItem] = useState<ItemDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState<string>('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [extendingMinutes, setExtendingMinutes] = useState<number | null>(null);

    useEffect(() => {
        if (!selectedId) {
            setItem(null);
            return;
        }

        const fetchItem = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/items/${selectedId}`);
                const data = await response.json();
                setItem(data);
            } catch (error) {
                console.error('Error fetching item:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchItem();
    }, [selectedId]);

    // Countdown timer
    useEffect(() => {
        if (!item || item.unlocked) {
            setCountdown('');
            return;
        }

        const updateCountdown = () => {
            const now = Date.now();
            const diff = item.decrypt_at - now;

            if (diff <= 0) {
                // Time's up, refetch to get decrypted content
                fetch(`/api/items/${item.id}`)
                    .then(res => res.json())
                    .then(data => setItem(data));
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [item]);

    const handleDelete = async () => {
        if (!item || isDeleting) return;

        if (!confirm('Are you sure you want to delete this item?')) return;

        setIsDeleting(true);
        try {
            await fetch(`/api/items/${item.id}`, { method: 'DELETE' });
            onDelete(item.id);
            setItem(null);
        } catch (error) {
            console.error('Error deleting item:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExtend = async (minutes: number) => {
        if (!item || extendingMinutes !== null) return;

        setExtendingMinutes(minutes);
        try {
            const response = await fetch(`/api/items/${item.id}/extend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minutes })
            });

            if (response.ok) {
                // Refetch the item to get updated state (unlocked -> locked)
                const itemResponse = await fetch(`/api/items/${item.id}`);
                const updatedItem = await itemResponse.json();
                setItem(updatedItem);
                onItemUpdated?.();
            }
        } catch (error) {
            console.error('Error extending lock:', error);
        } finally {
            setExtendingMinutes(null);
        }
    };

    if (!selectedId) {
        return (
            <div className="content-view empty">
                {/* Mobile menu button for empty state */}
                <div className="content-header" style={{ borderBottom: 'none' }}>
                    <button
                        className="mobile-menu-btn"
                        onClick={onMenuClick}
                        aria-label="Open menu"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="empty-content">
                    <div className="empty-icon">🔐</div>
                    <h2>Select an item to view</h2>
                    <p>or click &quot;+ Add New&quot; to create one</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="content-view loading">
                {/* Mobile menu button for loading state */}
                <div className="content-header" style={{ borderBottom: 'none' }}>
                    <button
                        className="mobile-menu-btn"
                        onClick={onMenuClick}
                        aria-label="Open menu"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="content-view error">
                {/* Mobile menu button for error state */}
                <div className="content-header" style={{ borderBottom: 'none' }}>
                    <button
                        className="mobile-menu-btn"
                        onClick={onMenuClick}
                        aria-label="Open menu"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <p>Item not found</p>
            </div>
        );
    }

    return (
        <div className="content-view">
            <div className="content-header">
                {/* Mobile menu button */}
                <button
                    className="mobile-menu-btn"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>

                <div className="content-title">
                    <span className="content-icon">{item.type === 'text' ? '📝' : '🖼️'}</span>
                    <span>{item.type === 'text' ? 'Text' : (item.original_name || 'Image')}</span>
                    {item.layer_count > 1 && (
                        <span className="layer-badge">×{item.layer_count}</span>
                    )}
                </div>
                <button
                    className="delete-button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                >
                    {isDeleting ? 'Deleting...' : '🗑️ Delete'}
                </button>
            </div>


            <div className="content-body">
                {item.unlocked ? (
                    <div className="unlocked-content">
                        {item.type === 'text' ? (
                            <div className="text-content">{item.content}</div>
                        ) : (
                            <img
                                src={item.content || ''}
                                alt={item.original_name || 'Decrypted image'}
                                className="image-content"
                            />
                        )}

                        {/* Extend buttons for unlocked content */}
                        <div className="extend-buttons" style={{ marginTop: '24px' }}>
                            <span className="extend-label">Extend:</span>
                            <button
                                className="extend-btn"
                                onClick={() => handleExtend(1)}
                                disabled={extendingMinutes !== null}
                            >
                                {extendingMinutes === 1 ? '...' : '+1m'}
                            </button>
                            <button
                                className="extend-btn"
                                onClick={() => handleExtend(60)}
                                disabled={extendingMinutes !== null}
                            >
                                {extendingMinutes === 60 ? '...' : '+1h'}
                            </button>
                            <button
                                className="extend-btn"
                                onClick={() => handleExtend(360)}
                                disabled={extendingMinutes !== null}
                            >
                                {extendingMinutes === 360 ? '...' : '+6h'}
                            </button>
                            <button
                                className="extend-btn"
                                onClick={() => handleExtend(720)}
                                disabled={extendingMinutes !== null}
                            >
                                {extendingMinutes === 720 ? '...' : '+12h'}
                            </button>
                            <button
                                className="extend-btn"
                                onClick={() => handleExtend(1440)}
                                disabled={extendingMinutes !== null}
                            >
                                {extendingMinutes === 1440 ? '...' : '+1d'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="locked-content">
                        <div className="lock-icon">🔒</div>
                        <h2>Content Locked</h2>
                        <div className="countdown">{countdown}</div>

                        {/* Extend buttons for locked content */}
                        <div className="extend-buttons">
                            <span className="extend-label">Extend:</span>
                            <button
                                className="extend-btn"
                                onClick={() => handleExtend(1)}
                                disabled={extendingMinutes !== null}
                            >
                                {extendingMinutes === 1 ? '...' : '+1m'}
                            </button>
                            <button
                                className="extend-btn"
                                onClick={() => handleExtend(60)}
                                disabled={extendingMinutes !== null}
                            >
                                {extendingMinutes === 60 ? '...' : '+1h'}
                            </button>
                            <button
                                className="extend-btn"
                                onClick={() => handleExtend(360)}
                                disabled={extendingMinutes !== null}
                            >
                                {extendingMinutes === 360 ? '...' : '+6h'}
                            </button>
                            <button
                                className="extend-btn"
                                onClick={() => handleExtend(720)}
                                disabled={extendingMinutes !== null}
                            >
                                {extendingMinutes === 720 ? '...' : '+12h'}
                            </button>
                            <button
                                className="extend-btn"
                                onClick={() => handleExtend(1440)}
                                disabled={extendingMinutes !== null}
                            >
                                {extendingMinutes === 1440 ? '...' : '+1d'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
