import { Options } from 'swagger-jsdoc';

export const swaggerOptions: Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Chaster Service API',
            version: '1.0.0',
            description: 'Foundational time-lock encryption service API',
            contact: {
                name: 'Chaster Support',
            },
        },
        servers: [
            {
                url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/api/v1',
                description: 'API Server',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT', // It's opaque in our case but bearer format indicates usage
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string' },
                                message: { type: 'string' },
                            },
                        },
                    },
                },
                Item: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        type: { type: 'string', enum: ['text', 'image'] },
                        originalName: { type: 'string', nullable: true },
                        content: { type: 'string', description: 'Available only when unlocked' },
                        decryptAt: { type: 'integer', format: 'int64' },
                        createdAt: { type: 'integer', format: 'int64' },
                        layerCount: { type: 'integer' },
                        unlocked: { type: 'boolean' },
                        metadata: { type: 'object', nullable: true },
                        timeRemainingMs: { type: 'integer', description: 'Milliseconds until decryption possible' },
                    },
                },
                ItemInput: {
                    type: 'object',
                    required: ['type', 'content'],
                    properties: {
                        type: { type: 'string', enum: ['text', 'image'] },
                        content: { type: 'string' },
                        durationMinutes: { type: 'integer', minimum: 1 },
                        decryptAt: { type: 'integer', format: 'int64' },
                        metadata: { type: 'object' },
                    },
                },
            },
        },
        security: [
            {
                BearerAuth: [],
            },
        ],
    },
    apis: [process.cwd() + '/src/app/api/v1/**/*.ts'], // Ensure absolute path for Next.js
};
