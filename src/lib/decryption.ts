import { decrypt as tlockDecrypt } from './tlock';

/**
 * Decrypt timelock-encrypted data (convenience export)
 */
export async function decrypt(ciphertext: string, roundNumber?: number): Promise<Buffer> {
    // roundNumber is for compatibility but not used in simple decrypt
    const result = await tlockDecrypt(ciphertext);
    if (!result) {
        throw new Error('Decryption failed - time may not have been reached yet');
    }
    return result;
}

/**
 * Recursively decrypt multiple layers of timelock encryption
 * @param ciphertext The encrypted data (may have multiple layers)
 * @param layerCount Number of encryption layers to decrypt
 * @returns The decrypted plaintext data, or throws if not ready
 */
export async function decryptLayers(ciphertext: string, layerCount: number): Promise<Buffer> {
    let currentCiphertext = ciphertext;

    for (let i = 0; i < layerCount; i++) {
        const decrypted = await tlockDecrypt(currentCiphertext);
        if (!decrypted) {
            throw new Error(`Cannot decrypt layer ${i + 1}/${layerCount} - time not reached`);
        }

        if (i < layerCount - 1) {
            // More layers to go, the decrypted data is another ciphertext
            currentCiphertext = decrypted.toString('utf-8');
        } else {
            // Final layer, this is the actual data
            return decrypted;
        }
    }

    throw new Error('Decryption failed');
}
