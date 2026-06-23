// server.js — Asosiy server fayli
// Bu fayl barcha route'larni birlashtiradi va serverni ishga tushiradi

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// ===== MUHIM MUHIT O'ZGARUVCHILARINI TEKSHIRISH =====
// JWT_SECRET bo'lmasa, login/register paytida "Server xatosi yuz berdi" kabi
// tushunarsiz xato chiqadi (jwt.sign secretOrPrivateKey talab qiladi).
// Shuning uchun server ishga tushishidanoq buni tekshirib, aniq xabar bilan to'xtatamiz.
if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
  console.error('\n❌ XATOLIK: JWT_SECRET muhit o\'zgaruvchisi topilmadi yoki bo\'sh.');
  console.error('   backend/.env faylida JWT_SECRET=... qiymatini o\'rnating.');
  console.error('   (Hosting platformasida bo\'lsa, Environment Variables bo\'limiga qo\'shing.)\n');
  process.exit(1);
}

// ANTHROPIC_API_KEY bo'lmasa, AI Kitob O'quvchi ishlamaydi, lekin bu boshqa
// funksiyalarni to'xtatmasligi kerak — shuning uchun faqat ogohlantirish chiqaramiz.
if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
  console.warn('\n⚠️  OGOHLANTIRISH: ANTHROPIC_API_KEY o\'rnatilmagan yoki placeholder qiymatda.');
  console.warn('   "AI bilan o\'qi" funksiyasi ishlamaydi. backend/.env faylida haqiqiy kalitni qo\'ying.\n');
}

// Ma'lumotlar bazasini ishga tushirish (jadvallar avtomatik yaraladi)
require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE =====
app.use(cors()); // Frontend bilan boglanish uchun
app.use(express.json()); // JSON formatdagi so'rovlarni o'qish uchun

// Yuklangan fayllarga (rasm, video, audio) statik kirish
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== ROUTE'LAR (keyingi bosqichlarda to'ldiriladi) =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/content', require('./routes/content'));
app.use('/api/suggestions', require('./routes/suggestions'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/ai', require('./routes/ai'));

// Tekshirish uchun oddiy yo'l
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server ishlayapti' });
});

// ===== SERVERNI ISHGA TUSHIRISH =====
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi: http://localhost:${PORT}`);
});
