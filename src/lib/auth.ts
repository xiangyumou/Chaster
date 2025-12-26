// API Authentication Middleware
import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from './prisma';

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

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
        return {
            error: NextResponse.json(
                {
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Token is empty',
                    },
                },
                { status: 401 }
            ),
        };
    }

    // Validate token against database
    const prisma = getPrismaClient();

    try {
        const apiToken = await prisma.apiToken.findUnique({
            where: { token },
        });

        if (!apiToken) {
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

        if (!apiToken.isActive) {
            return {
                error: NextResponse.json(
                    {
                        error: {
                            code: 'TOKEN_DISABLED',
                            message: 'This API token has been disabled',
                        },
                    },
                    { status: 401 }
                ),
            };
        }

        // Update last used timestamp (async, don't wait)
        prisma.apiToken
            .update({
                where: { token },
                data: { lastUsedAt: BigInt(Date.now()) },
            })
            .catch((err) => console.error('Failed to update token lastUsedAt:', err));

        return {
            data: {
                token: apiToken.token,
                tokenName: apiToken.name,
            },
        };
    } catch (error) {
        console.error('Authentication error:', error);
        return {
            error: NextResponse.json(
                {
                    error: {
                        code: 'INTERNAL_ERROR',
                        message: 'Authentication failed',
                    },
                },
                { status: 500 }
            ),
        };
    }
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
