// API Authentication Middleware
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export interface AuthContext {
    token: string;
    tokenName: string;
}

/**
 * Authenticate API request using Bearer token
 * Returns authenticated context or error response
 */
export async function authenticate(
    request: NextRequest
): Promise<{ data: AuthContext } | { error: NextResponse }> {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            error: NextResponse.json(
                {
                    error: {
                        code: 'MISSING_TOKEN',
                        message: 'Missing or invalid Authorization header. Use: Authorization: Bearer <token>',
                    },
                },
                { status: 401 }
            ),
        };
    }

    const token = authHeader.substring(7).trim(); // Remove 'Bearer ' prefix and trim whitespace
    const validToken = process.env.API_TOKEN?.trim(); // Trim expected token

    if (!validToken) {
        console.error('API_TOKEN env var is missing');
        return {
            error: NextResponse.json({ error: { code: 'CONFIG_ERROR', message: 'Server configuration error' } }, { status: 500 })
        };
    }

    // DEBUG: Temporary logs
    // console.log(`Auth Debug: Received=${token.length} chars, Valid=${validToken.length} chars`);
    // console.log(`Auth Debug: Received="${token}", Valid="${validToken}"`);

    if (token.length !== validToken.length) {
        console.warn(`Auth Failed: Length mismatch. Received=${token.length}, Expected=${validToken.length}`);
        return {
            error: NextResponse.json(
                {
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Invalid API token format',
                    },
                },
                { status: 401 }
            ),
        };
    }

    // Validate token against environment variable
    const expectedToken = validToken;

    if (!expectedToken) {
        console.error('API_TOKEN environment variable is not set');
        return {
            error: NextResponse.json(
                {
                    error: {
                        code: 'SERVER_MISCONFIGURED',
                        message: 'Server authentication is not configured',
                    },
                },
                { status: 500 }
            ),
        };
    }

    // Use timing-safe comparison to prevent timing attacks
    const tokenBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(expectedToken);

    if (tokenBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
        return {
            error: NextResponse.json(
                {
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Invalid API token',
                    },
                },
                { status: 401 }
            ),
        };
    }

    return {
        data: {
            token: token,
            tokenName: 'API Token',
        },
    };
}

/**
 * Standardized error response format
 */
export function errorResponse(code: string, message: string, status: number = 400) {
    return NextResponse.json(
        {
            error: {
                code,
                message,
            },
        },
        { status }
    );
}

/**
 * Standardized success response format
 */
export function successResponse<T>(data: T, status: number = 200) {
    return NextResponse.json(data, { status });
}
