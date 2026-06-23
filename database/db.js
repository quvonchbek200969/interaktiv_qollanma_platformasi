// db.js — Ma'lumotlar bazasiga ulanish va sxemani ishga tushirish
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'platform.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new DatabaseSync(DB_PATH);

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
  const ADMIN_EMAIL = 'qochqorovquvonchbek737@gmail.com';
  const ADMIN_NAME = 'Admin';

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
  if (!existing) {
    db.prepare(
      'INSERT INTO users (full_name, email, password_hash, is_admin) VALUES (?, ?, ?, 1)'
    ).run(ADMIN_NAME, ADMIN_EMAIL, 'no-password');
    console.log('Seed admin akaunt yaratildi:', ADMIN_EMAIL);
  } else {
    // is_admin ni 1 ga o'rnatish (eski DB da 0 bo'lsa)
    db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(ADMIN_EMAIL);
  }
})();

module.exports = db;
