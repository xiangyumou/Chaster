/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Item = {
    id?: string;
    type?: 'text' | 'image';
    originalName?: string | null;
    /**
     * Available only when unlocked
     */
    content?: string;
    decryptAt?: number;
    createdAt?: number;
    layerCount?: number;
    unlocked?: boolean;
    metadata?: Record<string, any> | null;
    /**
     * Milliseconds until decryption possible
     */
    timeRemainingMs?: number;
};

