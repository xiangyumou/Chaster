#!/usr/bin/env node
/**
 * Comprehensive Stress Test Suite for Chaster API
 * Tests all endpoints under various load conditions
 */

import { MetricsCollector, formatMetrics } from '../tests/stress/metrics.js';
import { EndpointTester, TEST_SCENARIOS, ScenarioConfig } from '../tests/stress/scenarios.js';



interface TestOptions {
    scenario?: keyof typeof TEST_SCENARIOS;
    concurrency?: number;
    totalRequests?: number;
    endpoint?: string;
    mixed?: boolean;
}

class StressTestRunner {
    private collector: MetricsCollector;
    private tester: EndpointTester;
    private createdItemIds: string[] = [];

    constructor(
        private baseUrl: string,
        private token: string
    ) {
        this.collector = new MetricsCollector();
        this.tester = new EndpointTester({ baseUrl, token });
    }

    async runSingleEndpoint(
        endpointName: string,
        concurrency: number,
        totalRequests: number
    ) {
        console.log(`\n🎯 Testing: ${endpointName}`);
        console.log(`📊 Concurrency: ${concurrency}, Total Requests: ${totalRequests}`);
        console.log('─'.repeat(60));

        this.collector.start();

        const limit = (global as unknown as { pLimit: (n: number) => <T>(fn: () => Promise<T>) => Promise<T> }).pLimit(concurrency);
        const promises: Promise<void>[] = [];

        // Progress tracking
        let completed = 0;
        const startTime = Date.now();

        for (let i = 0; i < totalRequests; i++) {
            promises.push(
                limit(async () => {
                    let result;

                    switch (endpointName) {
                        case 'createTextItem':
                            result = await this.tester.createTextItem(i);
                            if (result.success) {
                                // Extract item ID from response if needed
                                // For now, we'll track indices
                            }
                            break;
                        case 'createImageItem':
                            result = await this.tester.createImageItem(i);
                            break;
                        case 'listItems':
                            result = await this.tester.listItems(1, 20);
                            break;
                        case 'getStats':
                            result = await this.tester.getStats();
                            break;
                        case 'listTokens':
                            result = await this.tester.listTokens();
                            break;
                        case 'healthCheck':
                            result = await this.tester.healthCheck();
                            break;
                        default:
                            result = await this.tester.createTextItem(i);
                    }

                    this.collector.record(result);
                    completed++;

                    // Show progress every 10%
                    if (completed % Math.max(1, Math.floor(totalRequests / 10)) === 0) {
                        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                        const percent = ((completed / totalRequests) * 100).toFixed(0);
                        process.stdout.write(`\r⏳ Progress: ${completed}/${totalRequests} (${percent}%) - ${elapsed}s`);
                    }
                })
            );
        }

        await Promise.all(promises);
        this.collector.finish();

        console.log('\r' + ' '.repeat(80)); // Clear progress line
        console.log(formatMetrics(this.collector.getSummary()));
    }

    async runMixedScenario(concurrency: number, totalRequests: number) {
        console.log(`\n🎯 Testing: Mixed Scenario (Realistic Workload)`);
        console.log(`📊 Concurrency: ${concurrency}, Total Requests: ${totalRequests}`);
        console.log('📋 Profile: 50% Create, 30% List, 10% Stats, 10% Health');
        console.log('─'.repeat(60));

        this.collector.start();

        const limit = (global as unknown as { pLimit: (n: number) => <T>(fn: () => Promise<T>) => Promise<T> }).pLimit(concurrency);
        const promises: Promise<void>[] = [];

        let completed = 0;
        const startTime = Date.now();

        for (let i = 0; i < totalRequests; i++) {
            promises.push(
                limit(async () => {
                    let result;
                    const rand = Math.random();

                    if (rand < 0.5) {
                        // 50% create items
                        result = Math.random() < 0.8
                            ? await this.tester.createTextItem(i)
                            : await this.tester.createImageItem(i);
                    } else if (rand < 0.8) {
                        // 30% list items
                        result = await this.tester.listItems(Math.floor(Math.random() * 5) + 1);
                    } else if (rand < 0.9) {
                        // 10% stats
                        result = await this.tester.getStats();
                    } else {
                        // 10% health check
                        result = await this.tester.healthCheck();
                    }

                    this.collector.record(result);
                    completed++;

                    if (completed % Math.max(1, Math.floor(totalRequests / 10)) === 0) {
                        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                        const percent = ((completed / totalRequests) * 100).toFixed(0);
                        process.stdout.write(`\r⏳ Progress: ${completed}/${totalRequests} (${percent}%) - ${elapsed}s`);
                    }
                })
            );
        }

        await Promise.all(promises);
        this.collector.finish();

        console.log('\r' + ' '.repeat(80));
        console.log(formatMetrics(this.collector.getSummary()));
    }

    getSummary() {
        return this.collector.getSummary();
    }
}

async function main() {
    const args = process.argv.slice(2);
    const options: TestOptions = {};

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--scenario' && args[i + 1]) {
            options.scenario = args[i + 1] as keyof typeof TEST_SCENARIOS;
            i++;
        } else if (args[i] === '--concurrency' && args[i + 1]) {
            options.concurrency = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--requests' && args[i + 1]) {
            options.totalRequests = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--endpoint' && args[i + 1]) {
            options.endpoint = args[i + 1];
            i++;
        } else if (args[i] === '--mixed') {
            options.mixed = true;
        }
    }

    // Configuration
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3002/api/v1';
    let token = process.env.TEST_TOKEN || '';

    // Auto-fetch token from database if not provided
    if (!token) {
        console.log('⚙️  TEST_TOKEN not set, fetching from database...');
        try {
            // Import dynamically to avoid circular dependencies
            const { getPrismaClient } = await import('../src/lib/prisma.js');
            const db = getPrismaClient();

            const activeToken = await db.apiToken.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' }
            });

            if (activeToken) {
                token = activeToken.token;
                console.log(`✅ Using token: ${token.substring(0, 20)}...`);
            } else {
                console.error('❌ ERROR: No active API tokens found in database');
                console.error('\nCreate a token first:');
                console.error('  npm run token create "Stress Test"');
                process.exit(1);
            }

            await db.$disconnect();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('❌ Failed to fetch token from database:', message);
            console.error('\nYou can also set TEST_TOKEN manually:');
            console.error('  export TEST_TOKEN=your_token');
            console.error('  npm run stress:basic');
            process.exit(1);
        }
    }

    console.log('🚀 Chaster Comprehensive Stress Test Suite');
    console.log('='.repeat(60));
    console.log(`🌐 Base URL: ${baseUrl}`);
    console.log(`🔑 Token: ${token.substring(0, 8)}...${token.substring(token.length - 4)}`);

    // Determine test configuration
    let scenario: ScenarioConfig;
    if (options.scenario && TEST_SCENARIOS[options.scenario]) {
        scenario = TEST_SCENARIOS[options.scenario];
    } else if (options.concurrency && options.totalRequests) {
        scenario = {
            name: 'Custom Test',
            concurrency: options.concurrency,
            totalRequests: options.totalRequests,
            description: 'Custom configuration'
        };
    } else {
        scenario = TEST_SCENARIOS.basic;
    }

    console.log(`\n📋 Scenario: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);

    const runner = new StressTestRunner(baseUrl, token);

    try {
        if (options.mixed) {
            await runner.runMixedScenario(scenario.concurrency, scenario.totalRequests);
        } else if (options.endpoint) {
            await runner.runSingleEndpoint(options.endpoint, scenario.concurrency, scenario.totalRequests);
        } else {
            // Default: Run mixed scenario
            await runner.runMixedScenario(scenario.concurrency, scenario.totalRequests);
        }

        const summary = runner.getSummary();

        // Exit with error code if tests failed
        if (summary.successRate < 0.99) {
            console.log('\n❌ Test failed: Success rate below 99%');
            process.exit(1);
        }

        console.log('\n✅ Stress test completed successfully!');

    } catch (error) {
        console.error('\n❌ Test execution failed:', error);
        process.exit(1);
    }
}

// Run the main function
(async () => {
    try {
        // Dynamic import for ESM module
        const pLimitModule = await import('p-limit');
        // Export default for use in the module
        (global as Record<string, unknown>).pLimit = pLimitModule.default;

        await main();
    } catch (e: unknown) {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'ERR_MODULE_NOT_FOUND') {
            console.error('❌ Missing dependency: p-limit');
            console.error('Install it with: npm install p-limit');
            process.exit(1);
        }
        throw e;
    }
})();

