/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ItemInput = {
    properties: {
        type: {
            type: 'Enum',
            isRequired: true,
        },
        content: {
            type: 'string',
            isRequired: true,
        },
        durationMinutes: {
            type: 'number',
            minimum: 1,
        },
        decryptAt: {
            type: 'number',
            format: 'int64',
        },
        metadata: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
    },
} as const;
