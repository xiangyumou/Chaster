/**
 * Migration script: better-sqlite3 → Prisma
 * 
 * This script migrates data from the old better-sqlite3 database to the new Prisma schema.
 * It removes user_id fields and prepares the database for the API-first architecture.
 */

import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

const OLD_DB_PATH = path.join(process.cwd(), 'data', 'chaster.db');
const NEW_DB_PATH = path.join(process.cwd(), 'data', 'chaster_new.db');

async function migrate() {
    console.log('🚀 Starting database migration...\n');

    // Check if old database exists
    if (!fs.existsSync(OLD_DB_PATH)) {
        console.log('⚠️  No existing database found. Creating fresh database...');
        await initializeFreshDatabase();
        return;
    }

    // Backup old database
    const backupPath = `${OLD_DB_PATH}.backup.${Date.now()}`;
    fs.copyFileSync(OLD_DB_PATH, backupPath);
    console.log(`✅ Backed up old database to: ${backupPath}\n`);

    // Open old database
    const oldDb = new Database(OLD_DB_PATH, { readonly: true });

    // Set DATABASE_URL to new database for migration
    process.env.DATABASE_URL = `file:${NEW_DB_PATH}`;

    // Initialize Prisma with new database
    const prisma = new PrismaClient();

    try {
        // Get old items
        const oldItems = oldDb.prepare('SELECT * FROM items').all() as Array<{
            id: string;
            type: string;
            encrypted_data: string;
            original_name: string | null;
            decrypt_at: number;
            round_number: number;
            created_at: number;
            layer_count: number;
            user_id: string;
        }>;

        console.log(`📦 Found ${oldItems.length} items to migrate\n`);

        // Migrate items
        let migratedCount = 0;
        for (const item of oldItems) {
            await prisma.item.create({
                data: {
                    id: item.id,
                    type: item.type,
                    encryptedData: item.encrypted_data,
                    originalName: item.original_name,
                    decryptAt: BigInt(item.decrypt_at),
                    roundNumber: BigInt(item.round_number),
                    createdAt: BigInt(item.created_at),
                    layerCount: item.layer_count,
                    metadata: null, // Old items don't have metadata
                },
            });
            migratedCount++;

            if (migratedCount % 10 === 0) {
                process.stdout.write(`\r  Migrated ${migratedCount}/${oldItems.length} items...`);
            }
        }
        console.log(`\r  Migrated ${migratedCount}/${oldItems.length} items... ✅\n`);

        // Generate default API token
        const defaultToken = generateApiToken('default');
        await prisma.apiToken.create({
            data: {
                token: defaultToken,
                name: 'Default Token',
                createdAt: BigInt(Date.now()),
                isActive: true,
            },
        });

        console.log(`\n🔑 Generated default API token:`);
        console.log(`   ${defaultToken}\n`);
        console.log(`   Save this token - you'll need it to access the API!\n`);

        // Migrate settings if needed
        try {
            const oldSettings = oldDb.prepare('SELECT * FROM settings').all() as Array<{
                key: string;
                value: string;
            }>;

            for (const setting of oldSettings) {
                await prisma.systemConfig.create({
                    data: {
                        key: setting.key,
                        value: setting.value,
                    },
                });
            }
            console.log(`✅ Migrated ${oldSettings.length} system settings\n`);
        } catch (error) {
            console.log('ℹ️  No settings to migrate\n');
        }

        // Close connections
        oldDb.close();
        await prisma.$disconnect();

        // Replace old database with new one
        fs.renameSync(OLD_DB_PATH, `${OLD_DB_PATH}.old`);
        fs.renameSync(NEW_DB_PATH, OLD_DB_PATH);

        console.log('✅ Migration completed successfully!\n');
        console.log('📝 Summary:');
        console.log(`   - Items migrated: ${migratedCount}`);
        console.log(`   - user_id fields: removed`);
        console.log(`   - metadata support: added`);
        console.log(`   - API tokens: 1 created`);
        console.log(`\n🎉 Your database is now ready for the new Chaster service!\n`);

    } catch (error) {
        console.error('❌ Migration failed:', error);

        // Cleanup on failure
        if (fs.existsSync(NEW_DB_PATH)) {
            fs.unlinkSync(NEW_DB_PATH);
        }

        oldDb.close();
        await prisma.$disconnect();
        throw error;
    }
}

async function initializeFreshDatabase() {
    const prisma = new PrismaClient();

    try {
        // Generate default API token
        const defaultToken = generateApiToken('default');
        await prisma.apiToken.create({
            data: {
                token: defaultToken,
                name: 'Default Token',
                createdAt: BigInt(Date.now()),
                isActive: true,
            },
        });

        console.log(`\n🔑 Generated default API token:`);
        console.log(`   ${defaultToken}\n`);
        console.log(`   Save this token - you'll need it to access the API!\n`);

        await prisma.$disconnect();

        console.log('✅ Fresh database initialized!\n');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        await prisma.$disconnect();
        throw error;
    }
}

function generateApiToken(prefix: string): string {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `tok_${prefix}_${randomBytes}`;
}

// Run migration
migrate().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
