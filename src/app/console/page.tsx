'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Lock, Unlock, Database, Clock } from 'lucide-react';

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
    const { token } = useAuthStore();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;

        fetch('/api/v1/stats', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [token]);

    if (loading) {
        return <div className="text-neutral-400">Loading dashboard...</div>;
    }

    if (!stats) return null;

    const cards = [
        { label: 'Total Items', value: stats.totalItems, icon: Database, color: 'text-blue-400' },
        { label: 'Locked', value: stats.lockedItems, icon: Lock, color: 'text-red-400' },
        { label: 'Unlocked', value: stats.unlockedItems, icon: Unlock, color: 'text-green-400' },
        { label: 'Avg Duration (min)', value: stats.avgLockDurationMinutes, icon: Clock, color: 'text-amber-400' },
    ];

    const pieData = [
        { name: 'Text', value: stats.byType.text },
        { name: 'Image', value: stats.byType.image },
    ];
    const COLORS = ['#60a5fa', '#f87171'];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
                <p className="text-neutral-400">Overview of your encryption service.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-neutral-400 text-sm font-medium">{card.label}</span>
                                <Icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                            <div className="text-3xl font-bold">{card.value}</div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-6">Item Distribution</h3>
                    <div className="h-[300px] flex items-center justify-center">
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
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        {pieData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2 text-sm text-neutral-400">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                {entry.name} ({entry.value})
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col justify-center items-center text-center">
                    <div className="max-w-xs">
                        <h3 className="text-lg font-semibold mb-2">System Status</h3>
                        <div className="flex items-center gap-2 justify-center mb-6">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-green-500 font-medium">Operational</span>
                        </div>

                        <p className="text-neutral-400 text-sm mb-6">
                            The service is running normally using Prisma 5.22.0.
                        </p>

                        <div className="p-4 bg-neutral-950 rounded-lg text-left text-xs font-mono text-neutral-500 overflow-hidden break-all">
                            DATABASE_URL configured
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
