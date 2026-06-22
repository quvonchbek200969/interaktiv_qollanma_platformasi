// routes/content.js — Kontent boshqaruvi
// Oddiy foydalanuvchi: o'z fayllarini (kitob/video/audio) yuklaydi, ko'radi, o'chiradi
// Admin: YouTube link qo'shadi (serverga yuklamasdan), o'chiradi
// Hamma: barcha kontentni ko'ra oladi (GET /api/content)

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/adminAuth');

const router = express.Router();

// ===== MULTER SOZLAMASI (fayl yuklash) =====
// Kontent turiga qarab to'g'ri papkaga saqlash: uploads/books, uploads/videos, uploads/audio
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type; // 'book' | 'video' | 'audio'
    const folderMap = { book: 'books', video: 'videos', audio: 'audio' };
    const folder = folderMap[type];

    if (!folder) {
      return cb(new Error('Noto\'g\'ri kontent turi. type: book, video yoki audio bo\'lishi kerak.'));
    }

    cb(null, path.join(__dirname, '..', 'uploads', folder));
  },
  filename: (req, file, cb) => {
    // Nomlar to'qnashmasligi uchun: vaqt + asl nom
    const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200 MB chegarasi
});

// ===== KONTENT RO'YXATINI OLISH (hamma uchun ochiq) =====
// GET /api/content?type=video  (type ixtiyoriy filter)
router.get('/', (req, res) => {
  const { type } = req.query;

  let query = `
    SELECT content.*, users.full_name AS author_name
    FROM content
    JOIN users ON content.user_id = users.id
  `;
  const params = [];

  if (type) {
    query += ' WHERE content.type = ?';
    params.push(type);
  }

  query += ' ORDER BY content.created_at DESC';

  const items = db.prepare(query).all(...params);
  res.json({ content: items });
});

// ===== O'Z KONTENTLARIMNI OLISH =====
router.get('/mine', requireAuth, (req, res) => {
  const items = db.prepare(
    'SELECT * FROM content WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId);
  res.json({ content: items });
});

// ===== FAYL YUKLASH (kitob/video/audio) — har qanday login qilgan foydalanuvchi =====
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    const { type, title, description } = req.body;

    if (!type || !title) {
      return res.status(400).json({ error: 'Kontent turi (type) va sarlavha (title) kiritilishi shart.' });
    }
    if (!['book', 'video', 'audio'].includes(type)) {
      return res.status(400).json({ error: 'Noto\'g\'ri kontent turi.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Fayl yuklanmadi.' });
    }

    const folderMap = { book: 'books', video: 'videos', audio: 'audio' };
    const relativePath = `/uploads/${folderMap[type]}/${req.file.filename}`;

    const result = db.prepare(`
      INSERT INTO content (user_id, type, content_source, title, description, file_path, file_size)
      VALUES (?, ?, 'upload', ?, ?, ?, ?)
    `).run(req.userId, type, title, description || '', relativePath, req.file.size);

    res.status(201).json({
      message: 'Fayl muvaffaqiyatli yuklandi.',
      content: {
        id: result.lastInsertRowid,
        type,
        title,
        description: description || '',
        file_path: relativePath,
        file_size: req.file.size
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fayl yuklashda xatolik yuz berdi.' });
  }
});

// ===== O'Z KONTENTINI O'CHIRISH (faqat egasi) =====
router.delete('/:id', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM content WHERE id = ?').get(req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Kontent topilmadi.' });
  }
  if (item.user_id !== req.userId) {
    return res.status(403).json({ error: 'Siz faqat o\'zingizning kontentingizni o\'chira olasiz.' });
  }

  // Agar fayl serverda saqlangan bo'lsa (upload turi), uni diskdan ham o'chiramiz
  if (item.content_source === 'upload' && item.file_path) {
    const fullPath = path.join(__dirname, '..', item.file_path);
    fs.unlink(fullPath, (err) => {
      if (err) console.error('Faylni o\'chirishda xato (e\'tiborsiz qoldiriladi):', err.message);
    });
  }

  db.prepare('DELETE FROM content WHERE id = ?').run(req.params.id);
  res.json({ message: 'Kontent muvaffaqiyatli o\'chirildi.' });
});

// ===== ADMIN: YOUTUBE LINK QO'SHISH (serverga yuklamasdan) =====
// POST /api/content/youtube — faqat admin, type: video yoki audio, youtube_url majburiy
router.post('/youtube', requireAuth, requireAdmin, (req, res) => {
  const { type, title, description, youtube_url } = req.body;

  if (!type || !title || !youtube_url) {
    return res.status(400).json({ error: 'Kontent turi (type), sarlavha (title) va YouTube link (youtube_url) kiritilishi shart.' });
  }
  if (!['video', 'audio'].includes(type)) {
    return res.status(400).json({ error: 'YouTube uchun kontent turi faqat video yoki audio bo\'lishi mumkin.' });
  }

  // Oddiy tekshiruv: link YouTube'ga tegishli ekanligini ko'ramiz
  const isYoutubeLink = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(youtube_url.trim());
  if (!isYoutubeLink) {
    return res.status(400).json({ error: 'Iltimos, to\'g\'ri YouTube link kiriting.' });
  }

  const result = db.prepare(`
    INSERT INTO content (user_id, type, content_source, title, description, youtube_url)
    VALUES (?, ?, 'youtube', ?, ?, ?)
  `).run(req.userId, type, title, description || '', youtube_url.trim());

  res.status(201).json({
    message: 'YouTube kontent muvaffaqiyatli qo\'shildi.',
    content: {
      id: result.lastInsertRowid,
      type,
      content_source: 'youtube',
      title,
      description: description || '',
      youtube_url: youtube_url.trim()
    }
  });
});

// ===== ADMIN: YOUTUBE KONTENTNI O'CHIRISH =====
router.delete('/youtube/:id', requireAuth, requireAdmin, (req, res) => {
  const item = db.prepare('SELECT * FROM content WHERE id = ? AND content_source = ?').get(req.params.id, 'youtube');

  if (!item) {
    return res.status(404).json({ error: 'YouTube kontent topilmadi.' });
  }

  db.prepare('DELETE FROM content WHERE id = ?').run(req.params.id);
  res.json({ message: 'YouTube kontent muvaffaqiyatli o\'chirildi.' });
});

module.exports = router;
