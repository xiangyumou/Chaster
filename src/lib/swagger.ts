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
                url: 'http://localhost:3000/api/v1',
                description: 'Local Development Server',
            },
            {
                url: '/api/v1',
                description: 'Relative path (for production)',
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
            },
        },
        security: [
            {
                BearerAuth: [],
            },
        ],
    },
    apis: ['./src/app/api/v1/**/*.ts'], // Path to the API docs
};
