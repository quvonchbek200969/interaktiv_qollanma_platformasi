// db.js — Ma'lumotlar bazasiga ulanish (better-sqlite3)
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'platform.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);

// WAL rejimi — yozish tezligi uchun
db.pragma('journal_mode = WAL');

// Schema yaratish
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
const tableStatements = [];
const indexStatements = [];
schema.split(';').forEach((stmt) => {
  const trimmed = stmt.trim();
  if (!trimmed) return;
  if (/^CREATE\s+INDEX/i.test(trimmed)) {
    indexStatements.push(trimmed);
  } else {
    tableStatements.push(trimmed);
  }
});

tableStatements.forEach((stmt) => db.exec(stmt + ';'));

// ===== AVTOMATIK MIGRATSIYA =====
function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Migratsiya: ${table}.${column} ustuni qo'shildi.`);
  }
}

ensureColumn('users', 'is_admin', "INTEGER NOT NULL DEFAULT 0");
ensureColumn('content', 'content_source', "TEXT NOT NULL DEFAULT 'upload'");
ensureColumn('content', 'youtube_url', "TEXT");

indexStatements.forEach((stmt) => db.exec(stmt + ';'));

console.log("Ma'lumotlar bazasi tayyor:", DB_PATH);

// ===== SEED: ADMIN AKAUNT =====
(function seedAdminUser() {
  const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'qochqorovquvonchbek737@gmail.com';
  const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Admin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(ADMIN_EMAIL);

  if (!existing) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare(
      'INSERT INTO users (full_name, email, password_hash, is_admin) VALUES (?, ?, ?, 1)'
    ).run(ADMIN_NAME, ADMIN_EMAIL, hash);
    console.log('✅ Admin akaunt yaratildi:', ADMIN_EMAIL, '| Parol:', ADMIN_PASSWORD);
  } else {
    // is_admin ni doim 1 ga o'rnatish
    db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(ADMIN_EMAIL);

    // Agar parol hali hash qilinmagan (eski tizim) bo'lsa — yangilaymiz
    if (existing.password_hash === 'no-password') {
      const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, ADMIN_EMAIL);
      console.log('✅ Admin paroli yangilandi. Parol:', ADMIN_PASSWORD);
    }
  }
})();

module.exports = db;
