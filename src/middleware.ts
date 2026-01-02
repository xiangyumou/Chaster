import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';

export function middleware(request: NextRequest) {
    // Only apply rate limiting to API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
        // Get client IP from headers (fallback to 127.0.0.1 for local development)
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';

        // Apply rate limiting: 100 requests per minute
        const result = checkRateLimit(ip, 100, 60000);

        if (!result.allowed) {
            return NextResponse.json(
                {
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: 'Too many requests. Please try again later.',
                    },
                },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': '100',
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
                    },
                }
            );
        }

        // Add rate limit headers to successful responses
        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', '100');
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
        response.headers.set('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
