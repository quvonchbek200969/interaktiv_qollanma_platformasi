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

// Sxemani o'qib, jadvallarni yaratish
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

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
