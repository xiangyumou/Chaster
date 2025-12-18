import { timelockEncrypt, timelockDecrypt, roundAt, HttpChainClient, HttpCachingChain, Buffer as TlockBuffer } from 'tlock-js';

// Drand mainnet quicknet chain (3s rounds)
const CHAIN_URL = 'https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971';

let chainClient: HttpChainClient | null = null;

async function getChainClient(): Promise<HttpChainClient> {
    if (!chainClient) {
        const chain = new HttpCachingChain(CHAIN_URL);
        chainClient = new HttpChainClient(chain);
    }
    return chainClient;
}

export async function getChainInfo() {
    const client = await getChainClient();
    return await client.chain().info();
}

/**
 * Calculate the drand round number for a given target time
 * roundAt(time, chainInfo) returns the round number at the given time 
 */
export async function getRoundForTime(targetTime: Date): Promise<number> {
    const chainInfo = await getChainInfo();
    return roundAt(targetTime.getTime(), chainInfo);
}

/**
 * Encrypt data with timelock - can only be decrypted after the specified time
 */
export async function encrypt(data: Buffer, decryptAt: Date): Promise<{ ciphertext: string; roundNumber: number }> {
    const client = await getChainClient();
    const chainInfo = await client.chain().info();

    const roundNumber = roundAt(decryptAt.getTime(), chainInfo);

    // Convert Node Buffer to tlock-js Buffer
    const tlockBuffer = TlockBuffer.from(data);

    const ciphertext = await timelockEncrypt(
        roundNumber,
        tlockBuffer,
        client
    );

    return {
        ciphertext,
        roundNumber
    };
}

/**
 * Attempt to decrypt timelock-encrypted data
 * Returns null if the time hasn't been reached yet
 */
export async function decrypt(ciphertext: string): Promise<Buffer | null> {
    try {
        const client = await getChainClient();
        const decrypted = await timelockDecrypt(ciphertext, client);
        return Buffer.from(decrypted);
    } catch (error) {
        // If decryption fails, it's likely because the round hasn't been reached yet
        if (error instanceof Error && (error.message.includes('round') || error.message.includes('beacon'))) {
            return null;
        }
        throw error;
    }
}

/**
 * Check if content can be decrypted (time has passed)
 */
export function canDecrypt(decryptAt: number): boolean {
    return Date.now() >= decryptAt;
}
