/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SystemService {
    /**
     * System statistics
     * Retrieve system-wide statistics (admin only in future, currently protected by token).
     * @returns any Statistics
     * @throws ApiError
     */
    public static getStats(): CancelablePromise<{
        totalItems?: number;
        lockedItems?: number;
        unlockedItems?: number;
        byType?: {
            text?: number;
            image?: number;
        };
        avgLockDurationMinutes?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/stats',
            errors: {
                401: `Unauthorized`,
            },
        });
    }
}
