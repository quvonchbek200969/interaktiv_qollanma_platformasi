// routes/content.js — Kontent boshqaruvi
// Faqat ADMIN: yuklash, YouTube qo'shish, o'chirish
// Barcha foydalanuvchilar: ko'rish va yuklab olish

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/adminAuth');

const router = express.Router();

// ===== MULTER SOZLAMASI =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tmpDir = path.join(__dirname, '..', 'uploads', 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

// ===== KONTENT RO'YXATINI OLISH (hamma uchun ochiq) =====
router.get('/', (req, res) => {
  const { type } = req.query;
  let query = `
    SELECT content.*, users.full_name AS author_name
    FROM content
    JOIN users ON content.user_id = users.id
  `;
  const params = [];
  if (type) { query += ' WHERE content.type = ?'; params.push(type); }
  query += ' ORDER BY content.created_at DESC';
  const items = db.prepare(query).all(...params);
  res.json({ content: items });
});

// ===== O'Z KONTENTLARINI OLISH (admin uchun) =====
router.get('/mine', requireAuth, (req, res) => {
  const items = db.prepare(
    'SELECT * FROM content WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId);
  res.json({ content: items });
});

// ===== FAYL YUKLASH — FAQAT ADMIN =====
router.post('/upload', requireAuth, requireAdmin, upload.single('file'), (req, res) => {
  try {
    const { type, title, description } = req.body;

    if (!type || !title) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Kontent turi va sarlavha kiritilishi shart.' });
    }
    if (!['book', 'video', 'audio'].includes(type)) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Noto\'g\'ri kontent turi.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Fayl yuklanmadi.' });
    }

    const folderMap = { book: 'books', video: 'videos', audio: 'audio' };
    const targetDir = path.join(__dirname, '..', 'uploads', folderMap[type]);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, req.file.filename);
    fs.renameSync(req.file.path, targetPath);

    const relativePath = `/uploads/${folderMap[type]}/${req.file.filename}`;

    const result = db.prepare(`
      INSERT INTO content (user_id, type, content_source, title, description, file_path, file_size)
      VALUES (?, ?, 'upload', ?, ?, ?, ?)
    `).run(req.userId, type, title, description || '', relativePath, req.file.size);

    res.status(201).json({
      message: 'Fayl muvaffaqiyatli yuklandi.',
      content: { id: result.lastInsertRowid, type, title, description: description || '', file_path: relativePath }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fayl yuklashda xatolik.' });
  }
});

// ===== KONTENTNI O'CHIRISH — FAQAT ADMIN =====
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const item = db.prepare('SELECT * FROM content WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Kontent topilmadi.' });

  if (item.content_source === 'upload' && item.file_path) {
    const fullPath = path.join(__dirname, '..', item.file_path);
    fs.unlink(fullPath, (err) => { if (err) console.error('Fayl o\'chirishda xato:', err.message); });
  }

  db.prepare('DELETE FROM content WHERE id = ?').run(req.params.id);
  res.json({ message: 'Kontent o\'chirildi.' });
});

// ===== ADMIN: YOUTUBE LINK QO'SHISH =====
router.post('/youtube', requireAuth, requireAdmin, (req, res) => {
  const { type, title, description, youtube_url } = req.body;

  if (!type || !title || !youtube_url) {
    return res.status(400).json({ error: 'Tur, sarlavha va YouTube link kiritilishi shart.' });
  }
  if (!['video', 'audio'].includes(type)) {
    return res.status(400).json({ error: 'YouTube uchun tur faqat video yoki audio.' });
  }
  const isYoutubeLink = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(youtube_url.trim());
  if (!isYoutubeLink) {
    return res.status(400).json({ error: 'To\'g\'ri YouTube link kiriting.' });
  }

  const result = db.prepare(`
    INSERT INTO content (user_id, type, content_source, title, description, youtube_url)
    VALUES (?, ?, 'youtube', ?, ?, ?)
  `).run(req.userId, type, title, description || '', youtube_url.trim());

  res.status(201).json({ message: 'YouTube kontent qo\'shildi.', content: { id: result.lastInsertRowid } });
});

// ===== ADMIN: YOUTUBE KONTENTNI O'CHIRISH =====
router.delete('/youtube/:id', requireAuth, requireAdmin, (req, res) => {
  const item = db.prepare('SELECT * FROM content WHERE id = ? AND content_source = ?').get(req.params.id, 'youtube');
  if (!item) return res.status(404).json({ error: 'YouTube kontent topilmadi.' });
  db.prepare('DELETE FROM content WHERE id = ?').run(req.params.id);
  res.json({ message: 'YouTube kontent o\'chirildi.' });
});

module.exports = router;
