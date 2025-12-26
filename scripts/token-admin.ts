import { getPrismaClient, disconnectPrisma } from '../src/lib/prisma';
import crypto from 'crypto';

const args = process.argv.slice(2);
const command = args[0];
const param = args[1];

async function main() {
    const prisma = getPrismaClient();

    try {
        if (command === 'list') {
            const tokens = await prisma.apiToken.findMany({
                orderBy: { createdAt: 'desc' },
            });
            console.log('\nExisting Tokens:');
            if (tokens.length === 0) {
                console.log('  (No tokens found)');
            } else {
                tokens.forEach((t: { name: string; token: string; isActive: boolean; createdAt: bigint }) => {
                    console.log(`  - Name: ${t.name}`);
                    console.log(`    Token: ${t.token}`);
                    console.log(`    Active: ${t.isActive}`);
                    console.log(`    Created: ${new Date(Number(t.createdAt)).toLocaleString()}`);
                    console.log('');
                });
            }
        } else if (command === 'create') {
            const name = param || 'Admin-Recovery-Token';
            const token = `tok_${crypto.randomBytes(32).toString('hex')}`;

            await prisma.apiToken.create({
                data: {
                    name,
                    token,
                    isActive: true,
                    createdAt: BigInt(Date.now()),
                }
            });

            console.log('\n✅ New Token Created Successfully!');
            console.log(`Name: ${name}`);
            console.log(`Token: ${token}`);
            console.log('\nUse this token to log in to the Console or access the API.');
        } else {
            console.log('\nUsage:');
            console.log('  npm run token list          # List all tokens (with secrets)');
            console.log('  npm run token create [name] # Generate a new token');
            console.log('');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await disconnectPrisma();
    }
}

main();
