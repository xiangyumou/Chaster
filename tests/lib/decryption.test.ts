import { describe, it, expect, vi, Mock } from 'vitest';

/**
 * Decryption Unit Tests - Using Mocks for Layer Logic Validation
 * 
 * These tests mock the underlying tlock decrypt to focus on testing the
 * multi-layer decryption logic in decryption.ts. The mocks allow us to:
 * - Test layer-by-layer unwrapping behavior
 * - Verify error handling at each layer
 * - Run fast in CI without network calls
 * 
 * For integration testing with real encryption, use the items route tests.
 */

// Mock tlock before importing decryption (which depends on it)
vi.mock('@/lib/tlock', () => ({
    decrypt: vi.fn()
}));

import { decrypt, decryptLayers } from '@/lib/decryption';
import { decrypt as tlockDecrypt } from '@/lib/tlock';

// Type the mock for proper usage
const mockedTlockDecrypt = tlockDecrypt as Mock;

describe('Lib: Decryption', () => {
    it('should decrypt single layer', async () => {
        mockedTlockDecrypt.mockResolvedValue(Buffer.from('plaintext'));
        const res = await decrypt('ciphertext');
        expect(res.toString()).toBe('plaintext');
    });

    it('should throw if tlock returns null', async () => {
        mockedTlockDecrypt.mockResolvedValue(null);
        await expect(decrypt('ciphertext')).rejects.toThrow('time may not have been reached');
    });

    it('should decrypt multiple layers', async () => {
        // First layer returns inner ciphertext (string)
        // Second layer returns final plaintext
        mockedTlockDecrypt
            .mockResolvedValueOnce(Buffer.from('layer2_cipher'))
            .mockResolvedValueOnce(Buffer.from('final_plain'));

        const res = await decryptLayers('cipher1', 2);
        expect(res.toString()).toBe('final_plain');
    });

    it('should throw on partial layer failure', async () => {
        mockedTlockDecrypt
            .mockResolvedValueOnce(Buffer.from('inner'))
            .mockResolvedValueOnce(null);

        await expect(decryptLayers('cipher', 2)).rejects.toThrow('layer 2');
    });
});
