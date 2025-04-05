// server.js
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const users = []; // временная база пользователей
const documents = []; // временная база документов

// Middleware для проверки JWT
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Регистрация
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  const userExists = users.find(u => u.email === email);
  if (userExists) return res.status(409).json({ error: 'User already exists' });

  const newUser = { id: uuidv4(), email, password };
  users.push(newUser);
  res.status(201).json({ message: 'User registered' });
});

// Логин
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Получить документы пользователя
app.get('/api/dashboard', authenticateToken, (req, res) => {
  const userDocs = documents.filter(doc => doc.userId === req.user.userId);
  res.json(userDocs);
});

// Сохранить документ
app.post('/api/save-doc', authenticateToken, (req, res) => {
  const { originalText, explanation, isPaid } = req.body;
  documents.push({
    id: uuidv4(),
    userId: req.user.userId,
    originalText,
    explanation,
    isPaid,
    createdAt: new Date().toISOString()
  });
  res.status(201).json({ message: 'Document saved' });
});

// Обновление документа на "оплачен"
app.post('/api/mark-paid', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  let updated = false;

  documents.forEach(doc => {
    if (doc.userId === userId && !doc.isPaid) {
      doc.isPaid = true;
      updated = true;
    }
  });

  if (updated) {
    res.json({ message: 'Documents marked as paid.' });
  } else {
    res.status(404).json({ error: 'No unpaid documents found for user.' });
  }
});

// OpenAI explanation
app.post('/api/explain', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful legal assistant who explains documents in plain English.' },
        { role: 'user', content: `Please explain this document clearly and simply:\n\n${text}` }
      ]
    });

    const answer = chatCompletion.choices[0].message.content;
    res.json({ explanation: answer });
  } catch (err) {
    console.error('OpenAI error:', err.message);
    res.status(500).json({ error: 'Failed to get explanation from AI' });
  }
});

// Stripe Checkout
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Full Access to PlainLegal',
            },
            unit_amount: 999,
          },
          quantity: 1,
        },
      ],
      success_url: 'http://localhost:3000/success.html',
      cancel_url: 'http://localhost:3000/cancel.html',
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Stripe session creation failed' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
