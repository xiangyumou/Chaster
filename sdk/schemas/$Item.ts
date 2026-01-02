/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Item = {
    properties: {
        id: {
            type: 'string',
            format: 'uuid',
        },
        type: {
            type: 'Enum',
        },
        originalName: {
            type: 'string',
            isNullable: true,
        },
        content: {
            type: 'string',
            description: `Available only when unlocked`,
        },
        decryptAt: {
            type: 'number',
            format: 'int64',
        },
        createdAt: {
            type: 'number',
            format: 'int64',
        },
        layerCount: {
            type: 'number',
        },
        unlocked: {
            type: 'boolean',
        },
        metadata: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
            isNullable: true,
        },
        timeRemainingMs: {
            type: 'number',
            description: `Milliseconds until decryption possible`,
        },
    },
} as const;
