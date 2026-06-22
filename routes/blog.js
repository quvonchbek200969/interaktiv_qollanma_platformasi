// routes/blog.js — Blog tizimi
// Har bir foydalanuvchi o'z blogini yuritadi: post yaratish, tahrirlash, o'chirish
// Hammaga ochiq: barcha postlarni yoki bitta foydalanuvchining postlarini o'qish

const express = require('express');
const db = require('../database/db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ===== BARCHA BLOG POSTLARINI KO'RISH (hammaga ochiq, eng yangisi birinchi) =====
// GET /api/blog?user_id=3  (user_id ixtiyoriy filter — faqat shu foydalanuvchining postlari)
router.get('/', (req, res) => {
  const { user_id } = req.query;

  let query = `
    SELECT blog_posts.*, users.full_name AS author_name, users.avatar_url AS author_avatar
    FROM blog_posts
    JOIN users ON blog_posts.user_id = users.id
  `;
  const params = [];

  if (user_id) {
    query += ' WHERE blog_posts.user_id = ?';
    params.push(user_id);
  }

  query += ' ORDER BY blog_posts.created_at DESC';

  const posts = db.prepare(query).all(...params);
  res.json({ posts });
});

// ===== BITTA POSTNI KO'RISH (hammaga ochiq) =====
router.get('/:id', (req, res) => {
  const post = db.prepare(`
    SELECT blog_posts.*, users.full_name AS author_name, users.avatar_url AS author_avatar
    FROM blog_posts
    JOIN users ON blog_posts.user_id = users.id
    WHERE blog_posts.id = ?
  `).get(req.params.id);

  if (!post) {
    return res.status(404).json({ error: 'Post topilmadi.' });
  }

  res.json({ post });
});

// ===== O'Z POSTLARIMNI KO'RISH =====
router.get('/mine/all', requireAuth, (req, res) => {
  const posts = db.prepare(
    'SELECT * FROM blog_posts WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId);
  res.json({ posts });
});

// ===== YANGI POST YOZISH =====
router.post('/', requireAuth, (req, res) => {
  const { title, body } = req.body;

  if (!title || !title.trim() || !body || !body.trim()) {
    return res.status(400).json({ error: 'Sarlavha va matn kiritilishi shart.' });
  }

  const result = db.prepare(
    'INSERT INTO blog_posts (user_id, title, body) VALUES (?, ?, ?)'
  ).run(req.userId, title.trim(), body.trim());

  res.status(201).json({
    message: 'Post muvaffaqiyatli yaratildi.',
    post: { id: result.lastInsertRowid, title: title.trim(), body: body.trim() }
  });
});

// ===== POSTNI TAHRIRLASH (faqat egasi) =====
router.put('/:id', requireAuth, (req, res) => {
  const { title, body } = req.body;

  const post = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'Post topilmadi.' });
  }
  if (post.user_id !== req.userId) {
    return res.status(403).json({ error: 'Siz faqat o\'zingizning postingizni tahrirlay olasiz.' });
  }

  const newTitle = title !== undefined && title.trim() ? title.trim() : post.title;
  const newBody = body !== undefined && body.trim() ? body.trim() : post.body;

  db.prepare(`
    UPDATE blog_posts SET title = ?, body = ?, updated_at = datetime('now') WHERE id = ?
  `).run(newTitle, newBody, req.params.id);

  res.json({
    message: 'Post muvaffaqiyatli yangilandi.',
    post: { id: req.params.id, title: newTitle, body: newBody }
  });
});

// ===== POSTNI O'CHIRISH (faqat egasi) =====
router.delete('/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'Post topilmadi.' });
  }
  if (post.user_id !== req.userId) {
    return res.status(403).json({ error: 'Siz faqat o\'zingizning postingizni o\'chira olasiz.' });
  }

  db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Post muvaffaqiyatli o\'chirildi.' });
});

module.exports = router;
