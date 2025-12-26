# Stress Testing Guide

This document explains how to run and interpret comprehensive stress tests for the Chaster API service.

## 📋 Overview

The stress testing suite evaluates the **availability** and performance of all Chaster API endpoints under various load conditions. It measures:

- ✅ **Success Rate**: Percentage of successful requests
- ⏱️ **Latency**: Response time distribution (P50, P95, P99)
- 🚀 **Throughput**: Requests per second
- 🎯 **Availability**: System uptime percentage
- ❌ **Error Rates**: Breakdown by HTTP status code

---

## 🚀 Quick Start

### Prerequisites

1. **Running server**: Ensure Chaster is running
2. **API token**: Generate a test token

```bash
# Generate a test token
npm run token create "Stress Test"

# Export the token
export TEST_TOKEN="your_token_here"

# Optionally set custom base URL (default: http://localhost:3002/api/v1)
export TEST_BASE_URL="http://localhost:3000/api/v1"
```

### Running Tests

```bash
# Basic load test (50 concurrency, 100 requests)
npm run stress:basic

# High concurrency test (200 concurrency, 500 requests)
npm run stress:high

# Extreme stress test (500 concurrency, 1000 requests)
npm run stress:extreme

# Run all scenarios sequentially
npm run stress:all
```

---

## 📊 Test Scenarios

### 1. Basic Load Test
- **Concurrency**: 50 parallel requests
- **Total Requests**: 100
- **Purpose**: Baseline performance measurement
- **Use Case**: Normal operating conditions

### 2. High Concurrency Test
- **Concurrency**: 200 parallel requests
- **Total Requests**: 500
- **Purpose**: Identify bottlenecks under high load
- **Use Case**: Peak traffic simulation

### 3. Extreme Stress Test
- **Concurrency**: 500 parallel requests
- **Total Requests**: 1000
- **Purpose**: Find breaking points and maximum capacity
- **Use Case**: Capacity planning

### 4. Mixed Workload (Realistic)
Simulates real user behavior with:
- **50%** Create operations (40% text, 10% images)
- **30%** List/Read operations
- **10%** Stats queries
- **10%** Health checks

---

## 🎯 Testing Specific Endpoints

You can test individual endpoints with custom concurrency:

```bash
# Test health check endpoint
TEST_TOKEN=xxx tsx scripts/stress-test-comprehensive.ts \
  --endpoint healthCheck \
  --concurrency 100 \
  --requests 500

# Test item creation
TEST_TOKEN=xxx tsx scripts/stress-test-comprehensive.ts \
  --endpoint createTextItem \
  --concurrency 50 \
  --requests 200

# Test stats API
TEST_TOKEN=xxx tsx scripts/stress-test-comprehensive.ts \
  --endpoint getStats \
  --concurrency 100 \
  --requests 300
```

**Available endpoints**:
- `createTextItem` - POST /api/v1/items (text)
- `createImageItem` - POST /api/v1/items (image)
- `listItems` - GET /api/v1/items
- `getStats` - GET /api/v1/stats
- `listTokens` - GET /api/v1/admin/tokens
- `healthCheck` - GET /api/health

---

## 📈 Understanding Results

### Sample Output

```
📊 Test Results Summary
============================================================

🎯 Overall Performance:
  Total Requests: 500
  Success Rate: 498/500 (99.60%)
  Availability: 99.600%
  Duration: 3.21s
  Throughput: 155.76 req/s

⏱️  Latency Distribution:
  Min: 12ms
  Avg: 145ms
  P50: 132ms
  P95: 287ms
  P99: 412ms
  Max: 589ms

✅ Success Criteria:
  ✅ Success Rate ≥ 99%
  ✅ P95 Latency < 500ms
  ✅ P99 Latency < 1000ms
  ✅ Availability ≥ 99.9%
```

### Success Criteria

Tests pass when **ALL** of the following conditions are met:

| Metric | Target | Description |
|--------|--------|-------------|
| Success Rate | ≥ 99% | At least 99% of requests succeed |
| P95 Latency | < 500ms | 95% of requests complete within 500ms |
| P99 Latency | < 1000ms | 99% of requests complete within 1s |
| Availability | ≥ 99.9% | System available 99.9% of the time |

---

## 🔧 Interpreting Metrics

### Latency Percentiles

- **P50 (Median)**: Typical user experience
- **P95**: Experience of slower requests (1 in 20)
- **P99**: Worst-case but not outliers (1 in 100)
- **Max**: Absolute worst case (may include anomalies)

### Availability Calculation

```
Availability = (Successful Requests / Total Requests) × 100%
```

99.9% availability means:
- ✅ 999 out of 1000 requests succeed
- ❌ Only 1 request fails per 1000

### Throughput

Requests per second (RPS) indicates maximum sustained load:
- **< 50 RPS**: Low capacity, may need optimization
- **50-200 RPS**: Good for small to medium deployments
- **> 200 RPS**: Excellent performance

---

## ⚠️ Common Issues

### Issue: High Failure Rate

**Symptoms**: Success rate < 99%

**Possible Causes**:
1. **SQLite Write Locks**: High concurrency on writes
2. **Server Overload**: CPU/Memory exhaustion
3. **Network Issues**: Timeouts or connection errors

**Solutions**:
```bash
# Check if WAL mode is enabled
npm run db:studio

# Reduce concurrency for SQLite
TEST_TOKEN=xxx tsx scripts/stress-test-comprehensive.ts \
  --concurrency 25 --requests 100
```

### Issue: High Latency (P95 > 500ms)

**Symptoms**: Slow responses even when successful

**Possible Causes**:
1. **Database Queries**: Unoptimized queries
2. **drand Network**: Slow roundtrip to randomness beacon
3. **CPU Bound**: Encryption/decryption overhead

**Solutions**:
- Review database indexes
- Monitor server resources during test
- Profile slow endpoints individually

### Issue: SQLITE_BUSY Errors

**Symptoms**: Errors with "database is locked"

**Context**: SQLite has limited write concurrency

**Solutions**:
```bash
# Enable WAL mode (if not already)
npm run db:migrate

# Reduce write concurrency
--concurrency 25  # Instead of 500
```

---

## 🎨 Advanced Usage

### Custom Scenarios

Create your own test profile:

```bash
TEST_TOKEN=xxx tsx scripts/stress-test-comprehensive.ts \
  --mixed \
  --concurrency 150 \
  --requests 750
```

### Generating Reports

The test runner automatically outputs to console. To save results:

```bash
npm run stress:all > stress-test-results.log 2>&1
```

### Continuous Testing

Add to CI/CD pipeline:

```yaml
# Example .github/workflows/stress-test.yml
- name: Run stress tests
  env:
    TEST_TOKEN: ${{ secrets.API_TOKEN }}
  run: npm run stress:basic
```

---

## 🏆 Performance Baselines

Expected performance on reasonable hardware (4 CPU, 8GB RAM):

| Scenario | Success Rate | P95 Latency | Throughput |
|----------|--------------|-------------|------------|
| Basic (50 conc) | 99.9%+ | < 200ms | 100-150 RPS |
| High (200 conc) | 99%+ | < 400ms | 150-250 RPS |
| Extreme (500 conc) | 95%+ | < 800ms | 200-300 RPS |

> **Note**: SQLite-based deployments may see reduced performance at extreme concurrency due to write serialization.

---

## 📝 Best Practices

### Before Testing

1. ✅ Use a dedicated test database
2. ✅ Ensure server has adequate resources
3. ✅ Stop other resource-intensive processes
4. ✅ Use production-like configuration

### During Testing

1. 📊 Monitor server metrics (CPU, Memory, Disk I/O)
2. 🔍 Watch server logs for errors
3. ⏱️ Note baseline system performance first

### After Testing

1. 🧹 Clean up test data if needed
2. 📈 Compare results with previous runs
3. 📝 Document any performance regressions

---

## 🐛 Troubleshooting

### Tests Won't Start

```bash
# Check server is running
curl http://localhost:3002/api/health

# Verify token works
curl -H "Authorization: Bearer $TEST_TOKEN" \
  http://localhost:3002/api/v1/stats
```

### Incomplete Test Results

If tests crash mid-run:
- Check server logs for OOM errors
- Reduce concurrency
- Increase server resources

### Inconsistent Results

Run multiple times and average:
```bash
for i in {1..3}; do
  echo "Run $i"
  npm run stress:basic
  sleep 5
done
```

---

## 📚 Related Documentation

- [API Reference](./API_REFERENCE.md) - API endpoint details
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production setup
- [PRD](./PRD.md) - System architecture

---

**Questions or Issues?**

If you encounter unexpected results or have questions about interpreting metrics, please open an issue on GitHub.
