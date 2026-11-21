const express = require('express');
const path = require('path');
const { cleanAir, cleanProfile, pickLang, clip } = require('./src/validate');
const { findCity, fetchAir } = require('./src/aqi');
const { rulePlan } = require('./src/rules');
const gemini = require('./src/gemini');
const { createLimiter } = require('./src/ratelimit');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'"
  });
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', createLimiter());

app.get('/api/air', async (req, res) => {
  try {
    let { lat, lon, city } = req.query;
    let name = 'Your location';
    if (!lat || !lon) {
      if (!city) return res.status(400).json({ error: 'Enter a city.' });
      const hit = await findCity(String(city));
      if (!hit) return res.status(404).json({ error: 'City not found. Try a nearby larger city.' });
      ({ lat, lon, name } = hit);
    }
    const air = await fetchAir(lat, lon, name);
    if (!air) return res.status(502).json({ error: 'Air data is not available for this place.' });
    res.json(air);
  } catch {
    res.status(502).json({ error: 'Could not reach the air-quality service.' });
  }
});

app.post('/api/plan', async (req, res) => {
  const air = cleanAir(req.body?.air);
  if (!air) return res.status(400).json({ error: 'Missing air data.' });
  const profile = cleanProfile(req.body?.profile);
  const lang = pickLang(req.body?.lang);
  const fallback = () => res.json({ source: 'rules', plan: rulePlan(air, profile, lang) });
  if (!gemini.isConfigured()) return fallback();
  try {
    const user = JSON.stringify({ air, profile, respond_in: lang === 'hi' ? 'Hindi (Devanagari script)' : 'English' });
    res.json({ source: 'gemini', plan: await gemini.generate({ system: gemini.PLAN_PROMPT, user, json: true }) });
  } catch (e) {
    console.error('Gemini failed:', e.message);
    fallback();
  }
});

app.post('/api/ask', async (req, res) => {
  const question = clip(req.body?.question, 300);
  const context = clip(req.body?.context, 600);
  const lang = pickLang(req.body?.lang);
  if (!question) return res.status(400).json({ error: 'Ask a question.' });
  if (!gemini.isConfigured()) {
    return res.json({ answer: lang === 'hi' ? 'सवाल पूछने के लिए सर्वर पर Gemini API कुंजी चाहिए।' : 'Questions need a Gemini API key on the server. See the README.' });
  }
  try {
    const user = `Respond in: ${lang === 'hi' ? 'Hindi (Devanagari script)' : 'English'}\nContext: ${context}\nQuestion: ${question}`;
    res.json({ answer: await gemini.generate({ system: gemini.ASK_PROMPT, user, json: false }) });
  } catch {
    res.status(502).json({ error: 'The assistant is busy. Try again shortly.' });
  }
});

if (require.main === module) {
  app.listen(process.env.PORT || 8080, () => console.log('Urban Air Assistant is running'));
}
module.exports = app;
