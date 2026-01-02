import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';

type RouteHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

export function withRateLimit(handler: RouteHandler, limit = 100, windowMs = 60000): RouteHandler {
    return async (request: NextRequest, context?: any) => {
        // Get client IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';

        // Determine effective limit
        // Priority: Env Var > Argument > Default
        const envLimit = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : null;
        const effectiveLimit = envLimit !== null && !isNaN(envLimit) ? envLimit : limit;

        // Bypass if limit is 0 or negative
        if (effectiveLimit <= 0) {
            return handler(request, context);
        }

        const result = await checkRateLimit(ip, effectiveLimit, windowMs);

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
                        'X-RateLimit-Limit': effectiveLimit.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
                    },
                }
            );
        }

        // Call handler
        const response = await handler(request, context);

        // Add headers to response
        if (response) {
            response.headers.set('X-RateLimit-Limit', effectiveLimit.toString());
            response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
            response.headers.set('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
        }

        return response;
    };
}
