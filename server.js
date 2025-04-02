const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');

dotenv.config();

const app = express();
app.use(express.json());

// Ручной preflight обработчик для всех путей
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// CORS заголовки для всех остальных запросов
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/explain', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful legal assistant who explains documents in plain English.'
        },
        {
          role: 'user',
          content: `Please explain this document clearly and simply:\n\n${text}`
        }
      ]
    });

    const answer = chatCompletion.choices[0].message.content;
    res.json({ explanation: answer });
  } catch (error) {
    console.error('OpenAI error:', error.message);
    res.status(500).json({ error: 'Failed to get explanation from AI' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});