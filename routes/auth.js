// routes/auth.js — Faqat ism bilan kirish
// POST /api/auth/enter — full_name qabul qiladi, token qaytaradi

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const router = express.Router();

// ===== FAQAT ISM BILAN KIRISH =====
router.post('/enter', (req, res) => {
  try {
    const { full_name } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Ism kiritilishi shart.' });
    }

    const name = full_name.trim();

    // Mavjud foydalanuvchini ism bo'yicha topish
    let user = db.prepare('SELECT * FROM users WHERE full_name = ?').get(name);

    if (!user) {
      // Yangi foydalanuvchi yaratish
      const result = db.prepare(
        'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)'
      ).run(name, `user_${Date.now()}@guest.local`, 'no-password');
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
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

module.exports = router;
