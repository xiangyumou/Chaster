import Link from 'next/link';
import { ArrowRight, Lock, Database, Code, ShieldCheck } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="container mx-auto p-6 flex justify-between items-center z-10 relative">
        <div className="font-bold text-2xl flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md">
            <Lock className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="tracking-tight">Chaster</span>
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/api/docs" className="text-muted-foreground hover:text-foreground transition-colors">Documentation</Link>
          <a href="https://github.com/xiangyumou" target="_blank" className="text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
          <ModeToggle />
        </nav>
      </header>

      <main className="flex-1 container mx-auto px-6 py-20 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Production Ready v1.0
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent pb-2">
            Time-lock Encryption Service
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Secure your data until the future arrives. Built on Drand threshold cryptography.
            API-first, stateless, and ready to scale.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link
              href="/console"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Open Console <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link
              href="/api/docs"
              className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Code className="mr-2 w-4 h-4" /> API Reference
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-32">
          <FeatureCard
            icon={Database}
            title="Service-First"
            desc="Designed as a foundational layer. Stateless logic with minimal dependencies for maximum reliability."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Secure by Default"
            desc="Powered by tlock-js and Drand. No centralized key management required. Trustless and verifiable."
          />
          <FeatureCard
            icon={Code}
            title="Developer Friendly"
            desc="Comprehensive OpenAPI 3.0 docs, TypeScript SDK support, and rich metadata for your applications."
          />
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        <div className="container mx-auto">
          &copy; {new Date().getFullYear()} Chaster Service. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-6 border border-border rounded-xl bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {desc}
      </p>
    </div>
  )
}
