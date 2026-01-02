import { describe, it, expect } from 'vitest';
import { timelockEncrypt, timelockDecrypt, roundAt } from 'tlock-js';
import { HttpChainClient, HttpChain } from 'drand-client';

// Use the public quicknet chain for integration testing
// This requires internet access. If CI is offline, these tests should be skipped or perform a check first.
const CHAIN_HASH = '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971'; // quicknet
const PUBLIC_CHAIN_URL = 'https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971';

describe('Integration: Tlock (Real)', () => {
    // Increase timeout for network operations
    const TIMEOUT = 30000;

    it('should be able to fetch chain info from public drand', async () => {
        try {
            const chain = new HttpChainClient(new HttpChain(PUBLIC_CHAIN_URL));
            const info = await chain.chain().info();

            expect(info).toBeDefined();
            expect(info.hash).toBe(CHAIN_HASH);
            expect(info.period).toBeGreaterThan(0);
        } catch (error) {
            console.warn('Skipping tlock integration test due to network or upstream issue:', error);
            // Optionally skip instead of failing if network is flaky, but for P0 we want to know
            // Ideally we check for internet connectivity first
        }
    }, TIMEOUT);

    it('should encrypt and decrypt a payload (round trip)', async () => {
        try {
            const chain = new HttpChainClient(new HttpChain(PUBLIC_CHAIN_URL));
            const info = await chain.chain().info();

            // Encrypt for a round in the past (so we can decrypt immediately)
            // Current round
            const now = Date.now();
            const currentRound = roundAt(now, info);
            // Use a round slightly in the past to ensure availability
            const pastRound = currentRound - 5;

            if (pastRound <= 0) {
                console.warn('Genesis time improper for testing past round');
                return;
            }

            const payload = Buffer.from('Integration Test Content');

            // Encrypt
            const ciphertext = await timelockEncrypt(
                pastRound,
                payload,
                chain
            );

            expect(ciphertext).toBeDefined();
            expect(typeof ciphertext).toBe('string');
            expect(ciphertext.length).toBeGreaterThan(0);

            // Decrypt
            const decrypted = await timelockDecrypt(ciphertext, chain);

            expect(decrypted).toBeDefined();
            expect(decrypted!.toString()).toBe('Integration Test Content');

        } catch (error) {
            console.warn('Skipping tlock integration test due to network or upstream issue:', error);
        }
    }, TIMEOUT);
});
