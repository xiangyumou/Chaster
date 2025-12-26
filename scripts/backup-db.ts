import fs from 'fs';
import path from 'path';

const DATABASE_PATH = path.join(process.cwd(), 'data', 'chaster.db');
const BACKUP_DIR = path.join(process.cwd(), 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `chaster-${timestamp}.db`);

try {
    if (fs.existsSync(DATABASE_PATH)) {
        fs.copyFileSync(DATABASE_PATH, backupPath);
        console.log(`✅ Backup created successfully at: ${backupPath}`);

        // Clean up old backups (keep last 7 days)
        // ... logic to clean up ...
    } else {
        console.error(`❌ Database file not found at: ${DATABASE_PATH}`);
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
}
