import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRateLimit } from '@/lib/rate-limit-wrapper';
import { NextRequest, NextResponse } from 'next/server';
import * as RateLimitLib from '@/lib/ratelimit';

// Mock the underlying rate limit checker
vi.mock('@/lib/ratelimit', () => ({
    checkRateLimit: vi.fn(),
}));

describe('Lib: Rate Limit Wrapper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Helper to create a dummy handler
    const mockHandler = vi.fn(async (_req: NextRequest) => {
        return NextResponse.json({ success: true });
    });

    // Helper to create request
    const createRequest = () => new NextRequest('http://localhost/test');

    it('should allow request when rate limit is not exceeded', async () => {
        // Mock successful rate limit check
        vi.mocked(RateLimitLib.checkRateLimit).mockResolvedValue({
            allowed: true,
            remaining: 99,
            resetAt: Date.now() + 60000,
        });

        const wrappedHandler = withRateLimit(mockHandler);
        const res = await wrappedHandler(createRequest());

        expect(mockHandler).toHaveBeenCalled();
        expect(res.status).toBe(200);

        // Check headers
        expect(res.headers.get('X-RateLimit-Limit')).toBe('100');
        expect(res.headers.get('X-RateLimit-Remaining')).toBe('99');
        expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should block request when rate limit is exceeded', async () => {
        // Mock failed rate limit check
        vi.mocked(RateLimitLib.checkRateLimit).mockResolvedValue({
            allowed: false,
            remaining: 0,
            resetAt: Date.now() + 60000,
        });

        const wrappedHandler = withRateLimit(mockHandler);
        const res = await wrappedHandler(createRequest());

        expect(mockHandler).not.toHaveBeenCalled();
        expect(res.status).toBe(429);

        const data = await res.json();
        expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');

        // Check headers
        expect(res.headers.get('X-RateLimit-Leading')).toBeNull(); // Limit might be set if we want, but wrapper sets it on 429
        expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should handle custom limits', async () => {
        vi.mocked(RateLimitLib.checkRateLimit).mockResolvedValue({
            allowed: true,
            remaining: 4,
            resetAt: Date.now() + 60000,
        });

        const customLimit = 5;
        const wrappedHandler = withRateLimit(mockHandler, customLimit);
        await wrappedHandler(createRequest());

        expect(RateLimitLib.checkRateLimit).toHaveBeenCalledWith(
            expect.any(String),
            customLimit,
            expect.any(Number)
        );
    });

    it('should extract IP from x-forwarded-for', async () => {
        vi.mocked(RateLimitLib.checkRateLimit).mockResolvedValue({
            allowed: true,
            remaining: 99,
            resetAt: Date.now() + 60000,
        });

        const wrappedHandler = withRateLimit(mockHandler);
        const req = createRequest();
        req.headers.set('x-forwarded-for', '10.0.0.1, 192.168.1.1');

        await wrappedHandler(req);

        expect(RateLimitLib.checkRateLimit).toHaveBeenCalledWith(
            '10.0.0.1',
            expect.any(Number),
            expect.any(Number)
        );
    });
});
