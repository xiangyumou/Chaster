'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { Lock, LayoutDashboard, Key, Database, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function ConsoleLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { token, setToken } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [inputToken, setInputToken] = useState('');
    const [error, setError] = useState('');
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate token against API
        try {
            const res = await fetch('/api/health', { // Health doesn't need auth, but let's check stats to verify token
                method: 'GET',
            });

            // Actually we should hit an authenticated endpoint to verify
            const verifyRes = await fetch('/api/v1/stats', {
                headers: { Authorization: `Bearer ${inputToken}` }
            });

            if (verifyRes.ok) {
                setToken(inputToken);
            } else {
                setError('Invalid API Token');
            }
        } catch (err) {
            setError('Connection error');
        }
    };

    const handleLogout = () => {
        setToken(null);
        router.push('/');
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-8">
                    <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                            <Lock className="w-6 h-6 text-black" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-white mb-2">Console Access</h2>
                    <p className="text-neutral-400 text-center mb-8">Enter your API Token to continue</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={inputToken}
                                onChange={(e) => setInputToken(e.target.value)}
                                placeholder="tok_..."
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white transition-colors font-mono text-sm"
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <button
                            type="submit"
                            className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-neutral-200 transition-colors"
                        >
                            Access Console
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/console' },
        { icon: Database, label: 'Items', href: '/console/items' },
        { icon: Key, label: 'Tokens', href: '/console/tokens' },
        { icon: Settings, label: 'Settings', href: '/console/settings' },
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-neutral-800 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <Lock className="w-4 h-4 text-black" />
                    </div>
                    <span className="font-bold text-lg">Chaster</span>
                </div>

                <nav className="space-y-2 flex-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-neutral-800 text-white'
                                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors mt-auto"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
