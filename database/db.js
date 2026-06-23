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

// ===== BIRINCHI FOYDALANUVCHI — ADMIN =====
// Agar bazada hech kim yo'q bo'lsa, birinchi ro'yxatdan o'tuvchi avtomatik admin bo'ladi.
// Bu mantiq /api/auth/register endpointida ishlaydi.
(function checkFirstUser() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (count.cnt === 0) {
    console.log("INFO: Bazada foydalanuvchi yo'q. Birinchi ro'yxatdan o'tuvchi avtomatik ADMIN bo'ladi.");
  }
})();

module.exports = db;
