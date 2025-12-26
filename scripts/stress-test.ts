import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

// Only for types, not actual execution if running via tsx
interface Config {
    concurrency: number;
    totalRequests: number;
    baseUrl: string;
    token: string;
}

const CONFIG: Config = {
    concurrency: 50, // High concurrency for SQLite
    totalRequests: 100,
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000/api/v1',
    token: process.env.TEST_TOKEN || ''
};

async function createItem(i: number) {
    const start = performance.now();
    try {
        const res = await fetch(`${CONFIG.baseUrl}/items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'text',
                content: `Stress Test Item ${i}`,
                durationMinutes: 1
            })
        });
        const duration = performance.now() - start;
        return { success: res.ok, status: res.status, duration };
    } catch (e) {
        return { success: false, status: 0, duration: performance.now() - start, error: e };
    }
}

async function run() {
    if (!CONFIG.token) {
        console.error('❌ Please provide TEST_TOKEN env var');
        process.exit(1);
    }

    console.log(`🚀 Starting Stress Test: ${CONFIG.concurrency} concurrent reqs`);

    // Create an array of promises
    const promises: Promise<any>[] = [];
    const results: any[] = [];

    // Simple burst: Launch all at once (up to limit handled by Node)
    // For true concurrency control we'd use p-limit, but launching 50 promises is fine for Node.

    const startTotal = performance.now();

    for (let i = 0; i < CONFIG.concurrency; i++) {
        promises.push(createItem(i).then(r => results.push(r)));
    }

    await Promise.all(promises);

    const endTotal = performance.now();

    // Stats
    const successCount = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success);
    const avgTime = results.reduce((acc, r) => acc + r.duration, 0) / results.length;
    const maxTime = Math.max(...results.map(r => r.duration));

    console.log('\n📊 Results:');
    console.log(`- Total Duration: ${(endTotal - startTotal).toFixed(0)}ms`);
    console.log(`- Success Rate: ${successCount}/${CONFIG.concurrency} (${(successCount / CONFIG.concurrency * 100).toFixed(1)}%)`);
    console.log(`- Avg Request Time: ${avgTime.toFixed(0)}ms`);
    console.log(`- Max Request Time: ${maxTime.toFixed(0)}ms`);

    if (failures.length > 0) {
        console.log('\n❌ Failures:', failures.slice(0, 5));
        console.log('(Showing first 5 failures)');
        process.exit(1);
    } else {
        console.log('\n✅ Stress Test Passed!');
    }
}

run();
