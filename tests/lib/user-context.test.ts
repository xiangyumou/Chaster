import { describe, it, expect } from 'vitest';
import { getCurrentUserId, isAuthenticated, LOCAL_USER_ID } from '@/lib/user-context';

describe('Lib: User Context', () => {
    describe('getCurrentUserId', () => {
        it('should return "local" in single-user mode', () => {
            const userId = getCurrentUserId();
            expect(userId).toBe('local');
        });

        it('should return consistent value on multiple calls', () => {
            const userId1 = getCurrentUserId();
            const userId2 = getCurrentUserId();
            expect(userId1).toBe(userId2);
        });

        it('should return a non-empty string', () => {
            const userId = getCurrentUserId();
            expect(typeof userId).toBe('string');
            expect(userId.length).toBeGreaterThan(0);
        });
    });

    describe('isAuthenticated', () => {
        it('should return true in single-user mode', () => {
            const authed = isAuthenticated();
            expect(authed).toBe(true);
        });

        it('should return a boolean value', () => {
            const authed = isAuthenticated();
            expect(typeof authed).toBe('boolean');
        });
    });

    describe('LOCAL_USER_ID constant', () => {
        it('should be "local"', () => {
            expect(LOCAL_USER_ID).toBe('local');
        });

        it('should match getCurrentUserId() return value', () => {
            expect(LOCAL_USER_ID).toBe(getCurrentUserId());
        });
    });
});
