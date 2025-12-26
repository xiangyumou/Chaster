import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma/data/chaster.db');
const db = new Database(dbPath);

console.log('Current journal_mode:', db.pragma('journal_mode', { simple: true }));
db.pragma('journal_mode = WAL');
console.log('New journal_mode:', db.pragma('journal_mode', { simple: true }));

console.log('✅ WAL mode enabled!');
