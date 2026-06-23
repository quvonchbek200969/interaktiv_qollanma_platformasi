// routes/settings.js — Global sayt sozlamalari (fon rasm va h.k.)
// GET  /api/settings/background        — joriy fon URL (hamma uchun ochiq)
// POST /api/settings/background        — URL orqali fon o'rnatish (faqat admin)
// POST /api/settings/background-upload — fayl yuklash orqali fon (faqat admin)

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/adminAuth');

const router = express.Router();

// Fon rasmlari uchun papka
const bgDir = path.join(__dirname, '..', 'uploads', 'backgrounds');
if (!fs.existsSync(bgDir)) fs.mkdirSync(bgDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, bgDir),
  filename: (req, file, cb) => cb(null, 'bg-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// ===== FON RASMNI OLISH (hamma uchun ochiq) =====
router.get('/background', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'background_url'").get();
  res.json({ url: row ? row.value : '' });
});

// ===== URL ORQALI FON O'RNATISH (faqat admin) =====
router.post('/background', requireAuth, requireAdmin, (req, res) => {
  const { url } = req.body;
  if (url === undefined) {
    return res.status(400).json({ error: 'url maydoni kiritilishi shart.' });
  }

  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES ('background_url', ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(url.trim());

  res.json({ message: 'Fon rasm muvaffaqiyatli o\'rnatildi.', url: url.trim() });
});

// ===== FAYL YUKLASH ORQALI FON O'RNATISH (faqat admin) =====
router.post('/background-upload', requireAuth, requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fayl yuklanmadi.' });
  }

  const fileUrl = `/uploads/backgrounds/${req.file.filename}`;

  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES ('background_url', ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(fileUrl);

  res.json({ message: 'Fon rasm muvaffaqiyatli yuklandi.', url: fileUrl });
});

module.exports = router;
