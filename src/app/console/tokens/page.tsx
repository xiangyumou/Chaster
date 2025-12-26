'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { Copy, Trash2, Plus, RefreshCw, Power, PowerOff } from 'lucide-react';

interface Token {
    token: string;
    name: string;
    createdAt: number;
    lastUsedAt: number | null;
    isActive: boolean;
}

export default function TokensPage() {
    const { token: authToken } = useAuthStore();
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const fetchTokens = async () => {
        if (!authToken) return;
        setLoading(true);
        try {
            const res = await fetch('/api/v1/admin/tokens', {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            if (res.ok) {
                setTokens(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTokens();
    }, [authToken]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !authToken) return;
        setIsCreating(true);
        try {
            const res = await fetch('/api/v1/admin/tokens', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newName })
            });
            if (res.ok) {
                setNewName('');
                fetchTokens();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (tokenToDelete: string) => {
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        try {
            await fetch(`/api/v1/admin/tokens/${tokenToDelete}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authToken}` }
            });
            fetchTokens();
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggle = async (tokenToToggle: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/v1/admin/tokens/${tokenToToggle}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: !currentStatus })
            });
            fetchTokens();
        } catch (err) {
            console.error(err);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    if (loading && tokens.length === 0) {
        return <div className="text-neutral-400">Loading tokens...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold mb-2">API Tokens</h1>
                    <p className="text-neutral-400">Manage access keys for the service.</p>
                </div>
                <button
                    onClick={fetchTokens}
                    className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Create Token Form */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Generate New Token</h3>
                <form onSubmit={handleCreate} className="flex gap-4">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Token description (e.g. Production App)"
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors"
                        disabled={isCreating}
                    />
                    <button
                        type="submit"
                        disabled={isCreating || !newName.trim()}
                        className="bg-white text-black font-medium px-6 py-2 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Generate
                    </button>
                </form>
            </div>

            {/* Tokens List */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                            <tr>
                                <th className="px-6 py-4 font-medium">Name</th>
                                <th className="px-6 py-4 font-medium">Token</th>
                                <th className="px-6 py-4 font-medium">Created</th>
                                <th className="px-6 py-4 font-medium">Last Used</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {tokens.map((token) => (
                                <tr key={token.token} className="hover:bg-neutral-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium">{token.name}</td>
                                    <td className="px-6 py-4 font-mono text-neutral-400">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate max-w-[150px]">{token.token}</span>
                                            <button
                                                onClick={() => copyToClipboard(token.token)}
                                                className="p-1 hover:text-white transition-colors"
                                                title="Copy full token"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-400">
                                        {new Date(token.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-neutral-400">
                                        {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : 'Never'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${token.isActive
                                                ? 'bg-green-500/10 text-green-400'
                                                : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {token.isActive ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleToggle(token.token, token.isActive)}
                                                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                                                title={token.isActive ? "Disable" : "Enable"}
                                            >
                                                {token.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(token.token)}
                                                className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                                                title="Revoke"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {tokens.length === 0 && (
                        <div className="p-8 text-center text-neutral-500">
                            No api tokens found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
