// db.js — Ma'lumotlar bazasiga ulanish va sxemani ishga tushirish
// Node.js v22 built-in node:sqlite moduli ishlatiladi (qo'shimcha paket kerak emas)

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'platform.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Bazaga ulanish (agar fayl bo'lmasa, avtomatik yaratiladi)
const db = new DatabaseSync(DB_PATH);

// Sxemani o'qib, jadvallarni yaratish
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

console.log('Ma\'lumotlar bazasi tayyor:', DB_PATH);

module.exports = db;
