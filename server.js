// server.js — Asosiy server fayli
// Bu fayl barcha route'larni birlashtiradi va serverni ishga tushiradi

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

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
