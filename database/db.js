// db.js — Ma'lumotlar bazasiga ulanish va sxemani ishga tushirish
// Node.js v22 built-in node:sqlite moduli ishlatiladi (qo'shimcha paket kerak emas)

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'platform.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Bazaga ulanish (agar fayl bo'lmasa, avtomatik yaratiladi)
const db = new DatabaseSync(DB_PATH);

// Sxemani o'qib, CREATE TABLE va CREATE INDEX buyruqlarini ajratamiz.
// MUHIM: indekslarni jadval ustunlari migratsiyadan oldin ishga tushirish xato beradi
// (masalan eski content jadvalida content_source ustuni yo'q bo'lsa,
// "CREATE INDEX ... ON content(content_source)" xato qaytaradi).
// Shuning uchun tartib: 1) CREATE TABLE'lar  2) ustun migratsiyasi  3) CREATE INDEX'lar
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
// CREATE TABLE IF NOT EXISTS eski jadvalga yangi ustun QO'SHMAYDI.
// Agar platform.db eski sxema bilan (masalan is_admin, youtube_url, content_source
// ustunlarisiz) yaratilgan bo'lsa, server "table has no column named ..." xatosi bilan
// crash bo'lardi. Shu sababli har bir kerakli ustunni tekshirib, yo'q bo'lsa qo'shamiz.
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

// Ustunlar tayyor bo'lgandan keyin indekslarni yaratamiz
indexStatements.forEach((stmt) => db.exec(stmt + ';'));

console.log('Ma\'lumotlar bazasi tayyor:', DB_PATH);

// ===== SEED: ADMIN AKAUNT =====
// Server har ishga tushganda tekshiriladi.
// qochqorovquvonchbek737@gmail.com akaunt yo'q bo'lsa — avtomatik yaratiladi (is_admin=1).
// Parol: 123456 (bcrypt bilan hash qilinadi)
(function seedAdminUser() {
  const ADMIN_EMAIL = 'qochqorovquvonchbek737@gmail.com';
  const ADMIN_PASSWORD = '123456';
  const ADMIN_NAME = 'Admin';

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
  if (!existing) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare(
      'INSERT INTO users (full_name, email, password_hash, is_admin) VALUES (?, ?, ?, 1)'
    ).run(ADMIN_NAME, ADMIN_EMAIL, hash);
    console.log('Seed admin akaunt yaratildi:', ADMIN_EMAIL);
  }
})();

module.exports = db;
