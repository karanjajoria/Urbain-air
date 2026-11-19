const express = require('express');
const path = require('path');
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// tiny in-memory rate limit: 20 API calls / minute / IP (protects free Gemini quota)
const hits = new Map();
app.use('/api', (req, res, next) => {
  const now = Date.now();
  const a = (hits.get(req.ip) || []).filter(t => now - t < 60000);
  a.push(now); hits.set(req.ip, a);
  if (a.length > 20) return res.status(429).json({ error: 'Too many requests. Wait a minute and retry.' });
  next();
});

// ---------- Live air quality (Open-Meteo: free, no key) ----------
app.get('/api/air', async (req, res) => {
  try {
    let { lat, lon, city } = req.query, name = 'Your location';
    if (!lat || !lon) {
      if (!city) return res.status(400).json({ error: 'Enter a city.' });
      const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(String(city).slice(0, 80))}&count=1`)).json();
      if (!g.results?.length) return res.status(404).json({ error: 'City not found. Try a nearby larger city.' });
      ({ latitude: lat, longitude: lon, name } = g.results[0]);
    }
    const u = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&hourly=pm2_5&forecast_days=2&timezone=auto`;
    const a = await (await fetch(u)).json();
    if (!a.current) return res.status(502).json({ error: 'Air data unavailable for this place.' });
    const i0 = Math.max(0, a.hourly.time.findIndex(t => t >= a.current.time));
    const next = a.hourly.time.slice(i0, i0 + 24).map((t, i) => ({ t, pm: a.hourly.pm2_5[i0 + i] })).filter(h => h.pm != null);
    const best = next.reduce((m, h) => (h.pm < m.pm ? h : m), next[0]);
    const worst = next.reduce((m, h) => (h.pm > m.pm ? h : m), next[0]);
    res.json({ city: name, aqi: a.current.us_aqi, pm2_5: a.current.pm2_5, pm10: a.current.pm10,
      no2: a.current.nitrogen_dioxide, ozone: a.current.ozone, cleanestHour: best?.t, cleanestPm: best?.pm,
      dirtiestHour: worst?.t, dirtiestPm: worst?.pm, forecast: next });
  } catch (e) { res.status(502).json({ error: 'Could not reach the air-quality service.' }); }
});

// ---------- Gemini (Google AI Studio free tier) ----------
async function gemini(system, user, json) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.4, ...(json ? { responseMimeType: 'application/json' } : {}) }
    })
  });
  const j = await r.json();
  const t = j.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
  if (!t) throw new Error('empty');
  return json ? JSON.parse(t) : t;
}

const SYS = `You are an urban air-quality coach for families in cities with severe winter smog (e.g. Delhi NCR, Lahore, Dhaka, Beijing).
Given live air data and a household profile, return ONLY JSON:
{"headline":string,"risk":"low|moderate|high|severe",
"routine":[{"when":string,"action":string,"why":string,"impact":string}],
"indoor":[{"hack":string,"cost":string,"why":string,"impact":string}],
"swaps":[{"instead_of":string,"try":string,"impact":string}],
"protect":[string],"community":[string]}
Rules: 4-5 routine items ordered through the day, using the cleanest/dirtiest hours given. 4 indoor hacks (prefer free or under 500 INR). 3 swaps matching their commute/heating/cooking. 3 protect tips for vulnerable members. 2 community actions.
Every "impact" must quantify or concretely explain the effect (e.g. "cuts your child's PM2.5 dose by roughly a third", "removes ~1 kg CO2 per trip") and be honest about uncertainty; never invent precise medical claims. Be tailored to the profile, practical, kind, no diagnoses. For asthma, heart disease or symptoms, advise seeing a doctor. Plain language, short sentences.`;

const clean = (v, n = 40) => String(v ?? '').slice(0, n);
function rulePlan(air, p) {
  const bad = air.aqi > 150, vul = p.kids || p.elderly || p.respiratory || p.pregnant;
  return {
    headline: bad ? 'Air is unhealthy today. Keep outdoor time short.' : 'Air is manageable. Stay mindful at peak hours.',
    risk: air.aqi > 300 ? 'severe' : air.aqi > 150 ? 'high' : air.aqi > 100 ? 'moderate' : 'low',
    routine: [
      { when: 'Morning', action: 'Skip outdoor exercise before 10 am; do it indoors.', why: 'Cold, still air traps smoke close to the ground at dawn.', impact: 'Heavy breathing outdoors can raise the dose of fine particles you inhale several-fold.' },
      { when: 'Cleanest window', action: `Do errands and school runs near ${air.cleanestHour?.slice(11, 16) || 'midday'}.`, why: 'Pollution dips when the sun warms and mixes the air.', impact: `Forecast shows about ${Math.round(air.cleanestPm)} vs ${Math.round(air.dirtiestPm)} µg/m³ at the worst hour.` },
      { when: 'Evening', action: 'Close windows before sunset and keep children indoors.', why: 'Smoke from cooking and heating fires builds after dark.', impact: 'Sealing gaps can keep indoor PM2.5 well below outdoor levels.' },
    ],
    indoor: [
      { hack: 'Seal door and window gaps with tape or a rolled towel.', cost: 'Free', why: 'Leaks let smog in.', impact: 'Slows outdoor air entering your home.' },
      { hack: 'Wet-mop floors instead of sweeping.', cost: 'Free', why: 'Sweeping lifts settled dust.', impact: 'Less re-suspended dust in your breathing zone.' },
      { hack: 'Build a box-fan + HEPA/MERV filter purifier.', cost: '~800 INR', why: 'Filters particles from a room.', impact: 'Can cut room PM2.5 by half or more when windows are shut.' },
    ],
    swaps: [
      { instead_of: 'Burning wood, coal or waste for warmth', try: 'Layered clothing, hot water bottle, electric heater', impact: 'Removes a major local smoke source.' },
      { instead_of: 'Short car trips', try: 'Metro, bus, or a shared ride', impact: 'Fewer tailpipe particles and NO2 on your street.' },
    ],
    protect: vul ? ['Keep a well-fitted N95/FFP2 mask for unavoidable outdoor time.', 'Keep prescribed inhalers and medicines within reach.'] : ['Use an N95 mask if you must be outside at peak hours.'],
    community: ['Ask neighbours not to burn leaves or trash.', 'Report open burning to your city helpline.']
  };
}

app.post('/api/plan', async (req, res) => {
  const { air, profile } = req.body || {};
  if (!air || typeof air.pm2_5 !== 'number') return res.status(400).json({ error: 'Missing air data.' });
  const a = { city: clean(air.city, 60), aqi: +air.aqi, pm2_5: +air.pm2_5, pm10: +air.pm10, no2: +air.no2, ozone: +air.ozone,
    cleanestHour: clean(air.cleanestHour), cleanestPm: +air.cleanestPm, dirtiestHour: clean(air.dirtiestHour), dirtiestPm: +air.dirtiestPm };
  const p = { kids: !!profile?.kids, elderly: !!profile?.elderly, respiratory: !!profile?.respiratory, pregnant: !!profile?.pregnant,
    commute: clean(profile?.commute), heating: clean(profile?.heating), cooking: clean(profile?.cooking), purifier: clean(profile?.purifier) };
  if (!KEY) return res.json({ source: 'rules', plan: rulePlan(a, p) });
  try { res.json({ source: 'gemini', plan: await gemini(SYS, JSON.stringify({ air: a, profile: p }), true) }); }
  catch { res.json({ source: 'rules', plan: rulePlan(a, p) }); }
});

app.post('/api/ask', async (req, res) => {
  const q = clean(req.body?.question, 300), c = clean(req.body?.context, 600);
  if (!q) return res.status(400).json({ error: 'Ask a question.' });
  if (!KEY) return res.json({ answer: 'Ask needs a Gemini API key on the server. See the README.' });
  try {
    res.json({ answer: await gemini('You are a concise, practical urban air-quality coach. Answer in under 120 words, explain the effect of the suggested choice, and suggest a doctor for medical concerns.', `Context: ${c}\nQuestion: ${q}`, false) });
  } catch { res.status(502).json({ error: 'The assistant is busy. Try again shortly.' }); }
});

app.listen(process.env.PORT || 8080, () => console.log('Urban Air Assistant running'));
