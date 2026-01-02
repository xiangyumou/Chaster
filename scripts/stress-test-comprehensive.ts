#!/usr/bin/env node
/**
 * Comprehensive Stress Test Suite for Chaster API
 * Tests all endpoints under various load conditions
 */

import { MetricsCollector, formatMetrics } from '../tests/stress/metrics.js';
import { EndpointTester, TEST_SCENARIOS } from '../tests/stress/scenarios.js';
import pLimit from 'p-limit';

// Parse command line arguments manually since we want to avoid extra deps if possible,
// but we can check if minimist is available. For now, simple parsing.
const args = process.argv.slice(2);
const options = {
    scenario: getArgValue('scenario'),
    concurrency: parseInt(getArgValue('concurrency') || '0'),
    requests: parseInt(getArgValue('requests') || '0'),
    endpoint: getArgValue('endpoint'),
    mixed: args.includes('--mixed')
};

function getArgValue(name: string): string | undefined {
    const index = args.indexOf(`--${name}`);
    if (index !== -1 && index + 1 < args.length) {
        return args[index + 1];
    }
    return undefined;
}

class StressTestRunner {
    private collector: MetricsCollector;
    private tester: EndpointTester;

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
        console.log(`Starting ${endpointName} test: ${totalRequests} requests, ${concurrency} concurrency`);
        const limit = pLimit(concurrency);
        const tasks: Promise<void>[] = [];

        this.collector.start();

        for (let i = 0; i < totalRequests; i++) {
            tasks.push(limit(async () => {
                // @ts-expect-error - dynamic method access
                const method = this.tester[endpointName];
                if (typeof method === 'function') {
                    const result = await method.call(this.tester, i);
                    this.collector.record(result);
                } else {
                    console.error(`Unknown endpoint method: ${endpointName}`);
                }
            }));
        }

        await Promise.all(tasks);
        this.collector.finish();

        console.log(formatMetrics(this.collector.getSummary()));
    }

    async runMixedScenario(concurrency: number, totalRequests: number) {
        console.log(`Starting Mixed Scenario: ${totalRequests} requests, ${concurrency} concurrency`);
        const limit = pLimit(concurrency);
        const tasks: Promise<void>[] = [];

        const actions = [
            { weight: 40, method: 'listItems' },
            { weight: 20, method: 'getItem' }, // Needs valid ID? We might need to handle this.
            { weight: 15, method: 'getStats' },
            { weight: 15, method: 'createTextItem' },
            { weight: 5, method: 'createImageItem' },
            { weight: 5, method: 'healthCheck' }
        ];

        this.collector.start();

        for (let i = 0; i < totalRequests; i++) {
            tasks.push(limit(async () => {
                const rand = Math.random() * 100;
                let sum = 0;
                let action = actions[0];

                for (const a of actions) {
                    sum += a.weight;
                    if (rand < sum) {
                        action = a;
                        break;
                    }
                }

                // Special handling for methods needing args
                let result;
                if (action.method === 'getItem') {
                    // For getting items, we might need a pool of IDs or just list first
                    // Fallback to listItems if intricate state management is needed, 
                    // or maybe create one then get it.
                    // For simplicity in this mix, let's swap getItem with listTokens or something safe
                    // OR: just call createTextItem to get an ID?
                    // Let's stick to safe idempotent reads or creates.
                    result = await this.tester.listItems(1, 10);
                } else {
                    // @ts-expect-error - dynamic method access
                    result = await this.tester[action.method].call(this.tester, i);
                }

                this.collector.record(result);
            }));
        }

        await Promise.all(tasks);
        this.collector.finish();

        console.log(formatMetrics(this.collector.getSummary()));
    }
}

async function main() {
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000/api/v1';
    const token = process.env.TEST_TOKEN || process.env.API_TOKEN || 'test-token'; // Fallback for safety

    if (token === 'test-token') {
        console.warn('⚠️  Using default test-token. Ensure this is valid or set TEST_TOKEN/API_TOKEN.');
    }

    const runner = new StressTestRunner(baseUrl, token);

    // Determine configuration
    let concurrency = options.concurrency;
    let requests = options.requests;

    if (options.scenario && TEST_SCENARIOS[options.scenario]) {
        const config = TEST_SCENARIOS[options.scenario];
        concurrency = config.concurrency;
        requests = config.totalRequests;
        console.log(`Loaded scenario: ${config.name}`);
    }

    if (!concurrency || !requests) {
        console.error('Error: Must specify scenario or concurrency+requests');
        process.exit(1);
    }

    try {
        if (options.mixed) {
            await runner.runMixedScenario(concurrency, requests);
        } else if (options.endpoint) {
            await runner.runSingleEndpoint(options.endpoint, concurrency, requests);
        } else {
            // Default check
            await runner.runSingleEndpoint('healthCheck', concurrency, requests);
        }
    } catch (error) {
        console.error('Fatal error during stress test:', error);
        process.exit(1);
    }
}

// Run the main function
(async () => {
    try {
        await main();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
