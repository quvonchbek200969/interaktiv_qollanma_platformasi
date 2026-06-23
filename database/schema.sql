-- schema.sql — Ma'lumotlar bazasi tuzilishi
-- 4 asosiy jadval: users, content (kitob/video/audio/youtube), blog_posts, suggestions
-- ESLATMA: database/db.js endi avtomatik migratsiya qiladi — agar eski platform.db da
-- is_admin, content_source, youtube_url ustunlari yo'q bo'lsa, ular ALTER TABLE orqali
-- avtomatik qo'shiladi (server ishga tushishida). Ma'lumotlarni yo'qotmasdan davom etadi.

-- FOYDALANUVCHILAR JADVALI
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- KONTENT JADVALI (kitoblar, videolar, audio kitoblar — yuklangan FAYL yoki YOUTUBE link)
-- content_source = 'upload'  -> file_path to'ldirilgan, youtube_url bo'sh
-- content_source = 'youtube' -> youtube_url to'ldirilgan, file_path bo'sh (faqat ADMIN qo'sha oladi)
CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('book', 'video', 'audio')),
  content_source TEXT NOT NULL DEFAULT 'upload' CHECK(content_source IN ('upload', 'youtube')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_path TEXT,
  file_size INTEGER DEFAULT 0,
  youtube_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- BLOG POSTLARI JADVALI
CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- TAKLIFLAR / CHAT JADVALI (foydalanuvchi yozadi, admin javob beradi/holatini belgilaydi)
CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'kutilmoqda' CHECK(status IN ('kutilmoqda', 'korib_chiqildi', 'bajarildi')),
  admin_reply TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tezkor qidirish uchun indekslar
CREATE INDEX IF NOT EXISTS idx_content_user ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_source ON content(content_source);
CREATE INDEX IF NOT EXISTS idx_blog_user ON blog_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_user ON suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);

-- SOZLAMALAR JADVALI (fon rasm va boshqa global sozlamalar)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- KUNDALIK JADVALI (har bir foydalanuvchining shaxsiy yozuvlari)
CREATE TABLE IF NOT EXISTS diary_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_diary_user ON diary_entries(user_id);
