import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/lib/store';

describe('Lib: Store (Zustand Auth Store)', () => {
    beforeEach(() => {
        // Reset store state before each test
        useAuthStore.setState({ token: null, isAuthenticated: false });
    });

    describe('Initial State', () => {
        it('should have null token initially', () => {
            const { token } = useAuthStore.getState();
            expect(token).toBeNull();
        });

        it('should not be authenticated initially', () => {
            const { isAuthenticated } = useAuthStore.getState();
            expect(isAuthenticated).toBe(false);
        });
    });

    describe('setToken', () => {
        it('should set token and mark as authenticated', () => {
            const { setToken } = useAuthStore.getState();
            setToken('test-token-123');

            const state = useAuthStore.getState();
            expect(state.token).toBe('test-token-123');
            expect(state.isAuthenticated).toBe(true);
        });

        it('should clear token and mark as unauthenticated when set to null', () => {
            const { setToken } = useAuthStore.getState();

            // First set a token
            setToken('some-token');
            expect(useAuthStore.getState().isAuthenticated).toBe(true);

            // Then clear it
            setToken(null);

            const state = useAuthStore.getState();
            expect(state.token).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });

        it('should update token when called multiple times', () => {
            const { setToken } = useAuthStore.getState();

            setToken('token-1');
            expect(useAuthStore.getState().token).toBe('token-1');

            setToken('token-2');
            expect(useAuthStore.getState().token).toBe('token-2');

            setToken('token-3');
            expect(useAuthStore.getState().token).toBe('token-3');
        });

        it('should handle empty string token', () => {
            const { setToken } = useAuthStore.getState();
            setToken('');

            const state = useAuthStore.getState();
            expect(state.token).toBe('');
            // Empty string is falsy, so isAuthenticated should be false
            expect(state.isAuthenticated).toBe(false);
        });
    });

    describe('Authentication Logic', () => {
        it('should correctly determine authentication from truthy token', () => {
            const { setToken } = useAuthStore.getState();

            // Truthy tokens should authenticate
            setToken('valid-token');
            expect(useAuthStore.getState().isAuthenticated).toBe(true);

            setToken('another-valid-token');
            expect(useAuthStore.getState().isAuthenticated).toBe(true);
        });

        it('should correctly determine authentication from falsy token', () => {
            const { setToken } = useAuthStore.getState();

            // Falsy tokens should not authenticate
            setToken(null);
            expect(useAuthStore.getState().isAuthenticated).toBe(false);

            setToken('');
            expect(useAuthStore.getState().isAuthenticated).toBe(false);
        });
    });

    describe('Store Subscriptions', () => {
        it('should notify subscribers on state change', () => {
            let callCount = 0;
            let lastToken: string | null = null;
            let lastIsAuth = false;

            const unsubscribe = useAuthStore.subscribe((state) => {
                callCount++;
                lastToken = state.token;
                lastIsAuth = state.isAuthenticated;
            });

            const { setToken } = useAuthStore.getState();
            setToken('new-token');

            expect(callCount).toBeGreaterThan(0);
            expect(lastToken).toBe('new-token');
            expect(lastIsAuth).toBe(true);

            unsubscribe();
        });

        it('should allow unsubscribing', () => {
            let callCount = 0;

            const unsubscribe = useAuthStore.subscribe(() => {
                callCount++;
            });

            const { setToken } = useAuthStore.getState();
            setToken('token-1');
            const countAfterFirst = callCount;

            unsubscribe();

            setToken('token-2');
            // Should not increase after unsubscribe
            expect(callCount).toBe(countAfterFirst);
        });
    });
});
