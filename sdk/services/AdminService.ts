/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminService {
    /**
     * Get config by key
     * Retrieve a specific configuration value.
     * @returns any Config value
     * @throws ApiError
     */
    public static getAdminConfig({
        key,
    }: {
        key: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/config/{key}',
            path: {
                'key': key,
            },
            errors: {
                401: `Unauthorized`,
                404: `Config not found`,
            },
        });
    }
    /**
     * Update config
     * Update a specific configuration value.
     * @returns any Config updated
     * @throws ApiError
     */
    public static putAdminConfig({
        key,
        requestBody,
    }: {
        key: string,
        requestBody: {
            value: string;
        },
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/admin/config/{key}',
            path: {
                'key': key,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Delete config
     * Delete a configuration key.
     * @returns any Config deleted
     * @throws ApiError
     */
    public static deleteAdminConfig({
        key,
    }: {
        key: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/admin/config/{key}',
            path: {
                'key': key,
            },
            errors: {
                401: `Unauthorized`,
                404: `Config not found`,
            },
        });
    }
    /**
     * Get all system config
     * Retrieve all system configuration key-value pairs.
     * @returns any Configuration object
     * @throws ApiError
     */
    public static getAdminConfig1(): CancelablePromise<{
        config?: Record<string, any>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/config',
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Create or update config
     * Set a system configuration value.
     * @returns any Config saved
     * @throws ApiError
     */
    public static postAdminConfig({
        requestBody,
    }: {
        requestBody: {
            key: string;
            value: string;
        },
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/admin/config',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Create database backup
     * Trigger a database backup. For PostgreSQL, use pg_dump externally or
     * configure automated backups via your hosting provider.
     * This endpoint returns guidance on backup options.
     *
     * @returns any Backup guidance
     * @throws ApiError
     */
    public static postAdminDbBackup(): CancelablePromise<{
        message?: string;
        options?: Array<string>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/admin/db/backup',
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Get database info
     * Get information about the database including type and record counts.
     * @returns any Database information
     * @throws ApiError
     */
    public static getAdminDbInfo(): CancelablePromise<{
        type?: string;
        itemCount?: number;
        tokenCount?: number;
        logCount?: number;
        configCount?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/db/info',
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Vacuum database
     * Run PostgreSQL VACUUM ANALYZE to optimize the database.
     * @returns any Vacuum completed
     * @throws ApiError
     */
    public static postAdminDbVacuum(): CancelablePromise<{
        success?: boolean;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/admin/db/vacuum',
            errors: {
                401: `Unauthorized`,
                500: `Vacuum failed`,
            },
        });
    }
    /**
     * Query API logs
     * Query API call logs with various filters.
     * @returns any List of logs
     * @throws ApiError
     */
    public static getAdminLogs({
        token,
        endpoint,
        method,
        statusCode,
        startTime,
        endTime,
        limit = 100,
        offset,
    }: {
        /**
         * Filter by token
         */
        token?: string,
        /**
         * Filter by endpoint (partial match)
         */
        endpoint?: string,
        method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        statusCode?: number,
        /**
         * Logs after this timestamp
         */
        startTime?: number,
        /**
         * Logs before this timestamp
         */
        endTime?: number,
        limit?: number,
        offset?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/logs',
            query: {
                'token': token,
                'endpoint': endpoint,
                'method': method,
                'statusCode': statusCode,
                'startTime': startTime,
                'endTime': endTime,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Delete API logs
     * Delete API logs matching criteria.
     * @returns any Deletion result
     * @throws ApiError
     */
    public static deleteAdminLogs({
        requestBody,
    }: {
        requestBody?: {
            /**
             * Delete logs before this timestamp
             */
            beforeTimestamp?: number;
            /**
             * Delete logs for this token
             */
            token?: string;
        },
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/admin/logs',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
            },
        });
    }
}
