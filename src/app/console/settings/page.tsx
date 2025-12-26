export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
                <p className="text-muted-foreground">System configuration and preferences.</p>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm p-6 overflow-hidden">
                <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">About</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt className="text-muted-foreground mb-1">Version</dt>
                        <dd className="font-medium">1.0.0-production</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground mb-1">License</dt>
                        <dd className="font-medium">MIT (Proprietary Usage)</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground mb-1">Developer</dt>
                        <dd className="font-medium">Xiangyu</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground mb-1">Framework</dt>
                        <dd className="font-medium">Next.js 16 (App Router)</dd>
                    </div>
                </dl>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">Appearance</h3>
                <p className="text-muted-foreground text-sm mb-4">
                    Toggle between Light, Dark, or System theme.
                </p>
                <div className="flex items-center gap-4">
                    {/* The toggle is in sidebar, but we can visualize it here too or just text */}
                    <div className="text-sm bg-muted/50 p-3 rounded-md border border-border">
                        💡 Use the icon in the navigation bar to switch themes.
                    </div>
                </div>
            </div>
        </div>
    );
}
