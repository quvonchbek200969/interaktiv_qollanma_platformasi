-- schema.sql — Ma'lumotlar bazasi tuzilishi
-- 4 asosiy jadval: users, content (kitob/video/audio/youtube), blog_posts, suggestions
-- ESLATMA: Agar eski platform.db da ustunlar yetishmasa (is_admin, youtube_url, content_source),
-- backend/database/ papkasidagi platform.db faylini o'chirib serverni qayta ishga tushiring.
-- Development bosqichida ma'lumotlar yo'qolishi muammo emas.

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
