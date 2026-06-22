// routes/suggestions.js — Taklif/Chat tizimi
// Foydalanuvchi: taklif yozadi (POST), o'z takliflarini ko'radi (GET /mine)
// Admin: barcha takliflarni ko'radi (GET /all), holatni/javobni yangilaydi (PUT /:id)

const express = require('express');
const db = require('../database/db');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/adminAuth');

const router = express.Router();

// ===== TAKLIF YOZISH (har qanday login qilgan foydalanuvchi) =====
router.post('/', requireAuth, (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Taklif matni bo\'sh bo\'lishi mumkin emas.' });
  }

  const result = db.prepare(
    'INSERT INTO suggestions (user_id, message) VALUES (?, ?)'
  ).run(req.userId, message.trim());

  res.status(201).json({
    message: 'Taklifingiz muvaffaqiyatli yuborildi. Admin ko\'rib chiqadi.',
    suggestion: {
      id: result.lastInsertRowid,
      message: message.trim(),
      status: 'kutilmoqda'
    }
  });
});

// ===== O'Z TAKLIFLARIMNI KO'RISH =====
router.get('/mine', requireAuth, (req, res) => {
  const items = db.prepare(
    'SELECT * FROM suggestions WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId);
  res.json({ suggestions: items });
});

// ===== ADMIN: BARCHA TAKLIFLARNI KO'RISH =====
router.get('/all', requireAuth, requireAdmin, (req, res) => {
  const { status } = req.query; // ixtiyoriy filter: kutilmoqda / korib_chiqildi / bajarildi

  let query = `
    SELECT suggestions.*, users.full_name AS author_name, users.email AS author_email
    FROM suggestions
    JOIN users ON suggestions.user_id = users.id
  `;
  const params = [];

  if (status) {
    query += ' WHERE suggestions.status = ?';
    params.push(status);
  }

  query += ' ORDER BY suggestions.created_at DESC';

  const items = db.prepare(query).all(...params);
  res.json({ suggestions: items });
});

// ===== ADMIN: TAKLIF HOLATINI / JAVOBINI YANGILASH =====
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const { status, admin_reply } = req.body;
  const validStatuses = ['kutilmoqda', 'korib_chiqildi', 'bajarildi'];

  const suggestion = db.prepare('SELECT * FROM suggestions WHERE id = ?').get(req.params.id);
  if (!suggestion) {
    return res.status(404).json({ error: 'Taklif topilmadi.' });
  }

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Noto\'g\'ri holat qiymati.' });
  }

  const newStatus = status || suggestion.status;
  const newReply = admin_reply !== undefined ? admin_reply : suggestion.admin_reply;

  db.prepare(`
    UPDATE suggestions
    SET status = ?, admin_reply = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newStatus, newReply, req.params.id);

  res.json({
    message: 'Taklif muvaffaqiyatli yangilandi.',
    suggestion: { id: req.params.id, status: newStatus, admin_reply: newReply }
  });
});

module.exports = router;
