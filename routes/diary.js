// routes/diary.js — Kundalik/Notes tizimi (foydalanuvchining shaxsiy yozuvlari)
// GET    /api/diary         — o'z yozuvlarini olish
// POST   /api/diary         — yangi yozuv
// PUT    /api/diary/:id     — tahrirlash (faqat egasi)
// DELETE /api/diary/:id     — o'chirish (faqat egasi)

const express = require('express');
const db = require('../database/db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ===== O'Z YOZUVLARINI OLISH =====
router.get('/', requireAuth, (req, res) => {
  const entries = db.prepare(
    'SELECT * FROM diary_entries WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId);
  res.json({ entries });
});

// ===== YANGI YOZUV =====
router.post('/', requireAuth, (req, res) => {
  const { title, body } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Sarlavha kiritilishi shart.' });
  }

  const result = db.prepare(
    'INSERT INTO diary_entries (user_id, title, body) VALUES (?, ?, ?)'
  ).run(req.userId, title.trim(), (body || '').trim());

  res.status(201).json({
    message: 'Yozuv saqlandi.',
    entry: { id: result.lastInsertRowid, title: title.trim(), body: (body || '').trim() }
  });
});

// ===== TAHRIRLASH =====
router.put('/:id', requireAuth, (req, res) => {
  const { title, body } = req.body;
  const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Yozuv topilmadi.' });
  if (entry.user_id !== req.userId) return res.status(403).json({ error: 'Ruxsat yo\'q.' });

  const newTitle = title && title.trim() ? title.trim() : entry.title;
  const newBody = body !== undefined ? body.trim() : entry.body;

  db.prepare(
    "UPDATE diary_entries SET title = ?, body = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(newTitle, newBody, req.params.id);

  res.json({ message: 'Yozuv yangilandi.', entry: { id: req.params.id, title: newTitle, body: newBody } });
});

// ===== O'CHIRISH =====
router.delete('/:id', requireAuth, (req, res) => {
  const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Yozuv topilmadi.' });
  if (entry.user_id !== req.userId) return res.status(403).json({ error: 'Ruxsat yo\'q.' });

  db.prepare('DELETE FROM diary_entries WHERE id = ?').run(req.params.id);
  res.json({ message: 'Yozuv o\'chirildi.' });
});

module.exports = router;
