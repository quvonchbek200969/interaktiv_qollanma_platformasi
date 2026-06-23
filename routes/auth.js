// routes/auth.js — Ro'yxatdan o'tish, login va admin kirish

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const router = express.Router();

// ===== RO'YXATDAN O'TISH =====
// POST /api/auth/register
// Body: { full_name, password }
router.post('/register', async (req, res) => {
  try {
    const { full_name, password } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Ism kiritilishi shart.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak.' });
    }

    const name = full_name.trim();

    // Ism band bo'lsa xato
    const existing = db.prepare('SELECT id FROM users WHERE full_name = ?').get(name);
    if (existing) {
      return res.status(409).json({ error: 'Bu ism allaqachon band. Boshqa ism tanlang.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const email = `user_${Date.now()}@platform.local`;

    const result = db.prepare(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)'
    ).run(name, email, password_hash);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        is_admin: user.is_admin
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi.' });
  }
});

// ===== LOGIN =====
// POST /api/auth/login
// Body: { full_name, password }
router.post('/login', async (req, res) => {
  try {
    const { full_name, password } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Ism kiritilishi shart.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Parol kiritilishi shart.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE full_name = ?').get(full_name.trim());

    if (!user) {
      return res.status(401).json({ error: 'Ism yoki parol noto\'g\'ri.' });
    }

    // Admin — email orqali ham kirishi mumkin
    if (user.password_hash === 'no-password') {
      return res.status(401).json({ error: 'Bu akkaunt eski tizimda yaratilgan. Admin bilan bog\'laning.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Ism yoki parol noto\'g\'ri.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        is_admin: user.is_admin
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi.' });
  }
});

// ===== ADMIN LOGIN (email + parol) =====
// POST /api/auth/admin-login
// Body: { email, password }
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parol kiritilishi shart.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_admin = 1').get(email.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Admin topilmadi yoki ruxsat yo\'q.' });
    }

    // Agar admin paroli hali o'rnatilmagan bo'lsa
    if (user.password_hash === 'no-password') {
      return res.status(401).json({ error: 'Admin paroli o\'rnatilmagan. db.js da seedAdminUser funksiyasini yangilang.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        is_admin: user.is_admin
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi.' });
  }
});

// ===== ESKI /enter yo'li (orqaga moslik uchun) =====
router.post('/enter', (req, res) => {
  return res.status(410).json({ error: 'Bu endpoint o\'chirildi. /register yoki /login dan foydalaning.' });
});

module.exports = router;
