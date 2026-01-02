import { describe, it, expect, beforeAll } from 'vitest';
import { timelockEncrypt, timelockDecrypt, roundAt } from 'tlock-js';
import { HttpChainClient, HttpChain } from 'drand-client';

// Use the public quicknet chain for integration testing
// This requires internet access. If CI is offline, these tests should be skipped or perform a check first.
const CHAIN_HASH = '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971'; // quicknet
const PUBLIC_CHAIN_URL = 'https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971';

// Network availability flag - set in beforeAll
let isNetworkAvailable = false;
let chainClient: HttpChainClient | null = null;

describe('Integration: Tlock (Real)', () => {
    // Increase timeout for network operations
    const TIMEOUT = 30000;

    beforeAll(async () => {
        // Check network availability once before all tests
        try {
            chainClient = new HttpChainClient(new HttpChain(PUBLIC_CHAIN_URL));
            await chainClient.chain().info();
            isNetworkAvailable = true;
        } catch {
            isNetworkAvailable = false;
            console.warn('Network unavailable for tlock integration tests - tests will be skipped');
        }
    }, TIMEOUT);

    it('should be able to fetch chain info from public drand', async () => {
        if (!isNetworkAvailable || !chainClient) {
            console.log('Test skipped: network unavailable');
            return; // Explicit early return with log
        }

        const info = await chainClient.chain().info();

        expect(info).toBeDefined();
        expect(info.hash).toBe(CHAIN_HASH);
        expect(info.period).toBeGreaterThan(0);
    }, TIMEOUT);

    it('should encrypt and decrypt a payload (round trip)', async () => {
        if (!isNetworkAvailable || !chainClient) {
            console.log('Test skipped: network unavailable');
            return; // Explicit early return with log
        }

        const info = await chainClient.chain().info();

        // Encrypt for a round in the past (so we can decrypt immediately)
        const now = Date.now();
        const currentRound = roundAt(now, info);
        // Use a round slightly in the past to ensure availability
        const pastRound = currentRound - 5;

        if (pastRound <= 0) {
            console.log('Test skipped: genesis time improper for testing past round');
            return;
        }

        const payload = Buffer.from('Integration Test Content');

        console.log('beacon received:', JSON.stringify(info));

        // Encrypt
        const ciphertext = await timelockEncrypt(
            pastRound,
            payload,
            chainClient
        );

        expect(ciphertext).toBeDefined();
        expect(typeof ciphertext).toBe('string');
        expect(ciphertext.length).toBeGreaterThan(0);

        // Decrypt
        const decrypted = await timelockDecrypt(ciphertext, chainClient);

        expect(decrypted).toBeDefined();
        expect(decrypted!.toString()).toBe('Integration Test Content');
    }, TIMEOUT);
});
