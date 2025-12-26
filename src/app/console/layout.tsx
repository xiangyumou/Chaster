'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { Lock, LayoutDashboard, Key, Database, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ModeToggle } from '@/components/mode-toggle';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/confirm-provider';

export default function ConsoleLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { token, setToken } = useAuthStore();
    const { confirm } = useConfirm();
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

        try {
            // Accessing public endpoint to "warm up" or verify network is fine
            // Ideally verify token with stats
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



    const handleLogout = async () => {
        const confirmed = await confirm({
            title: 'Sign Out',
            description: 'Are you sure you want to sign out?',
            confirmText: 'Sign Out',
            cancelText: 'Cancel'
        });

        if (confirmed) {
            setToken(null);
            router.push('/');
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-lg">
                    <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                            <Lock className="w-6 h-6 text-primary-foreground" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-foreground mb-2">Console Access</h2>
                    <p className="text-muted-foreground text-center mb-8">Enter your API Token to continue</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={inputToken}
                                onChange={(e) => setInputToken(e.target.value)}
                                placeholder="tok_..."
                                className="w-full bg-background border border-input rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all font-mono text-sm"
                            />
                        </div>
                        {error && <p className="text-destructive text-sm text-center font-medium">{error}</p>}
                        <button
                            type="submit"
                            className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            Access Console
                        </button>
                    </form>
                    <div className="mt-6 flex justify-center">
                        <ModeToggle />
                    </div>
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
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-muted/30 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                        <Lock className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">Chaster</span>
                </div>

                <nav className="space-y-1 flex-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center justify-between mt-auto pt-6 border-t border-border">
                    <ModeToggle className="bg-transparent hover:bg-accent" />
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
}
