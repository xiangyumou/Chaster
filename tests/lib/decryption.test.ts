import { describe, it, expect, vi } from 'vitest';

// Mock tlock before importing decryption (which depends on it)
vi.mock('@/lib/tlock', () => ({
    decrypt: vi.fn()
}));

import { decrypt, decryptLayers } from '@/lib/decryption';
import { decrypt as tlockDecrypt } from '@/lib/tlock';

describe('Lib: Decryption', () => {
    it('should decrypt single layer', async () => {
        (tlockDecrypt as any).mockResolvedValue(Buffer.from('plaintext'));
        const res = await decrypt('ciphertext');
        expect(res.toString()).toBe('plaintext');
    });

    it('should throw if tlock returns null', async () => {
        (tlockDecrypt as any).mockResolvedValue(null);
        await expect(decrypt('ciphertext')).rejects.toThrow('time may not have been reached');
    });

    it('should decrypt multiple layers', async () => {
        // First layer returns inner ciphertext (string)
        // Second layer returns final plaintext
        (tlockDecrypt as any)
            .mockResolvedValueOnce(Buffer.from('layer2_cipher'))
            .mockResolvedValueOnce(Buffer.from('final_plain'));

        const res = await decryptLayers('cipher1', 2);
        expect(res.toString()).toBe('final_plain');
    });

    it('should throw on partial layer failure', async () => {
        (tlockDecrypt as any)
            .mockResolvedValueOnce(Buffer.from('inner'))
            .mockResolvedValueOnce(null);

        await expect(decryptLayers('cipher', 2)).rejects.toThrow('layer 2');
    });
});
