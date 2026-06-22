// routes/users.js — Foydalanuvchi profili
// GET /api/users/me — o'z profilini ko'rish
// PUT /api/users/me — o'z profilini tahrirlash

const express = require('express');
const db = require('../database/db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ===== O'Z PROFILINI KO'RISH =====
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, full_name, email, bio, avatar_url, is_admin, created_at FROM users WHERE id = ?'
  ).get(req.userId);

  if (!user) {
    return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
  }

  res.json({ user });
});

// ===== PROFILNI TAHRIRLASH =====
router.put('/me', requireAuth, (req, res) => {
  const { full_name, bio, avatar_url } = req.body;

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!current) {
    return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
  }

  // Faqat kelgan maydonlarni yangilaymiz, bo'sh bo'lsa eski qiymat qoladi
  const newFullName = full_name !== undefined ? full_name : current.full_name;
  const newBio = bio !== undefined ? bio : current.bio;
  const newAvatar = avatar_url !== undefined ? avatar_url : current.avatar_url;

  db.prepare(
    'UPDATE users SET full_name = ?, bio = ?, avatar_url = ? WHERE id = ?'
  ).run(newFullName, newBio, newAvatar, req.userId);

  res.json({
    message: 'Profil muvaffaqiyatli yangilandi.',
    user: {
      id: req.userId,
      full_name: newFullName,
      email: current.email,
      bio: newBio,
      avatar_url: newAvatar
    }
  });
});

// ===== BOSHQA FOYDALANUVCHI PROFILINI KO'RISH (ommaviy, masalan blog uchun) =====
router.get('/:id', (req, res) => {
  const user = db.prepare(
    'SELECT id, full_name, bio, avatar_url, created_at FROM users WHERE id = ?'
  ).get(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
  }

  res.json({ user });
});

module.exports = router;
