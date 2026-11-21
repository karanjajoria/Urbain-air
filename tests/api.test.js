const test = require('node:test');
const assert = require('node:assert');
delete process.env.GEMINI_API_KEY; // force the offline rules path
const app = require('../server');

let server, base;
test.before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
test.after(() => server.close());

const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const air = { city: 'Delhi', aqi: 200, pm2_5: 110, pm10: 160, no2: 30, ozone: 10, cleanestHour: '2026-11-21T14:00', cleanestPm: 60, dirtiestHour: '2026-11-21T07:00', dirtiestPm: 150 };

test('POST /api/plan without air data is a 400', async () => {
  assert.strictEqual((await post('/api/plan', {})).status, 400);
});
test('POST /api/plan falls back to rules when no Gemini key is set', async () => {
  const j = await (await post('/api/plan', { air, profile: { kids: true }, lang: 'hi' })).json();
  assert.strictEqual(j.source, 'rules');
  assert.match(j.plan.headline, /[\u0900-\u097F]/);
});
test('POST /api/ask needs a question', async () => {
  assert.strictEqual((await post('/api/ask', {})).status, 400);
});
test('GET /api/air needs a city or coordinates', async () => {
  assert.strictEqual((await fetch(base + '/api/air')).status, 400);
});
test('responses carry security headers', async () => {
  const r = await fetch(base + '/');
  assert.strictEqual(r.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(r.headers.get('content-security-policy').includes("script-src 'self'"));
});
