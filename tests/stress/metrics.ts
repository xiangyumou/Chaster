/**
 * Metrics collection and calculation utilities for stress testing
 */

export interface RequestResult {
    success: boolean;
    status: number;
    duration: number;
    endpoint: string;
    error?: any;
    timestamp: number;
}

export interface MetricsSummary {
    totalRequests: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    availability: number;

    // Latency metrics (ms)
    avgLatency: number;
    minLatency: number;
    maxLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;

    // Throughput
    totalDuration: number;
    requestsPerSecond: number;

    // Error breakdown
    errorsByStatus: Record<number, number>;
    timeoutCount: number;

    // Endpoint breakdown
    byEndpoint: Record<string, EndpointMetrics>;
}

export interface EndpointMetrics {
    requests: number;
    successes: number;
    failures: number;
    avgLatency: number;
    p95Latency: number;
}

export class MetricsCollector {
    private results: RequestResult[] = [];
    private startTime: number = 0;
    private endTime: number = 0;

    start() {
        this.startTime = Date.now();
        this.results = [];
    }

    record(result: RequestResult) {
        this.results.push(result);
    }

    finish() {
        this.endTime = Date.now();
    }

    getSummary(): MetricsSummary {
        const totalRequests = this.results.length;
        const successCount = this.results.filter(r => r.success).length;
        const failureCount = totalRequests - successCount;
        const successRate = totalRequests > 0 ? successCount / totalRequests : 0;

        // Calculate latencies
        const durations = this.results.map(r => r.duration).sort((a, b) => a - b);
        const avgLatency = durations.reduce((sum, d) => sum + d, 0) / durations.length || 0;
        const minLatency = durations[0] || 0;
        const maxLatency = durations[durations.length - 1] || 0;
        const p50Latency = this.percentile(durations, 50);
        const p95Latency = this.percentile(durations, 95);
        const p99Latency = this.percentile(durations, 99);

        // Calculate throughput
        const totalDuration = this.endTime - this.startTime;
        const requestsPerSecond = totalDuration > 0 ? (totalRequests / totalDuration) * 1000 : 0;

        // Error breakdown
        const errorsByStatus: Record<number, number> = {};
        let timeoutCount = 0;

        this.results.forEach(r => {
            if (!r.success) {
                if (r.status === 0) {
                    timeoutCount++;
                } else {
                    errorsByStatus[r.status] = (errorsByStatus[r.status] || 0) + 1;
                }
            }
        });

        // Endpoint breakdown
        const byEndpoint: Record<string, EndpointMetrics> = {};
        const endpointResults: Record<string, RequestResult[]> = {};

        this.results.forEach(r => {
            if (!endpointResults[r.endpoint]) {
                endpointResults[r.endpoint] = [];
            }
            endpointResults[r.endpoint].push(r);
        });

        Object.entries(endpointResults).forEach(([endpoint, results]) => {
            const successes = results.filter(r => r.success).length;
            const latencies = results.map(r => r.duration).sort((a, b) => a - b);

            byEndpoint[endpoint] = {
                requests: results.length,
                successes,
                failures: results.length - successes,
                avgLatency: latencies.reduce((sum, d) => sum + d, 0) / latencies.length || 0,
                p95Latency: this.percentile(latencies, 95)
            };
        });

        // Availability: percentage of time system was responding successfully
        const availability = successRate * 100;

        return {
            totalRequests,
            successCount,
            failureCount,
            successRate,
            availability,
            avgLatency,
            minLatency,
            maxLatency,
            p50Latency,
            p95Latency,
            p99Latency,
            totalDuration,
            requestsPerSecond,
            errorsByStatus,
            timeoutCount,
            byEndpoint
        };
    }

    getResults(): RequestResult[] {
        return this.results;
    }

    private percentile(sorted: number[], p: number): number {
        if (sorted.length === 0) return 0;
        const index = Math.ceil((sorted.length * p) / 100) - 1;
        return sorted[Math.max(0, index)];
    }
}

export function formatMetrics(metrics: MetricsSummary): string {
    const lines: string[] = [];

    lines.push('\n📊 Test Results Summary');
    lines.push('='.repeat(60));

    // Overall stats
    lines.push('\n🎯 Overall Performance:');
    lines.push(`  Total Requests: ${metrics.totalRequests}`);
    lines.push(`  Success Rate: ${metrics.successCount}/${metrics.totalRequests} (${(metrics.successRate * 100).toFixed(2)}%)`);
    lines.push(`  Availability: ${metrics.availability.toFixed(3)}%`);
    lines.push(`  Duration: ${(metrics.totalDuration / 1000).toFixed(2)}s`);
    lines.push(`  Throughput: ${metrics.requestsPerSecond.toFixed(2)} req/s`);

    // Latency stats
    lines.push('\n⏱️  Latency Distribution:');
    lines.push(`  Min: ${metrics.minLatency.toFixed(0)}ms`);
    lines.push(`  Avg: ${metrics.avgLatency.toFixed(0)}ms`);
    lines.push(`  P50: ${metrics.p50Latency.toFixed(0)}ms`);
    lines.push(`  P95: ${metrics.p95Latency.toFixed(0)}ms`);
    lines.push(`  P99: ${metrics.p99Latency.toFixed(0)}ms`);
    lines.push(`  Max: ${metrics.maxLatency.toFixed(0)}ms`);

    // Errors
    if (metrics.failureCount > 0) {
        lines.push('\n❌ Errors:');
        if (metrics.timeoutCount > 0) {
            lines.push(`  Timeouts: ${metrics.timeoutCount}`);
        }
        Object.entries(metrics.errorsByStatus).forEach(([status, count]) => {
            lines.push(`  HTTP ${status}: ${count}`);
        });
    }

    // Endpoint breakdown
    if (Object.keys(metrics.byEndpoint).length > 1) {
        lines.push('\n📦 By Endpoint:');
        Object.entries(metrics.byEndpoint).forEach(([endpoint, em]) => {
            const rate = (em.successes / em.requests * 100).toFixed(1);
            lines.push(`  ${endpoint}:`);
            lines.push(`    Success: ${em.successes}/${em.requests} (${rate}%)`);
            lines.push(`    Latency: avg=${em.avgLatency.toFixed(0)}ms, p95=${em.p95Latency.toFixed(0)}ms`);
        });
    }

    // Pass/Fail assessment
    lines.push('\n✅ Success Criteria:');
    const checks = [
        { name: 'Success Rate ≥ 99%', pass: metrics.successRate >= 0.99 },
        { name: 'P95 Latency < 500ms', pass: metrics.p95Latency < 500 },
        { name: 'P99 Latency < 1000ms', pass: metrics.p99Latency < 1000 },
        { name: 'Availability ≥ 99.9%', pass: metrics.availability >= 99.9 }
    ];

    checks.forEach(check => {
        const icon = check.pass ? '✅' : '❌';
        lines.push(`  ${icon} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);
    lines.push('');
    lines.push(allPassed ? '🎉 All checks passed!' : '⚠️  Some checks failed');
    lines.push('='.repeat(60));

    return lines.join('\n');
}
