// routes/ai.js — AI Kitob O'quvchi
// Foydalanuvchi PDF kitobni tanlaydi, Claude API ga yuboriladi, savol-javob rejimida ishlaydi
// POST /api/ai/ask — contentId + question + history qabul qiladi, AI javobini qaytaradi

const express = require('express');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../database/db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// ===== AI SAVOL-JAVOB =====
// POST /api/ai/ask
// Body: { contentId: number, question: string, history: [{role, content}] }
// history — oldingi chat xabarlari (oxirgi 6 ta), token tejash uchun
router.post('/ask', requireAuth, async (req, res) => {
  try {
    const { contentId, question, history = [] } = req.body;

    if (!contentId || !question || !question.trim()) {
      return res.status(400).json({ error: 'contentId va question kiritilishi shart.' });
    }

    // Kitob ma'lumotlarini bazadan olish
    const item = db.prepare('SELECT * FROM content WHERE id = ? AND type = ?').get(contentId, 'book');
    if (!item) {
      return res.status(404).json({ error: 'Kitob topilmadi.' });
    }
    if (item.content_source !== 'upload' || !item.file_path) {
      return res.status(400).json({ error: 'Bu kontent AI o\'qish uchun yaroqli emas (faqat yuklangan PDF).' });
    }

    // PDF faylni diskdan o'qish
    const fullPath = path.join(__dirname, '..', item.file_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'PDF fayl serverda topilmadi.' });
    }

    const pdfBuffer = fs.readFileSync(fullPath);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Oxirgi 6 ta xabarni tarix sifatida yuborish (token tejash)
    const recentHistory = history.slice(-6);

    // Birinchi xabar (user) ga PDF ni biriktiramiz
    // Agar tarix bo'lsa — faqat savol yuboramiz (PDF ni har safar yubormaslik uchun)
    // Agar birinchi savol bo'lsa — PDF + savol birgalikda yuboramiz
    let messages;

    if (recentHistory.length === 0) {
      // Birinchi savol — PDF bilan birga yuboramiz
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: question.trim()
            }
          ]
        }
      ];
    } else {
      // Keyingi savollar — tarix + yangi savol (PDF ni qayta yubormaymiz, token tejash)
      // Lekin tarix ichida PDF bo'lmaydi, shuning uchun kontekstni saqlab turishimiz kerak
      // Eng yaxshi yechim: har safar PDF + tarix + savol yuborish (kichik PDFlar uchun yaxshi)
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: `Quyida bu kitob haqidagi oldingi suhbat tarixi:\n${recentHistory.map(m => `${m.role === 'user' ? 'Foydalanuvchi' : 'AI'}: ${m.content}`).join('\n')}\n\nYangi savol: ${question.trim()}`
            }
          ]
        }
      ];
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `Siz "${item.title}" kitobini o'qib, foydalanuvchiga yordam beradigan AI yordamchisiz. 
Foydalanuvchi savollariga kitob mazmuniga asoslanib o'zbek tilida javob bering.
Qisqa, aniq va foydali javoblar bering. Agar savol kitobga tegishli bo'lmasa, muloyimlik bilan kitobga qaytaring.`,
      messages
    });

    const answer = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    res.json({
      answer,
      bookTitle: item.title
    });

  } catch (err) {
    console.error('AI xatosi:', err);
    if (err.status === 401) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY noto\'g\'ri yoki belgilanmagan.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'AI so\'rovlar chegarasiga yetildi. Bir oz kuting.' });
    }
    res.status(500).json({ error: 'AI dan javob olishda xatolik yuz berdi.' });
  }
});

module.exports = router;
