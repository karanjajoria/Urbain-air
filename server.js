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

<<<<<<< HEAD
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
=======
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
  if (!t) throw new Error(JSON.stringify(j.error || j).slice(0, 300));
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
Every "impact" must quantify or concretely explain the effect (e.g. "cuts your child's PM2.5 dose by roughly a third", "removes ~1 kg CO2 per trip") and be honest about uncertainty; never invent precise medical claims. Be tailored to the profile, practical, kind, no diagnoses. For asthma, heart disease or symptoms, advise seeing a doctor. Plain language, short sentences. Write every text value in the language named by respond_in.`;

const clean = (v, n = 40) => String(v ?? '').slice(0, n);
function rulePlan(air, p, lang) {
  if (lang === 'hi') return rulePlanHi(air, p);
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


function rulePlanHi(air, p) {
  const bad = air.aqi > 150, vul = p.kids || p.elderly || p.respiratory || p.pregnant, hr = air.cleanestHour?.slice(11, 16) || 'दोपहर';
  return {
    headline: bad ? 'हवा आज ख़राब है। बाहर कम से कम समय बिताएँ।' : 'हवा ठीक है, फिर भी भीड़ वाले समय में सावधान रहें।',
    risk: air.aqi > 300 ? 'severe' : air.aqi > 150 ? 'high' : air.aqi > 100 ? 'moderate' : 'low',
    routine: [
      { when: 'सुबह', action: 'सुबह 10 बजे से पहले बाहर कसरत न करें; घर के अंदर करें।', why: 'ठंडी, ठहरी हवा में धुआँ ज़मीन के पास जमा रहता है।', impact: 'बाहर तेज़ साँस लेने से महीन कणों की मात्रा कई गुना बढ़ सकती है।' },
      { when: 'सबसे साफ़ समय', action: `काम और स्कूल की आवाजाही लगभग ${hr} के आसपास करें।`, why: 'धूप से हवा गर्म होकर मिलती है तो प्रदूषण घटता है।', impact: `पूर्वानुमान: सबसे साफ़ समय पर लगभग ${Math.round(air.cleanestPm)}, सबसे ख़राब समय पर ${Math.round(air.dirtiestPm)} µg/m³।` },
      { when: 'शाम', action: 'सूर्यास्त से पहले खिड़कियाँ बंद कर लें और बच्चों को घर में रखें।', why: 'अँधेरा होने के बाद खाना पकाने और अलाव का धुआँ बढ़ता है।', impact: 'दरारें बंद करने से घर के अंदर की धूल बाहर से काफ़ी कम रह सकती है।' }
    ],
    indoor: [
      { hack: 'दरवाज़े-खिड़की की दरारें टेप या लपेटे तौलिये से बंद करें।', cost: 'मुफ़्त', why: 'दरारों से स्मॉग अंदर आता है।', impact: 'बाहर की हवा का अंदर आना धीमा होता है।' },
      { hack: 'झाड़ू की जगह गीले पोंछे से फ़र्श साफ़ करें।', cost: 'मुफ़्त', why: 'झाड़ू से बैठी धूल फिर उड़ती है।', impact: 'साँस की ऊँचाई पर धूल कम रहती है।' },
      { hack: 'बॉक्स फ़ैन और HEPA/MERV फ़िल्टर से सस्ता प्यूरीफ़ायर बनाएँ।', cost: '~800 रुपये', why: 'फ़िल्टर कमरे की महीन धूल पकड़ता है।', impact: 'खिड़कियाँ बंद हों तो कमरे का PM2.5 आधा या उससे भी कम हो सकता है।' }
    ],
    swaps: [
      { instead_of: 'गर्मी के लिए लकड़ी, कोयला या कचरा जलाना', try: 'गरम कपड़ों की परतें, गरम पानी की बोतल, बिजली का हीटर', impact: 'स्थानीय धुएँ का एक बड़ा स्रोत हट जाता है।' },
      { instead_of: 'छोटी दूरी की कार यात्रा', try: 'मेट्रो, बस या साझा सवारी', impact: 'आपकी गली में धुआँ और NO₂ कम होता है।' }
    ],
    protect: vul ? ['बाहर जाना ही पड़े तो अच्छी तरह फ़िट होने वाला N95/FFP2 मास्क पहनें।', 'डॉक्टर की बताई दवाएँ और इन्हेलर पास रखें।'] : ['भीड़ वाले समय में बाहर जाना पड़े तो N95 मास्क पहनें।'],
    community: ['पड़ोसियों से पत्ते या कचरा न जलाने को कहें।', 'खुले में जलाने की शिकायत अपने शहर की हेल्पलाइन पर करें।']
  };
}

app.post('/api/plan', async (req, res) => {
  const { air, profile } = req.body || {};
  const lang = req.body?.lang === 'hi' ? 'hi' : 'en';
  if (!air || typeof air.pm2_5 !== 'number') return res.status(400).json({ error: 'Missing air data.' });
  const a = { city: clean(air.city, 60), aqi: +air.aqi, pm2_5: +air.pm2_5, pm10: +air.pm10, no2: +air.no2, ozone: +air.ozone,
    cleanestHour: clean(air.cleanestHour), cleanestPm: +air.cleanestPm, dirtiestHour: clean(air.dirtiestHour), dirtiestPm: +air.dirtiestPm };
  const p = { kids: !!profile?.kids, elderly: !!profile?.elderly, respiratory: !!profile?.respiratory, pregnant: !!profile?.pregnant,
    commute: clean(profile?.commute), heating: clean(profile?.heating), cooking: clean(profile?.cooking), purifier: clean(profile?.purifier) };
  if (!KEY) return res.json({ source: 'rules', plan: rulePlan(a, p, lang) });
  try { res.json({ source: 'gemini', plan: await gemini(SYS, JSON.stringify({ air: a, profile: p, respond_in: req.body?.lang === 'hi' ? 'Hindi (Devanagari script)' : 'English' }), true) }); }
  catch (e) { console.error('Gemini failed:', e.message); res.json({ source: 'rules', plan: rulePlan(a, p, lang) }); }
});

app.post('/api/ask', async (req, res) => {
  const q = clean(req.body?.question, 300), c = clean(req.body?.context, 600);
  if (!q) return res.status(400).json({ error: 'Ask a question.' });
  if (!KEY) return res.json({ answer: req.body?.lang === 'hi' ? 'सवाल पूछने के लिए सर्वर पर Gemini API कुंजी चाहिए।' : 'Ask needs a Gemini API key on the server. See the README.' });
>>>>>>> 1406ebcfd493f8fa0737aca1225f6b7c948c447c
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
