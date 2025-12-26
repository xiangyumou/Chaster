import Link from 'next/link';
import { ArrowRight, Lock, Database, Code } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-neutral-800">
      <header className="container mx-auto p-6 flex justify-between items-center">
        <div className="font-bold text-2xl flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <Lock className="w-4 h-4 text-black" />
          </div>
          Chaster
        </div>
        <nav className="flex gap-6 text-sm font-medium">
          <Link href="/api/docs" className="hover:text-white text-neutral-400 transition-colors">Documentation</Link>
          <a href="https://github.com/xiangyumou" target="_blank" className="hover:text-white text-neutral-400 transition-colors">GitHub</a>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-20">
        <div className="max-w-3xl">
          <h1 className="text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">
            Time-lock Encryption Service
          </h1>
          <p className="text-xl text-neutral-400 mb-10 leading-relaxed max-w-2xl">
            A production-ready, API-first service for ensuring data remains encrypted until a specific future time.
            Built on Drand threshold cryptography.
          </p>

          <div className="flex gap-4">
            <Link
              href="/console"
              className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-2"
            >
              Open Console <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/api/docs"
              className="px-6 py-3 border border-neutral-800 rounded-lg hover:bg-neutral-900 transition-colors flex items-center gap-2"
            >
              <Code className="w-4 h-4" /> API Reference
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="p-6 border border-neutral-900 rounded-2xl bg-neutral-900/50">
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Service-First</h3>
            <p className="text-neutral-400 text-sm">
              Designed as a foundational layer. Stateless logic with minimal dependencies.
            </p>
          </div>
          <div className="p-6 border border-neutral-900 rounded-2xl bg-neutral-900/50">
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Secure by Default</h3>
            <p className="text-neutral-400 text-sm">
              Powered by tlock-js and drand. No key management required.
            </p>
          </div>
          <div className="p-6 border border-neutral-900 rounded-2xl bg-neutral-900/50">
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center mb-4">
              <Code className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Developer Friendly</h3>
            <p className="text-neutral-400 text-sm">
              Comprehensive OpenAPI docs, TypeScript SDK support, and metadata.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
