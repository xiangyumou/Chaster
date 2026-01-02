/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Item } from '../models/Item';
import type { ItemInput } from '../models/ItemInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ItemsService {
    /**
     * Extend item lock
     * Extend the lock duration of an item. Resulting in re-encryption.
     * @returns any Extended successfully
     * @throws ApiError
     */
    public static postItemsExtend({
        id,
        requestBody,
    }: {
        /**
         * Item ID
         */
        id: string,
        requestBody: {
            /**
             * Minutes to add to original unlock time
             */
            minutes: number;
        },
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/items/{id}/extend',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
                404: `Item not found`,
                409: `Conflict (concurrent modification)`,
            },
        });
    }
    /**
     * Update item metadata
     * Update the metadata field of an item. Supports merge or replace modes.
     * @returns any Updated item
     * @throws ApiError
     */
    public static patchItemsMetadata({
        id,
        requestBody,
    }: {
        /**
         * Item ID
         */
        id: string,
        requestBody: {
            /**
             * New metadata object
             */
            metadata: Record<string, any>;
            /**
             * If true, merge with existing metadata. If false, replace entirely.
             */
            merge?: boolean;
        },
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/items/{id}/metadata',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
                404: `Item not found`,
            },
        });
    }
    /**
     * Get item
     * Get item details. If the lock time has passed, includes the decrypted content.
     * @returns Item Item details
     * @throws ApiError
     */
    public static getItems({
        id,
    }: {
        /**
         * Item ID
         */
        id: string,
    }): CancelablePromise<Item> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/items/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Unauthorized`,
                404: `Item not found`,
            },
        });
    }
    /**
     * Delete item
     * Permanently delete an item.
     * @returns any Item deleted
     * @throws ApiError
     */
    public static deleteItems({
        id,
    }: {
        /**
         * Item ID
         */
        id: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/items/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Unauthorized`,
                404: `Item not found`,
            },
        });
    }
    /**
     * Batch delete items
     * Delete multiple items by IDs or filter criteria.
     * @returns any Deletion result
     * @throws ApiError
     */
    public static postItemsBatchDelete({
        requestBody,
    }: {
        requestBody: ({
            /**
             * List of item IDs to delete
             */
            ids: Array<string>;
        } | {
            filter: {
                status?: 'locked' | 'unlocked';
                /**
                 * Delete items created before this timestamp (ms)
                 */
                beforeDate?: number;
                /**
                 * Delete items created after this timestamp (ms)
                 */
                afterDate?: number;
                type?: 'text' | 'image';
            };
        }),
    }): CancelablePromise<{
        deletedCount?: number;
        deletedIds?: Array<string>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/items/batch/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation error`,
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Batch get items
     * Retrieve multiple items by IDs in a single request. Automatically decrypts unlocked items.
     * @returns any List of items
     * @throws ApiError
     */
    public static postItemsBatchGet({
        requestBody,
    }: {
        requestBody: {
            /**
             * List of item IDs to retrieve (max 100)
             */
            ids: Array<string>;
            /**
             * Whether to include decrypted content for unlocked items
             */
            includeContent?: boolean;
        },
    }): CancelablePromise<{
        items?: Array<Item>;
        found?: number;
        notFound?: Array<string>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/items/batch/get',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation error`,
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Batch create items
     * @returns any Items created
     * @throws ApiError
     */
    public static postItemsBatch({
        requestBody,
    }: {
        requestBody?: Array<ItemInput>,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/items/batch',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List items
     * Retrieve a paginated list of encrypted items.
     * @returns any List of items
     * @throws ApiError
     */
    public static getItems1({
        status = 'all',
        type,
        limit = 50,
        offset,
    }: {
        /**
         * Filter by lock status
         */
        status?: 'all' | 'locked' | 'unlocked',
        /**
         * Filter by content type
         */
        type?: 'text' | 'image',
        /**
         * Max items to return
         */
        limit?: number,
        /**
         * Pagination offset
         */
        offset?: number,
    }): CancelablePromise<{
        items?: Array<Item>;
        total?: number;
        limit?: number;
        offset?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/items',
            query: {
                'status': status,
                'type': type,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Unauthorized`,
            },
        });
    }
}
