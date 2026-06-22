// middleware/adminAuth.js — Admin huquqini tekshirish uchun middleware
// Bu middleware requireAuth'dan KEYIN ishlatiladi (req.userId allaqachon o'rnatilgan bo'lishi kerak)
// Faqat is_admin = 1 bo'lgan foydalanuvchilarga ruxsat beradi (masalan: YouTube link qo'shish, takliflarni ko'rish)

const db = require('../database/db');

function requireAdmin(req, res, next) {
  if (!req.userId) {
    // Bu holat bo'lmasligi kerak, agar requireAuth oldin ishlatilgan bo'lsa
    return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi.' });
  }

  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.userId);

  if (!user || user.is_admin !== 1) {
    return res.status(403).json({ error: 'Bu amal faqat admin uchun ruxsat etilgan.' });
  }

  next();
}

module.exports = requireAdmin;
