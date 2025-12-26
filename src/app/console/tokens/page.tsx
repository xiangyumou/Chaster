'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { Trash2, Plus, Copy, Check, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/confirm-provider';
import { toast } from 'sonner';

interface Token {
    token: string;
    name: string;
    isActive: boolean;
    createdAt: number;
}

export default function TokensPage() {
    const { token } = useAuthStore();
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const [newTokenName, setNewTokenName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const { confirm } = useConfirm();

    const fetchTokens = () => {
        setLoading(true);
        fetch('/api/v1/admin/tokens', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                // API now returns { tokens: [...] } but fallback to likely structure if issue
                setTokens(data.tokens || []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                toast.error('Failed to load tokens');
                setLoading(false);
            });
    };

    useEffect(() => {
        if (token) fetchTokens();
    }, [token]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTokenName.trim()) return;

        setIsCreating(true);
        try {
            const res = await fetch('/api/v1/admin/tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: newTokenName })
            });
            if (!res.ok) throw new Error('Failed to create token');

            setNewTokenName('');
            toast.success('Token created successfully');
            fetchTokens();
        } catch (e) {
            toast.error('Failed to create token');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(text);
        toast.success('Token copied to clipboard');
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDelete = async (tokenToDelete: string) => {
        const confirmed = await confirm({
            title: 'Revoke Token',
            description: 'Are you sure you want to revoke this token? This action cannot be undone and any application using it will lose access.',
            confirmText: 'Revoke',
            variant: 'destructive',
        });

        if (!confirmed) return;

        try {
            await fetch(`/api/v1/admin/tokens/${tokenToDelete}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Token revoked');
            fetchTokens();
        } catch (e) {
            toast.error('Failed to revoke token');
        }
    };

    const handleToggle = async (t: Token) => {
        try {
            await fetch(`/api/v1/admin/tokens/${t.token}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ isActive: !t.isActive })
            });
            fetchTokens();
            toast.success(t.isActive ? 'Token deactivated' : 'Token activated');
        } catch (e) {
            toast.error('Failed to update token status');
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">API Tokens</h1>
                    <p className="text-muted-foreground">Manage access keys for the API.</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Create New Token</h3>
                <form onSubmit={handleCreate} className="flex gap-4">
                    <input
                        type="text"
                        value={newTokenName}
                        onChange={(e) => setNewTokenName(e.target.value)}
                        placeholder="Token Name (e.g. 'CI Pipeline')"
                        className="flex-1 bg-background border border-input rounded-md px-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                        type="submit"
                        disabled={isCreating || !newTokenName}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Generate
                    </button>
                </form>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground max-w-[50px]">Status</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Name</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground w-1/3">Token</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Created</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="h-32 text-center text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading tokens...
                                    </td>
                                </tr>
                            ) : tokens.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No tokens found.
                                    </td>
                                </tr>
                            ) : (
                                tokens.map((t) => (
                                    <tr key={t.token} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                                        <td className="p-4 align-middle">
                                            <button onClick={() => handleToggle(t)} title="Toggle Status">
                                                {t.isActive ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium border border-green-500/20 hover:bg-green-500/20 transition-colors cursor-pointer">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border hover:bg-muted/80 transition-colors cursor-pointer">
                                                        Inactive
                                                    </span>
                                                )}
                                            </button>
                                        </td>
                                        <td className="p-4 align-middle font-medium text-foreground">{t.name}</td>
                                        <td className="p-4 align-middle font-mono text-xs text-muted-foreground">
                                            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded border border-border max-w-[300px]">
                                                <span className="truncate flex-1">{t.token}</span>
                                                <button
                                                    onClick={() => handleCopy(t.token)}
                                                    className="text-muted-foreground hover:text-foreground p-1"
                                                    title="Copy Token"
                                                >
                                                    {copied === t.token ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4 align-middle text-right">
                                            <button
                                                onClick={() => handleDelete(t.token)}
                                                className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                title="Revoke Token"
                                            >
                                                <Trash2 className="w-4 h-4" />
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
