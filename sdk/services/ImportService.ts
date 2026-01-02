/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ImportService {
    /**
     * Import items
     * Import items from a backup. Supports conflict resolution strategies.
     * @returns any Import result
     * @throws ApiError
     */
    public static postImportItems({
        requestBody,
    }: {
        requestBody: {
            items: Array<{
                /**
                 * Original item ID (optional, will generate new if not provided)
                 */
                id?: string;
                type: 'text' | 'image';
                encryptedData: string;
                decryptAt: number;
                roundNumber: number;
                createdAt?: number;
                layerCount?: number;
                metadata?: Record<string, any>;
            }>;
            /**
             * How to handle ID conflicts
             */
            conflictStrategy?: 'skip' | 'overwrite' | 'error';
        },
    }): CancelablePromise<{
        imported?: number;
        skipped?: number;
        overwritten?: number;
        errors?: Array<Record<string, any>>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/import/items',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation error or conflict`,
                401: `Unauthorized`,
            },
        });
    }
}
