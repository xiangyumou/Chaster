// API Authentication Middleware
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export interface AuthContext {
    token: string;
    tokenName: string;
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
    return `req_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
}

/**
 * Error details for validation errors
 */
export interface ValidationErrorDetail {
    field: string;
    message: string;
}

/**
 * Authenticate API request using Bearer token
 * Returns authenticated context or error response
 */
export async function authenticate(
    request: NextRequest
): Promise<{ data: AuthContext } | { error: NextResponse }> {
    const authHeader = request.headers.get('authorization');
    const requestId = generateRequestId();

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            error: NextResponse.json(
                {
                    error: {
                        code: 'MISSING_TOKEN',
                        message: 'Missing or invalid Authorization header. Use: Authorization: Bearer <token>',
                    },
                },
                {
                    status: 401,
                    headers: { 'X-Request-Id': requestId }
                }
            ),
        };
    }

    const token = authHeader.substring(7).trim(); // Remove 'Bearer ' prefix and trim whitespace
    const validToken = process.env.API_TOKEN?.trim(); // Trim expected token

    if (!validToken) {
        console.error('API_TOKEN env var is missing');
        return {
            error: NextResponse.json(
                { error: { code: 'CONFIG_ERROR', message: 'Server configuration error' } },
                {
                    status: 500,
                    headers: { 'X-Request-Id': requestId }
                }
            )
        };
    }

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
                {
                    status: 401,
                    headers: { 'X-Request-Id': requestId }
                }
            ),
        };
    }

    // Use timing-safe comparison to prevent timing attacks
    const tokenBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(validToken);

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
                {
                    status: 401,
                    headers: { 'X-Request-Id': requestId }
                }
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
 * Standardized error response format with X-Request-Id header
 */
export function errorResponse(
    code: string,
    message: string,
    status: number = 400,
    details?: ValidationErrorDetail[]
) {
    const requestId = generateRequestId();
    const errorBody: { code: string; message: string; details?: ValidationErrorDetail[] } = {
        code,
        message,
    };

    if (details && details.length > 0) {
        errorBody.details = details;
    }

    return NextResponse.json(
        { error: errorBody },
        {
            status,
            headers: { 'X-Request-Id': requestId }
        }
    );
}

/**
 * Create validation error details from Zod error
 */
export function zodErrorToDetails(zodError: { issues: Array<{ path: PropertyKey[]; message: string }> }): ValidationErrorDetail[] {
    return zodError.issues.map(issue => ({
        field: issue.path.map(p => String(p)).join('.'),
        message: issue.message,
    }));
}

/**
 * Standardized success response format with X-Request-Id header
 */
export function successResponse<T>(data: T, status: number = 200) {
    const requestId = generateRequestId();
    return NextResponse.json(data, {
        status,
        headers: { 'X-Request-Id': requestId }
    });
}
