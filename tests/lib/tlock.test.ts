import { describe, it, expect, vi } from 'vitest';
import { encrypt, decrypt, getChainInfo, getRoundForTime } from '@/lib/tlock';
import * as tlockJs from 'tlock-js';

// Mock drand-client
vi.mock('drand-client', () => ({
    HttpChain: vi.fn()
}));

// Mock tlock-js
vi.mock('tlock-js', () => {
    return {
        timelockEncrypt: vi.fn(),
        timelockDecrypt: vi.fn(),
        roundNumber: vi.fn().mockReturnValue(100),
        roundAt: vi.fn().mockReturnValue(100),
        Buffer: { from: vi.fn() },
        HttpChainClient: class {
            chain() {
                return {
                    info: vi.fn().mockResolvedValue({})
                }
            }
        }
    };
});

describe('Lib: tlock', () => {
    it('should encrypt data', async () => {
        (tlockJs.timelockEncrypt as any).mockResolvedValue('encrypted_content');
        const buffer = Buffer.from('test');
        const decryptAt = new Date();

        const result = await encrypt(buffer, decryptAt);
        expect(result.ciphertext).toBe('encrypted_content');
        expect(result.roundNumber).toBe(100);
    });

    it('should decrypt data', async () => {
        (tlockJs.timelockDecrypt as any).mockResolvedValue('decrypted_content');
        const buffer = 'encrypted_content';

        // Mock global fetch if needed (tlock-js uses fetch)? 
        // But we mocked timelockDecrypt, so valid.

        const result = await decrypt(buffer); // Fixed: only 1 arg
        expect(result?.toString()).toBe('decrypted_content');
    });

    it('should handle encryption error', async () => {
        (tlockJs.timelockEncrypt as any).mockRejectedValue(new Error('Encrypt fail'));
        await expect(encrypt(Buffer.from('a'), new Date())).rejects.toThrow('Encrypt fail');
    });

    it('should get chain info', async () => {
        const info = await getChainInfo();
        expect(info).toBeDefined();
    });

    it('should get round for time', async () => {
        const round = await getRoundForTime(new Date());
        expect(round).toBe(100);
    });
});
