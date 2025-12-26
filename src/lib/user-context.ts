/**
 * User Context Abstraction Layer
 * 
 * This module provides a unified interface for user identification across the application.
 * 
 * ## Current Mode: Single-User (Local)
 * - All functions return fixed values for local single-user mode
 * - No authentication required
 * - All data belongs to 'local' user
 * 
 * ## Future Mode: Multi-User
 * - Replace getCurrentUserId() to return actual session user ID
 * - Replace isAuthenticated() to check real session state
 * - All business logic remains unchanged
 */

/**
 * Get the current user ID
 * 
 * @returns User ID string
 * 
 * @example
 * // Single-user mode (current)
 * const userId = getCurrentUserId(); // Returns 'local'
 * 
 * @example
 * // Multi-user mode (future implementation)
 * const userId = getCurrentUserId(); // Returns actual user ID from session
 */
export function getCurrentUserId(): string {
    // ===== SINGLE-USER MODE =====
    // Always return 'local' for the local single-user
    return 'local';

    // ===== MULTI-USER MODE (Future) =====
    // Uncomment and implement when adding authentication:
    // 
    // import { getServerSession } from 'next-auth';
    // const session = await getServerSession();
    // return session?.user?.id || 'anonymous';
}

/**
 * Check if the current user is authenticated
 * 
 * @returns true if authenticated, false otherwise
 * 
 * @example
 * // Single-user mode (current)
 * const authed = isAuthenticated(); // Always returns true
 * 
 * @example
 * // Multi-user mode (future implementation)
 * const authed = isAuthenticated(); // Returns actual authentication status
 */
export function isAuthenticated(): boolean {
    // ===== SINGLE-USER MODE =====
    // Always authenticated in local mode
    return true;

    // ===== MULTI-USER MODE (Future) =====
    // Uncomment and implement when adding authentication:
    // 
    // import { getServerSession } from 'next-auth';
    // const session = await getServerSession();
    // return !!session?.user;
}

/**
 * Local user constant
 * Used as the default user ID in single-user mode
 */
export const LOCAL_USER_ID = 'local';
