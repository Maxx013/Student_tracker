require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiter for AI endpoints (10 requests per minute per IP)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many AI requests. Please wait a minute before trying again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer config for PDF uploads (store in memory, 10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// ============================================
// Page Routes (existing)
// ============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/subjects', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subjects.html'));
});

app.get('/topics/:subjectId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'topics.html'));
});

app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

app.get('/goals', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'goals.html'));
});

app.get('/ai-notes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ai-notes.html'));
});

// ============================================
// API Routes
// ============================================

// POST /api/parse-pdf — Extract text from uploaded PDF
app.post('/api/parse-pdf', upload.single('file'), async (req, res) => {
  let parser = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // pdf-parse v2 API: instantiate with { data: buffer }, then call getText()
    parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();
    const rawText = result.text || '';

    // Extract structured topics from raw text
    const topics = extractTopicsFromText(rawText);

    res.json({
      success: true,
      rawText: rawText.substring(0, 5000), // Limit response size
      topics: topics,
      pageCount: result.total || 0
    });
  } catch (error) {
    console.error('PDF parse error:', error.message);
    res.status(500).json({ error: 'Failed to parse PDF: ' + error.message });
  } finally {
    // Always clean up parser to free memory
    if (parser) {
      try { await parser.destroy(); } catch (e) { /* ignore */ }
    }
  }
});

// POST /api/ai-extract — Use AI to extract topics from text
app.post('/api/ai-extract', async (req, res) => {
  const { text } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(400).json({
      error: 'AI extraction not configured. Set GROQ_API_KEY environment variable.',
      available: false
    });
  }

  if (!text || text.trim().length < 20) {
    return res.status(400).json({ error: 'Text is too short for AI extraction.' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an academic assistant. Extract main topic names from syllabus text. Return ONLY a JSON array of topic name strings, nothing else. Example: ["Topic 1", "Topic 2"]'
          },
          {
            role: 'user',
            content: `Extract main topics from this syllabus text:\n\n${text.substring(0, 3000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'AI API request failed');
    }

    const content = data.choices?.[0]?.message?.content || '[]';

    // Try to parse JSON array from response
    let topics = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback: split by newlines
      topics = content.split('\n')
        .map(line => line.replace(/^[-•*\d.)\s]+/, '').trim())
        .filter(line => line.length > 2 && line.length < 200);
    }

    res.json({ success: true, topics, available: true });
  } catch (error) {
    console.error('AI extraction error:', error.message);
    res.status(500).json({ error: 'AI extraction failed: ' + error.message });
  }
});

// GET /api/ai-status — Check if AI is configured
app.get('/api/ai-status', (req, res) => {
  res.json({ available: !!process.env.GROQ_API_KEY });
});

// ============================================
// POST /api/ai/notes — Generate structured academic notes
// ============================================
app.post('/api/ai/notes', aiLimiter, async (req, res) => {
  const { topic, subject, difficulty } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'AI not configured. Set GROQ_API_KEY environment variable.' });
  }

  if (!topic || topic.trim().length < 2) {
    return res.status(400).json({ error: 'Please provide a valid topic.' });
  }

  const difficultyLabel = difficulty || 'Exam';
  const subjectLabel = subject || 'General';

  const systemPrompt = `You are an advanced academic tutor.

Generate highly structured, exam-oriented notes for the topic: ${topic}
Subject: ${subjectLabel}
Difficulty Level: ${difficultyLabel}

Include:
1. Overview
2. Detailed Explanation
3. Key Concepts
4. Important Definitions
5. Real-world Examples
6. Text-based Diagram (if applicable)
7. Important Formulas (if any)
8. 5 Short Answer Questions with Answers
9. 3 Long Answer Questions with Answers
10. 5 MCQs with Answers
11. Common Mistakes
12. Quick Revision Summary

Make it suitable for BCA-level students.
Use proper markdown headings and clean formatting.
Use ## for main sections and ### for sub-sections.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate comprehensive ${difficultyLabel}-level notes on "${topic}" for the subject "${subjectLabel}".` }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'AI API request failed');
    }

    const content = data.choices?.[0]?.message?.content || 'No content generated.';
    res.json({ success: true, notes: content });
  } catch (error) {
    console.error('AI Notes error:', error.message);
    res.status(500).json({ error: 'Failed to generate notes: ' + error.message });
  }
});

// ============================================
// POST /api/ai/chat — Academic chatbot
// ============================================
app.post('/api/ai/chat', aiLimiter, async (req, res) => {
  const { message, history } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'AI not configured. Set GROQ_API_KEY environment variable.' });
  }

  if (!message || message.trim().length < 1) {
    return res.status(400).json({ error: 'Please provide a message.' });
  }

  const systemMessage = {
    role: 'system',
    content: `You are a helpful academic assistant chatbot.
Answer clearly and concisely.
Explain step-by-step when needed.
Keep responses structured and easy to understand.
Use markdown formatting for better readability.
You specialize in helping BCA students with their studies.`
  };

  // Build messages array with history (last 10 messages max)
  const messages = [systemMessage];
  if (Array.isArray(history)) {
    const recentHistory = history.slice(-10);
    recentHistory.forEach(msg => {
      if (msg.role && msg.content) {
        messages.push({ role: msg.role, content: msg.content });
      }
    });
  }
  messages.push({ role: 'user', content: message });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-instruct',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'AI API request failed');
    }

    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ success: true, reply });
  } catch (error) {
    console.error('AI Chat error:', error.message);
    res.status(500).json({ error: 'Chat failed: ' + error.message });
  }
});

// POST /api/validate-notes-access — Validate notes access server-side
app.post('/api/validate-notes-access', async (req, res) => {
  try {
    const { uid, subjectId, topicId } = req.body;

    if (!uid || !subjectId || !topicId) {
      return res.status(400).json({ error: 'Missing required fields', locked: true });
    }

    // Use Firebase Admin would be ideal here, but since we're using client SDK,
    // we validate via the request parameters to ensure the client-side check is mirrored
    // In production, you'd use Firebase Admin SDK for server-side validation
    res.json({
      success: true,
      message: 'Notes access validation should be performed client-side via Firestore security rules',
      note: 'For production, implement Firebase Admin SDK validation here'
    });
  } catch (error) {
    res.status(500).json({ error: 'Validation failed', locked: true });
  }
});

// ============================================
// Helper: Extract topics from raw PDF text
// ============================================
function extractTopicsFromText(text) {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 2 && line.length < 200);

  const topics = [];
  const seen = new Set();

  for (const line of lines) {
    // Match numbered items: "1. Topic", "1) Topic", "I. Topic"
    const numberedMatch = line.match(/^(?:\d+[.)]\s*|[IVXLC]+[.)]\s*|[a-z][.)]\s*)(.*)/i);
    // Match bullet points: "• Topic", "- Topic", "* Topic"
    const bulletMatch = line.match(/^[•\-*►▪]\s*(.*)/);
    // Match "Unit/Chapter/Module N:" patterns
    const unitMatch = line.match(/^(?:unit|chapter|module|topic|lesson|section)\s*[\d:.\-–]+\s*(.*)/i);

    let topicName = null;
    if (unitMatch && unitMatch[1]) {
      topicName = unitMatch[1];
    } else if (numberedMatch && numberedMatch[1]) {
      topicName = numberedMatch[1];
    } else if (bulletMatch && bulletMatch[1]) {
      topicName = bulletMatch[1];
    } else if (/^[A-Z]/.test(line) && line.length > 5 && line.length < 100 && !line.includes('http')) {
      // Capitalized heading-like lines
      topicName = line;
    }

    if (topicName) {
      // Clean up
      topicName = topicName.replace(/[:–\-]+$/, '').trim();
      const key = topicName.toLowerCase();
      if (key.length > 2 && !seen.has(key)) {
        seen.add(key);
        topics.push(topicName);
      }
    }
  }

  return topics.slice(0, 50); // Cap at 50 topics
}

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log(`\n🚀 Student Progress Tracker is running!`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Pages:`);
  console.log(`   - Landing:    http://localhost:${PORT}/`);
  console.log(`   - Login:      http://localhost:${PORT}/login`);
  console.log(`   - Register:   http://localhost:${PORT}/register`);
  console.log(`   - Dashboard:  http://localhost:${PORT}/dashboard`);
  console.log(`   - Subjects:   http://localhost:${PORT}/subjects`);
  console.log(`   - Analytics:  http://localhost:${PORT}/analytics`);
  console.log(`   API:`);
  console.log(`   - Parse PDF:  POST http://localhost:${PORT}/api/parse-pdf`);
  console.log(`   - AI Extract: POST http://localhost:${PORT}/api/ai-extract`);
  console.log(`   - AI Notes:   POST http://localhost:${PORT}/api/ai/notes`);
  console.log(`   - AI Chat:    POST http://localhost:${PORT}/api/ai/chat`);
  console.log(`   - AI Status:  GET  http://localhost:${PORT}/api/ai-status\n`);
});
