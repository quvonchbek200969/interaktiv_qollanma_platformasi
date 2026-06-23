// routes/auth.js

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const router = express.Router();

// ===== LOGIN — ism + parol =====
// Admin emaili bilan kirganda is_admin avtomatik aniqlanadi
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

    if (user.password_hash === 'no-password') {
      return res.status(401).json({ error: 'Parolingiz yo\'q. Admin bilan bog\'laning.' });
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

// ===== FOYDALANUVCHI QO'SHISH — faqat admin =====
// POST /api/auth/add-user
// Body: { full_name, password }
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/adminAuth');

router.post('/add-user', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { full_name, password } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Ism kiritilishi shart.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak.' });
    }

    const name = full_name.trim();
    const existing = db.prepare('SELECT id FROM users WHERE full_name = ?').get(name);
    if (existing) {
      return res.status(409).json({ error: 'Bu ism allaqachon band.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const email = `user_${Date.now()}@platform.local`;

    const result = db.prepare(
      'INSERT INTO users (full_name, email, password_hash, is_admin) VALUES (?, ?, ?, 0)'
    ).run(name, email, password_hash);

    res.status(201).json({
      message: 'Foydalanuvchi muvaffaqiyatli qo\'shildi.',
      user: { id: result.lastInsertRowid, full_name: name }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi.' });
  }
});

// ===== FOYDALANUVCHILAR RO'YXATI — faqat admin =====
router.get('/users-list', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id, full_name, is_admin, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json({ users });
});

// ===== FOYDALANUVCHI O'CHIRISH — faqat admin =====
router.delete('/users-list/:id', requireAuth, requireAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
  if (user.is_admin) return res.status(403).json({ error: 'Adminni o\'chirib bo\'lmaydi.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'Foydalanuvchi o\'chirildi.' });
});

module.exports = router;
