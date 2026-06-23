// server.js — Asosiy server fayli

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
  console.error('\n❌ XATOLIK: JWT_SECRET muhit o\'zgaruvchisi topilmadi yoki bo\'sh.');
  console.error('   backend/.env faylida JWT_SECRET=... qiymatini o\'rnating.\n');
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
  console.warn('\n⚠️  OGOHLANTIRISH: ANTHROPIC_API_KEY o\'rnatilmagan. "AI bilan o\'qi" ishlamaydi.\n');
}

require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/content', require('./routes/content'));
app.use('/api/suggestions', require('./routes/suggestions'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/diary', require('./routes/diary'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server ishlayapti' });
});

app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi: http://localhost:${PORT}`);
});
