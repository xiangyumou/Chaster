import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encrypt, decrypt, getChainInfo, getRoundForTime, canDecrypt } from '@/lib/tlock';

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
                    info: vi.fn().mockResolvedValue({
                        period: 3,
                        genesis_time: Math.floor(Date.now() / 1000) - 1000000,
                    })
                }
            }
        }
    };
});

describe('Lib: tlock', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('encrypt', () => {
        it('should encrypt data and return ciphertext with round number', async () => {
            const buffer = Buffer.from('test');
            // tlock.ts in test mode mocks response: mock_ct:<base64>
            // base64('test') = dGVzdA==

            const result = await encrypt(buffer, new Date());
            expect(result.ciphertext).toBe('mock_ct:dGVzdA==');
            expect(result.roundNumber).toBe(123456789);
        });

        it('should encrypt different data correctly', async () => {
            const buffer = Buffer.from('hello world');
            // base64('hello world') = aGVsbG8gd29ybGQ=

            const result = await encrypt(buffer, new Date());
            expect(result.ciphertext).toBe('mock_ct:aGVsbG8gd29ybGQ=');
        });

        it('should encrypt empty buffer', async () => {
            const buffer = Buffer.from('');

            const result = await encrypt(buffer, new Date());
            expect(result.ciphertext).toBe('mock_ct:');
            expect(result.roundNumber).toBe(123456789);
        });

        it('should encrypt binary data', async () => {
            const buffer = Buffer.from([0x00, 0xff, 0x7f]);

            const result = await encrypt(buffer, new Date());
            expect(result.ciphertext).toContain('mock_ct:');
        });
    });

    describe('decrypt', () => {
        it('should decrypt mocked ciphertext', async () => {
            const decrypted = await decrypt('mock_ct:dGVzdA==');
            expect(decrypted?.toString()).toBe('test');
        });

        it('should decrypt different data correctly', async () => {
            const decrypted = await decrypt('mock_ct:aGVsbG8gd29ybGQ=');
            expect(decrypted?.toString()).toBe('hello world');
        });

        it('should handle empty base64 data', async () => {
            const decrypted = await decrypt('mock_ct:');
            expect(decrypted?.toString()).toBe('');
        });

        it('should throw error for non-mocked format in test mode', async () => {
            // Non-mocked ciphertext in test mode should go through real decrypt path
            // which will throw since the mocked timelockDecrypt returns undefined
            await expect(decrypt('real_ciphertext_here')).rejects.toThrow();
        });
    });

    describe('getChainInfo', () => {
        it('should return chain info in mocked mode', async () => {
            const info = await getChainInfo();
            expect(info).toBeDefined();
            expect(info.period).toBe(3);
            expect(info.hash).toBe('mock_hash');
            expect(info.metadata.beaconID).toBe('quicknet');
        });

        it('should return consistent chain info', async () => {
            const info1 = await getChainInfo();
            const info2 = await getChainInfo();
            expect(info1.period).toBe(info2.period);
            expect(info1.schemeID).toBe(info2.schemeID);
        });
    });

    describe('getRoundForTime', () => {
        it('should return mocked round number', async () => {
            const round = await getRoundForTime(new Date());
            expect(round).toBe(123456789);
        });

        it('should return same round for same time', async () => {
            const time = new Date('2025-01-01T00:00:00Z');
            const round1 = await getRoundForTime(time);
            const round2 = await getRoundForTime(time);
            expect(round1).toBe(round2);
        });

        it('should handle future dates', async () => {
            const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours from now
            const round = await getRoundForTime(futureDate);
            expect(round).toBe(123456789); // Mocked value
        });

        it('should handle past dates', async () => {
            const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 24 hours ago
            const round = await getRoundForTime(pastDate);
            expect(round).toBe(123456789); // Mocked value
        });
    });

    describe('canDecrypt', () => {
        it('should return true when current time is past decryptAt', () => {
            const pastTime = Date.now() - 1000; // 1 second ago
            expect(canDecrypt(pastTime)).toBe(true);
        });

        it('should return false when current time is before decryptAt', () => {
            const futureTime = Date.now() + 1000 * 60; // 1 minute in future
            expect(canDecrypt(futureTime)).toBe(false);
        });

        it('should return true when current time equals decryptAt', () => {
            const now = Date.now();
            expect(canDecrypt(now)).toBe(true);
        });

        it('should handle edge case of very old time', () => {
            const veryOldTime = 0; // Unix epoch
            expect(canDecrypt(veryOldTime)).toBe(true);
        });

        it('should handle edge case of very future time', () => {
            const veryFutureTime = Date.now() + 1000 * 60 * 60 * 24 * 365; // 1 year from now
            expect(canDecrypt(veryFutureTime)).toBe(false);
        });
    });
});
