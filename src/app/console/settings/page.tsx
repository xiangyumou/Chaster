export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Settings</h1>
                <p className="text-neutral-400">System configuration and preferences.</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
                <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                <p className="text-neutral-400 max-w-md mx-auto">
                    System-wide settings such as Rate Limiting configuration, Console Password updates, and Audit Log export will be available here.
                </p>
            </div>
        </div>
    );
}
