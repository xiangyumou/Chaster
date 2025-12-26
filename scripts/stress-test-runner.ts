#!/usr/bin/env node
/**
 * Test Runner - Executes multiple stress test scenarios and generates reports
 */

import { execSync } from 'child_process';
import { ReportGenerator, TestReport } from '../tests/stress/reporters.js';
import type { MetricsSummary } from '../tests/stress/metrics.js';

interface ScenarioRun {
    name: string;
    args: string[];
}

const SCENARIOS: ScenarioRun[] = [
    {
        name: 'Health Check',
        args: ['--endpoint', 'healthCheck', '--concurrency', '100', '--requests', '200']
    },
    {
        name: 'Stats API',
        args: ['--endpoint', 'getStats', '--concurrency', '100', '--requests', '200']
    },
    {
        name: 'List Items',
        args: ['--endpoint', 'listItems', '--concurrency', '100', '--requests', '200']
    },
    {
        name: 'Create Text Items',
        args: ['--endpoint', 'createTextItem', '--concurrency', '50', '--requests', '100']
    },
    {
        name: 'Mixed Workload - Basic',
        args: ['--mixed', '--scenario', 'basic']
    },
    {
        name: 'Mixed Workload - High',
        args: ['--mixed', '--scenario', 'high']
    }
];

async function runScenario(scenario: ScenarioRun): Promise<{ success: boolean; output: string }> {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🎯 Running: ${scenario.name}`);
    console.log(`${'='.repeat(70)}`);

    try {
        const argsStr = scenario.args.join(' ');
        const cmd = `tsx scripts/stress-test-comprehensive.ts ${argsStr}`;

        const output = execSync(cmd, {
            encoding: 'utf-8',
            env: process.env,
            stdio: 'pipe'
        });

        console.log(output);
        return { success: true, output };

    } catch (error: any) {
        console.error(`❌ Scenario failed: ${scenario.name}`);
        console.error(error.stdout || error.message);
        return { success: false, output: error.stdout || error.message };
    }
}

async function main() {
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3002/api/v1';
    const token = process.env.TEST_TOKEN || '';

    if (!token) {
        console.error('❌ ERROR: TEST_TOKEN environment variable is required');
        console.error('\nExport your token first:');
        console.error('  export TEST_TOKEN=your_token_here');
        console.error('  npm run stress:all');
        process.exit(1);
    }

    console.log('🚀 Chaster Complete Stress Test Suite');
    console.log('━'.repeat(70));
    console.log(`📅 Started: ${new Date().toISOString()}`);
    console.log(`🌐 Target: ${baseUrl}`);
    console.log(`📋 Scenarios: ${SCENARIOS.length}`);
    console.log('━'.repeat(70));

    const results: Array<{ scenario: string; success: boolean }> = [];
    const startTime = Date.now();

    for (const scenario of SCENARIOS) {
        const result = await runScenario(scenario);
        results.push({
            scenario: scenario.name,
            success: result.success
        });

        // Small delay between scenarios
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Summary
    console.log('\n\n');
    console.log('━'.repeat(70));
    console.log('📊 FINAL SUMMARY');
    console.log('━'.repeat(70));
    console.log(`⏱️  Total Duration: ${duration}s`);
    console.log(`✅ Passed: ${results.filter(r => r.success).length}/${results.length}`);
    console.log(`❌ Failed: ${results.filter(r => !r.success).length}/${results.length}`);
    console.log('');

    results.forEach(r => {
        const icon = r.success ? '✅' : '❌';
        console.log(`  ${icon} ${r.scenario}`);
    });

    console.log('━'.repeat(70));

    const allPassed = results.every(r => r.success);

    if (allPassed) {
        console.log('\n🎉 All stress tests passed!');
        console.log('✨ System is performing well under load');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed');
        console.log('🔍 Review the logs above for details');
        process.exit(1);
    }
}

main();
