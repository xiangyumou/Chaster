import { decrypt } from './tlock';

/**
 * Recursively decrypt multiple layers of timelock encryption
 * @param ciphertext The encrypted data (may have multiple layers)
 * @param layerCount Number of encryption layers to decrypt
 * @returns The decrypted plaintext data, or null if not yet ready to decrypt
 */
export async function decryptLayers(ciphertext: string, layerCount: number): Promise<Buffer | null> {
    let data: Buffer | null = null;
    let currentCiphertext = ciphertext;

    for (let i = 0; i < layerCount; i++) {
        const decrypted = await decrypt(currentCiphertext);
        if (!decrypted) {
            return null; // Not ready to decrypt this layer
        }

        if (i < layerCount - 1) {
            // More layers to go, the decrypted data is another ciphertext
            currentCiphertext = decrypted.toString('utf-8');
        } else {
            // Final layer, this is the actual data
            data = decrypted;
        }
    }

    return data;
}
