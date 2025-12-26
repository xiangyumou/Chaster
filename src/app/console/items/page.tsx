'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { Search, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';

interface Item {
    id: string;
    type: 'text' | 'image';
    decryptAt: number;
    createdAt: number;
    layerCount: number;
    unlocked: boolean;
    metadata: any;
    timeRemainingMs?: number;
}

export default function ItemsPage() {
    const { token } = useAuthStore();
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [limit] = useState(20);
    const [filter, setFilter] = useState('all');

    const fetchItems = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/items?limit=${limit}&offset=${offset}&status=${filter}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setItems(data.items);
                setTotal(data.total);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [token, offset, filter]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            await fetch(`/api/v1/items/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchItems();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Encrypted Items</h1>
                    <p className="text-neutral-400">View and manage time-locked data.</p>
                </div>
                <div className="flex gap-4">
                    <select
                        value={filter}
                        onChange={(e) => { setFilter(e.target.value); setOffset(0); }}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                    >
                        <option value="all">All Status</option>
                        <option value="locked">Locked</option>
                        <option value="unlocked">Unlocked</option>
                    </select>
                </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                            <tr>
                                <th className="px-6 py-4 font-medium">ID</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Created</th>
                                <th className="px-6 py-4 font-medium">Unlock Time</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-neutral-800/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-neutral-400 truncate max-w-[150px]">{item.id}</td>
                                    <td className="px-6 py-4 capitalize">{item.type}</td>
                                    <td className="px-6 py-4 text-neutral-400">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-neutral-400">
                                        {new Date(item.decryptAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.unlocked
                                                ? 'bg-green-500/10 text-green-400'
                                                : 'bg-amber-500/10 text-amber-400'
                                            }`}>
                                            {item.unlocked ? 'Unlocked' : 'Locked'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <a
                                                href={`/api/v1/items/${item.id}`}
                                                target="_blank"
                                                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                                                title="View Raw API"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length === 0 && !loading && (
                        <div className="p-8 text-center text-neutral-500">
                            No items found.
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-center text-sm text-neutral-400">
                <div>
                    Showing {total > 0 ? offset + 1 : 0}-{Math.min(offset + limit, total)} of {total}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                        className="p-2 hover:bg-neutral-800 rounded-lg disabled:opacity-50 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setOffset(offset + limit)}
                        disabled={offset + limit >= total}
                        className="p-2 hover:bg-neutral-800 rounded-lg disabled:opacity-50 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
