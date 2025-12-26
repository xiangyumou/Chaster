'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { Trash2, Lock, Unlock, Image as ImageIcon, FileText, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
    id: string;
    type: 'text' | 'image';
    originalName: string | null;
    decryptAt: number;
    createdAt: number;
    unlocked: boolean;
    timeRemainingMs?: number;
}

export default function ItemsPage() {
    const { token } = useAuthStore();
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchItems = () => {
        setLoading(true);
        fetch(`/api/v1/items?status=${filter}&limit=100`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setItems(data.items || []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        if (token) fetchItems();
    }, [token, filter]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        setDeletingId(id);
        try {
            await fetch(`/api/v1/items/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchItems();
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleString();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Items</h1>
                    <p className="text-muted-foreground">Manage encrypted content.</p>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border">
                    {['all', 'locked', 'unlocked'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                filter === f
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Type</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">ID / Name</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Created</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Decrypt At</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="h-32 text-center text-muted-foreground">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Loading items...
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No items found.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                                        <td className="p-4 align-middle">
                                            {item.type === 'text' ? (
                                                <div className="flex items-center gap-2 text-blue-500">
                                                    <FileText className="w-4 h-4" /> <span className="text-foreground">Text</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-purple-500">
                                                    <ImageIcon className="w-4 h-4" /> <span className="text-foreground">Image</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle font-mono text-xs text-muted-foreground">
                                            <div className="text-foreground text-sm mb-0.5 max-w-[150px] truncate" title={item.originalName || 'Untitled'}>
                                                {item.originalName || 'Untitled'}
                                            </div>
                                            {item.id.slice(0, 8)}...
                                        </td>
                                        <td className="p-4 align-middle text-muted-foreground">{formatDate(item.createdAt)}</td>
                                        <td className="p-4 align-middle text-muted-foreground">{formatDate(item.decryptAt)}</td>
                                        <td className="p-4 align-middle">
                                            {item.unlocked ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                                                    <Unlock className="w-3 h-3" /> Unlocked
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                                    <Lock className="w-3 h-3" /> Locked
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                disabled={!!deletingId}
                                                className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                                                title="Delete Item"
                                            >
                                                {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
