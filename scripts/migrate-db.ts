/**
 * Database migration script for Chaster
 * 
 * This script safely migrates data from the old schema to the new Prisma schema.
 * It handles both fresh installations and existing databases.
 */

import Database from 'better-sqlite3';
import { getPrismaClient, disconnectPrisma } from '../src/lib/prisma';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const OLD_DB_PATH = path.join(DATA_DIR, 'chaster.db');
const BACKUP_DB_PATH = path.join(DATA_DIR, `chaster_backup_${Date.now()}.db`);

async function main() {
    console.log('🚀 Chaster Database Migration\n');

    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const dbExists = fs.existsSync(OLD_DB_PATH);

    if (!dbExists) {
        console.log('ℹ️  No existing database found. Setting up fresh database...\n');
        await setupFreshDatabase();
        return;
    }

    // Check if database has old schema
    const oldDb = new Database(OLD_DB_PATH, { readonly: true });
    const hasOldSchema = await checkForOldSchema(oldDb);
    oldDb.close();

    if (!hasOldSchema) {
        console.log('✅ Database is already using the new schema. No migration needed.\n');
        await ensureDefaultToken();
        return;
    }

    console.log('📦 Found existing database with old schema.\n');
    await migrateExistingDatabase();
}

function checkForOldSchema(db: Database.Database): boolean {
    try {
        // Check if items table has user_id column
        const columns = db.prepare(`PRAGMA table_info(items)`).all() as Array<{ name: string }>;
        return columns.some(col => col.name === 'user_id');
    } catch {
        return false;
    }
}

async function migrateExistingDatabase() {
    console.log('🔄 Step 1: Backing up existing database...');
    fs.copyFileSync(OLD_DB_PATH, BACKUP_DB_PATH);
    console.log(`   ✅ Backup created: ${path.basename(BACKUP_DB_PATH)}\n`);

    console.log('🔄 Step 2: Reading existing data...');
    const oldDb = new Database(OLD_DB_PATH, { readonly: true });

    const oldItems = oldDb.prepare('SELECT * FROM items').all() as Array<{
        id: string;
        type: string;
        encrypted_data: string;
        original_name: string | null;
        decrypt_at: number;
        round_number: number;
        created_at: number;
        layer_count: number;
        user_id?: string;
    }>;

    console.log(`   Found ${oldItems.length} items to migrate\n`);

    oldDb.close();

    console.log('🔄 Step 3: Creating new database schema...');

    // Remove old database and create new one
    fs.unlinkSync(OLD_DB_PATH);

    // Initialize Prisma with new schema
    const prisma = getPrismaClient();

    try {
        // Push schema to create tables
        const { exec } = require('child_process');
        await new Promise<void>((resolve, reject) => {
            exec('npx prisma db push --skip-generate', { cwd: process.cwd() }, (error: Error | null) => {
                if (error) reject(error);
                else resolve();
            });
        });

        console.log('   ✅ New schema created\n');

        console.log('🔄 Step 4: Migrating data...');
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
                    metadata: null,
                },
            });
            migratedCount++;

            if (migratedCount % 10 === 0 || migratedCount === oldItems.length) {
                process.stdout.write(`\r   Migrated ${migratedCount}/${oldItems.length} items...`);
            }
        }
        console.log(' ✅\n');

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

        await disconnectPrisma();

        console.log('✅ Migration completed successfully!\n');
        console.log('='.repeat(60));
        console.log('🔑 DEFAULT API TOKEN (SAVE THIS!):');
        console.log('   ' + defaultToken);
        console.log('='.repeat(60));
        console.log('\n📝 Migration Summary:');
        console.log(`   - Items migrated: ${migratedCount}`);
        console.log(`   - Backup location: ${path.basename(BACKUP_DB_PATH)}`);
        console.log(`   - user_id fields: removed`);
        console.log(`   - metadata support: added`);
        console.log('\n🎉 Database is ready for the new Chaster service!\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);

        // Restore backup on failure
        if (fs.existsSync(BACKUP_DB_PATH)) {
            console.log('\n🔄 Restoring backup...');
            if (fs.existsSync(OLD_DB_PATH)) {
                fs.unlinkSync(OLD_DB_PATH);
            }
            fs.copyFileSync(BACKUP_DB_PATH, OLD_DB_PATH);
            console.log('✅ Backup restored\n');
        }

        await disconnectPrisma();
        throw error;
    }
}

async function setupFreshDatabase() {
    const prisma = getPrismaClient();

    try {
        // Push schema to create tables
        const { exec } = require('child_process');
        await new Promise<void>((resolve, reject) => {
            exec('npx prisma db push --skip-generate', { cwd: process.cwd() }, (error: Error | null) => {
                if (error) reject(error);
                else resolve();
            });
        });

        console.log('✅ Database schema created\n');

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

        await disconnectPrisma();

        console.log('='.repeat(60));
        console.log('🔑 DEFAULT API TOKEN (SAVE THIS!):');
        console.log('   ' + defaultToken);
        console.log('='.repeat(60));
        console.log('\n✅ Fresh database initialized!\n');

    } catch (error) {
        console.error('❌ Setup failed:', error);
        await disconnectPrisma();
        throw error;
    }
}

async function ensureDefaultToken() {
    const prisma = getPrismaClient();

    try {
        const tokenCount = await prisma.apiToken.count();

        if (tokenCount === 0) {
            const defaultToken = generateApiToken('default');
            await prisma.apiToken.create({
                data: {
                    token: defaultToken,
                    name: 'Default Token',
                    createdAt: BigInt(Date.now()),
                    isActive: true,
                },
            });

            console.log('='.repeat(60));
            console.log('🔑 GENERATED DEFAULT API TOKEN:');
            console.log('   ' + defaultToken);
            console.log('='.repeat(60));
            console.log('');
        }

        await disconnectPrisma();
    } catch (error) {
        await disconnectPrisma();
        throw error;
    }
}

function generateApiToken(prefix: string): string {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `tok_${prefix}_${randomBytes}`;
}

// Run migration
main().catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});
