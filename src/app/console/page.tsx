'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Lock, Unlock, Database, Clock, Activity, AlertTriangle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

interface Stats {
    totalItems: number;
    lockedItems: number;
    unlockedItems: number;
    byType: {
        text: number;
        image: number;
    };
    avgLockDurationMinutes: number;
}

export default function DashboardPage() {
    const { token, setToken } = useAuthStore();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { theme } = useTheme();

    useEffect(() => {
        if (!token) return;

        fetch('/api/v1/stats', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(async (res) => {
                if (!res.ok) {
                    if (res.status === 401) {
                        // Token invalid
                        setToken(null);
                        router.push('/console'); // Should trigger layout login view
                        throw new Error('Unauthorized');
                    }
                    throw new Error('Failed to fetch data');
                }
                return res.json();
            })
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                if (err.message !== 'Unauthorized') {
                    setError('Failed to load dashboard data. Please switch to Console tab again or retry.');
                }
                setLoading(false);
            });
    }, [token, setToken, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
                Loading dashboard data...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
                <p>{error}</p>
            </div>
        );
    }

    if (!stats) return null; // Should not happen if loading false and no error, unless logged out

    const cards = [
        { label: 'Total Items', value: stats.totalItems, icon: Database, color: 'text-blue-500' },
        { label: 'Locked', value: stats.lockedItems, icon: Lock, color: 'text-orange-500' },
        { label: 'Unlocked', value: stats.unlockedItems, icon: Unlock, color: 'text-green-500' },
        { label: 'Avg Duration (min)', value: stats.avgLockDurationMinutes, icon: Clock, color: 'text-purple-500' },
    ];

    const pieData = [
        { name: 'Text', value: stats.byType.text },
        { name: 'Image', value: stats.byType.image },
    ];
    const COLORS = ['#3b82f6', '#f43f5e'];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
                <p className="text-muted-foreground">Overview of your encryption service.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-muted-foreground text-sm font-medium">{card.label}</span>
                                <div className={`p-2 rounded-full bg-muted/50 ${card.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold tracking-tight">{card.value}</div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        Item Distribution
                    </h3>
                    <div className="h-[300px] flex items-center justify-center w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        borderRadius: 'var(--radius)',
                                        border: '1px solid hsl(var(--border))',
                                        color: 'hsl(var(--popover-foreground))'
                                    }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        {pieData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                {entry.name} ({entry.value})
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="max-w-xs space-y-6">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">System Operational</h3>
                            <p className="text-muted-foreground text-sm">
                                The service is running normally. Data is encrypted and secure.
                            </p>
                        </div>

                        <div className="p-4 bg-muted/50 rounded-lg text-left w-full border border-border">
                            <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Environment</div>
                            <div className="text-xs font-mono text-foreground overflow-hidden break-all">
                                NODE_ENV: production
                            </div>
                            <div className="text-xs font-mono text-foreground overflow-hidden break-all mt-1">
                                DB: SQLite (Prisma)
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
