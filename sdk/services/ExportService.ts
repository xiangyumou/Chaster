/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ExportService {
    /**
     * Export all items
     * Export all items in various formats. Supports filtering and optional content decryption.
     * @returns any Exported data
     * @throws ApiError
     */
    public static getExportItems({
        format = 'json',
        includeContent = false,
        status = 'all',
        includeEncryptedData = true,
    }: {
        /**
         * Export format
         */
        format?: 'json' | 'csv' | 'ndjson',
        /**
         * Include decrypted content for unlocked items
         */
        includeContent?: boolean,
        /**
         * Filter by lock status
         */
        status?: 'all' | 'locked' | 'unlocked',
        /**
         * Include encrypted data (for backup purposes)
         */
        includeEncryptedData?: boolean,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/export/items',
            query: {
                'format': format,
                'includeContent': includeContent,
                'status': status,
                'includeEncryptedData': includeEncryptedData,
            },
            errors: {
                401: `Unauthorized`,
            },
        });
    }
}
