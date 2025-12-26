import { NextResponse } from 'next/server';

/**
 * GET /api/health - Health check endpoint (no authentication required)
 */
export async function GET() {
    const packageJson = require('../../../../package.json');

    return NextResponse.json({
        status: 'ok',
        version: packageJson.version,
        uptime: process.uptime(),
        timestamp: Date.now(),
    });
}
