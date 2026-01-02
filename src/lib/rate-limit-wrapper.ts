import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';

type RouteHandler = (request: NextRequest, context?: unknown) => Promise<NextResponse>;

export function withRateLimit(handler: RouteHandler, limit = 100, windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)): RouteHandler {
    return async (request: NextRequest, context?: unknown) => {
        // Get client IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';

        // Determine effective limit
        // Priority: Env Var > Argument > Default
        const envLimit = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : null;
        const effectiveLimit = envLimit !== null && !isNaN(envLimit) ? envLimit : limit;

        const envWindow = process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : null;
        // Priority: Env Var > Argument > Default (handled by checkRateLimit fallback)
        // Note: we pass correct windowMs to checkRateLimit which handles its own env lookup if undefined, 
        // but here we need to be explicit if we want to override the argument 'windowMs'.
        // Actually, logic should be: if Env is set, use Env. If not, use Argument "windowMs" (which defaults to 60k).
        const effectiveWindowMs = envWindow !== null && !isNaN(envWindow) ? envWindow : windowMs;

        // Bypass if limit is 0 or negative
        if (effectiveLimit <= 0) {
            return handler(request, context);
        }

        const result = await checkRateLimit(ip, effectiveLimit, effectiveWindowMs);

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
