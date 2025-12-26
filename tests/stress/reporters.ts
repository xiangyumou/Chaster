/**
 * HTML and JSON report generators for stress test results
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { MetricsSummary } from './metrics.js';

export interface TestReport {
    timestamp: string;
    scenario: string;
    baseUrl: string;
    metrics: MetricsSummary;
    passed: boolean;
}

export class ReportGenerator {
    private reportsDir: string;

    constructor(reportsDir: string = './stress-reports') {
        this.reportsDir = reportsDir;
        try {
            mkdirSync(reportsDir, { recursive: true });
        } catch (e) {
            // Directory already exists
        }
    }

    generateJSON(report: TestReport): string {
        const filename = `stress-test-${Date.now()}.json`;
        const filepath = join(this.reportsDir, filename);

        writeFileSync(filepath, JSON.stringify(report, null, 2));

        return filepath;
    }

    generateHTML(report: TestReport): string {
        const filename = `stress-test-${Date.now()}.html`;
        const filepath = join(this.reportsDir, filename);

        const html = this.createHTML(report);
        writeFileSync(filepath, html);

        return filepath;
    }

    private createHTML(report: TestReport): string {
        const { metrics } = report;
        const passIcon = report.passed ? '✅' : '❌';
        const statusColor = report.passed ? '#10b981' : '#ef4444';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stress Test Report - ${report.scenario}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            padding: 2rem;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 2rem;
            border-radius: 1rem;
            margin-bottom: 2rem;
        }
        .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        .header p { opacity: 0.9; }
        .meta {
            background: #1e293b;
            padding: 1.5rem;
            border-radius: 0.5rem;
            margin-bottom: 2rem;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        .meta-item { }
        .meta-item label { 
            display: block;
            font-size: 0.875rem;
            color: #94a3b8;
            margin-bottom: 0.25rem;
        }
        .meta-item value { 
            font-size: 1.125rem;
            font-weight: 600;
        }
        .status {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 2rem;
            background: ${statusColor};
            color: white;
            font-weight: 600;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .card {
            background: #1e293b;
            padding: 1.5rem;
            border-radius: 0.75rem;
            border: 1px solid #334155;
        }
        .card h3 {
            font-size: 1.25rem;
            margin-bottom: 1rem;
            color: #818cf8;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            padding: 0.75rem 0;
            border-bottom: 1px solid #334155;
        }
        .metric:last-child { border-bottom: none; }
        .metric-label { color: #94a3b8; }
        .metric-value { font-weight: 600; font-size: 1.125rem; }
        .metric-value.good { color: #10b981; }
        .metric-value.warn { color: #f59e0b; }
        .metric-value.bad { color: #ef4444; }
        .endpoint-table {
            width: 100%;
            background: #1e293b;
            border-radius: 0.75rem;
            overflow: hidden;
            margin-bottom: 2rem;
        }
        .endpoint-table th {
            background: #334155;
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            color: #818cf8;
        }
        .endpoint-table td {
            padding: 1rem;
            border-top: 1px solid #334155;
        }
        .checks {
            background: #1e293b;
            padding: 1.5rem;
            border-radius: 0.75rem;
        }
        .checks h3 { margin-bottom: 1rem; color: #818cf8; }
        .check-item {
            display: flex;
            align-items: center;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            background: #0f172a;
            border-radius: 0.5rem;
        }
        .check-icon {
            font-size: 1.5rem;
            margin-right: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${passIcon} Stress Test Report</h1>
            <p>${report.scenario}</p>
        </div>
        
        <div class="meta">
            <div class="meta-item">
                <label>Timestamp</label>
                <value>${report.timestamp}</value>
            </div>
            <div class="meta-item">
                <label>Base URL</label>
                <value>${report.baseUrl}</value>
            </div>
            <div class="meta-item">
                <label>Status</label>
                <span class="status">${report.passed ? 'PASSED' : 'FAILED'}</span>
            </div>
            <div class="meta-item">
                <label>Total Requests</label>
                <value>${metrics.totalRequests}</value>
            </div>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>📊 Overall Performance</h3>
                <div class="metric">
                    <span class="metric-label">Success Rate</span>
                    <span class="metric-value ${metrics.successRate >= 0.99 ? 'good' : 'warn'}">
                        ${(metrics.successRate * 100).toFixed(2)}%
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Availability</span>
                    <span class="metric-value ${metrics.availability >= 99.9 ? 'good' : 'warn'}">
                        ${metrics.availability.toFixed(3)}%
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Throughput</span>
                    <span class="metric-value">${metrics.requestsPerSecond.toFixed(2)} req/s</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Duration</span>
                    <span class="metric-value">${(metrics.totalDuration / 1000).toFixed(2)}s</span>
                </div>
            </div>
            
            <div class="card">
                <h3>⏱️ Latency Distribution</h3>
                <div class="metric">
                    <span class="metric-label">Min</span>
                    <span class="metric-value">${metrics.minLatency.toFixed(0)}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Average</span>
                    <span class="metric-value">${metrics.avgLatency.toFixed(0)}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">P50 (Median)</span>
                    <span class="metric-value">${metrics.p50Latency.toFixed(0)}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">P95</span>
                    <span class="metric-value ${metrics.p95Latency < 500 ? 'good' : 'warn'}">
                        ${metrics.p95Latency.toFixed(0)}ms
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">P99</span>
                    <span class="metric-value ${metrics.p99Latency < 1000 ? 'good' : 'warn'}">
                        ${metrics.p99Latency.toFixed(0)}ms
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Max</span>
                    <span class="metric-value">${metrics.maxLatency.toFixed(0)}ms</span>
                </div>
            </div>
            
            <div class="card">
                <h3>📈 Request Status</h3>
                <div class="metric">
                    <span class="metric-label">Success</span>
                    <span class="metric-value good">${metrics.successCount}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Failed</span>
                    <span class="metric-value ${metrics.failureCount > 0 ? 'bad' : 'good'}">
                        ${metrics.failureCount}
                    </span>
                </div>
                ${Object.entries(metrics.errorsByStatus).map(([status, count]) => `
                <div class="metric">
                    <span class="metric-label">HTTP ${status}</span>
                    <span class="metric-value bad">${count}</span>
                </div>
                `).join('')}
                ${metrics.timeoutCount > 0 ? `
                <div class="metric">
                    <span class="metric-label">Timeouts</span>
                    <span class="metric-value bad">${metrics.timeoutCount}</span>
                </div>
                ` : ''}
            </div>
        </div>
        
        ${Object.keys(metrics.byEndpoint).length > 1 ? `
        <table class="endpoint-table">
            <thead>
                <tr>
                    <th>Endpoint</th>
                    <th>Requests</th>
                    <th>Success Rate</th>
                    <th>Avg Latency</th>
                    <th>P95 Latency</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(metrics.byEndpoint).map(([endpoint, em]) => `
                <tr>
                    <td>${endpoint}</td>
                    <td>${em.requests}</td>
                    <td>${((em.successes / em.requests) * 100).toFixed(1)}%</td>
                    <td>${em.avgLatency.toFixed(0)}ms</td>
                    <td>${em.p95Latency.toFixed(0)}ms</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
        
        <div class="checks">
            <h3>✅ Success Criteria</h3>
            ${this.generateCheckItem('Success Rate ≥ 99%', metrics.successRate >= 0.99)}
            ${this.generateCheckItem('P95 Latency < 500ms', metrics.p95Latency < 500)}
            ${this.generateCheckItem('P99 Latency < 1000ms', metrics.p99Latency < 1000)}
            ${this.generateCheckItem('Availability ≥ 99.9%', metrics.availability >= 99.9)}
        </div>
    </div>
</body>
</html>`;
    }

    private generateCheckItem(label: string, passed: boolean): string {
        const icon = passed ? '✅' : '❌';
        return `
            <div class="check-item">
                <span class="check-icon">${icon}</span>
                <span>${label}</span>
            </div>
        `;
    }
}
