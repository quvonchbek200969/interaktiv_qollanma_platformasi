// middleware/auth.js — JWT tokenni tekshirish uchun middleware
// Himoyalangan route'larda foydalanuvchi login qilganini tasdiqlash uchun ishlatiladi

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization; // "Bearer <token>"

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi. Iltimos, login qiling.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // Keyingi route'larda req.userId orqali foydalanuvchini bilamiz
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token yaroqsiz yoki muddati o\'tgan. Qaytadan login qiling.' });
  }
}

module.exports = requireAuth;
