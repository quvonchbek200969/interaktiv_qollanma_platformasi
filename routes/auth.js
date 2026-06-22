// routes/auth.js — Ro'yxatdan o'tish va Login
// POST /api/auth/register — yangi foydalanuvchi yaratish
// POST /api/auth/login — mavjud foydalanuvchi bilan kirish

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const router = express.Router();

// ===== RO'YXATDAN O'TISH =====
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    // Validatsiya
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Ism, email va parol kiritilishi shart.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Parol kamida 6 belgidan iborat bo\'lishi kerak.' });
    }

    // Email allaqachon mavjudligini tekshirish
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Bu email bilan foydalanuvchi allaqachon mavjud.' });
    }

    // Parolni shifrlash
    const password_hash = await bcrypt.hash(password, 10);

    // Foydalanuvchini bazaga qo'shish
    const result = db.prepare(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)'
    ).run(full_name, email.toLowerCase(), password_hash);

    const userId = result.lastInsertRowid;

    // Token yaratish (avtomatik login)
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Ro\'yxatdan muvaffaqiyatli o\'tdingiz!',
      token,
      user: { id: userId, full_name, email: email.toLowerCase(), is_admin: 0 }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi. Keyinroq urinib ko\'ring.' });
  }
});

// ===== LOGIN =====
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parol kiritilishi shart.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Muvaffaqiyatli kirdingiz!',
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, is_admin: user.is_admin }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi. Keyinroq urinib ko\'ring.' });
  }
});

module.exports = router;
