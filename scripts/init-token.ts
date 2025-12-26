/**
 * Initialize default API token for Chaster
 */

import { getPrismaClient, disconnectPrisma } from '../src/lib/prisma';
import * as crypto from 'crypto';

async function initializeToken() {
    console.log('🔑 Initializing default API token...\n');

    const prisma = getPrismaClient();

    try {
        // Check if any tokens exist
        const tokenCount = await prisma.apiToken.count();

        if (tokenCount > 0) {
            console.log('✅ API tokens already exist. No action needed.\n');
            const tokens = await prisma.apiToken.findMany({
                where: { isActive: true },
                orderBy: { createdAt: 'asc' },
                take: 1,
            });

            if (tokens.length > 0) {
                console.log('📋 Existing token:');
                console.log(`   Name: ${tokens[0].name}`);
                console.log(`   Token: ${tokens[0].token}\n`);
            }

            await disconnectPrisma();
            return;
        }

        // Generate new default token
        const token = generateApiToken('default');

        await prisma.apiToken.create({
            data: {
                token,
                name: 'Default Token',
                createdAt: BigInt(Date.now()),
                isActive: true,
            },
        });

        console.log('✅ Default API token created successfully!\n');
        console.log('='.repeat(70));
        console.log('🔑 DEFAULT API TOKEN (SAVE THIS!):');
        console.log('   ' + token);
        console.log('='.repeat(70));
        console.log('\n💡 Use this token in the Authorization header:');
        console.log(`   Authorization: Bearer ${token}\n`);

        await disconnectPrisma();

    } catch (error) {
        console.error('❌ Error:', error);
        await disconnectPrisma();
        process.exit(1);
    }
}

function generateApiToken(prefix: string): string {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `tok_${prefix}_${randomBytes}`;
}

// Run
initializeToken();
