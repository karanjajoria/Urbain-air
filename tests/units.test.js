const test = require('node:test');
const assert = require('node:assert');
const { cleanAir, cleanProfile, pickLang } = require('../src/validate');
const { summariseForecast } = require('../src/aqi');
const { rulePlan } = require('../src/rules');
const { createLimiter } = require('../src/ratelimit');

const air = { city: 'Delhi', aqi: 320, pm2_5: 180, pm10: 250, no2: 40, ozone: 20, cleanestHour: '2026-11-21T14:00', cleanestPm: 90, dirtiestHour: '2026-11-21T07:00', dirtiestPm: 260 };

test('cleanAir rejects missing or non-numeric PM2.5', () => {
  assert.strictEqual(cleanAir(null), null);
  assert.strictEqual(cleanAir({ pm2_5: '12' }), null);
});
test('cleanAir trims long text', () => {
  assert.strictEqual(cleanAir({ ...air, city: 'x'.repeat(500) }).city.length, 60);
});
test('cleanProfile turns flags into booleans and limits text', () => {
  const p = cleanProfile({ kids: 'yes', commute: 'y'.repeat(100) });
  assert.strictEqual(p.kids, true);
  assert.strictEqual(p.elderly, false);
  assert.strictEqual(p.commute.length, 40);
});
test('pickLang only accepts hi, otherwise English', () => {
  assert.strictEqual(pickLang('hi'), 'hi');
  assert.strictEqual(pickLang('<script>'), 'en');
});
test('summariseForecast finds the best and worst hour and skips nulls', () => {
  const times = ['2026-11-21T10:00', '2026-11-21T11:00', '2026-11-21T12:00', '2026-11-21T13:00'];
  const r = summariseForecast(times, [120, null, 60, 200], '2026-11-21T10:00');
  assert.strictEqual(r.forecast.length, 3);
  assert.strictEqual(r.cleanest.t, '2026-11-21T12:00');
  assert.strictEqual(r.dirtiest.t, '2026-11-21T13:00');
});
test('summariseForecast copes with no data', () => {
  assert.strictEqual(summariseForecast([], [], 'x').cleanest, null);
});
test('rulePlan returns every section in English', () => {
  const p = rulePlan(air, { kids: true }, 'en');
  for (const k of ['routine', 'indoor', 'swaps', 'protect', 'community']) assert.ok(p[k].length > 0, k);
  assert.strictEqual(p.risk, 'severe');
});
test('rulePlan gives Devanagari text in Hindi', () => {
  assert.match(rulePlan(air, {}, 'hi').headline, /[\u0900-\u097F]/);
});
test('rulePlan adds extra protection tips for vulnerable households', () => {
  assert.ok(rulePlan(air, { elderly: true }, 'en').protect.length > rulePlan(air, {}, 'en').protect.length);
});
test('limiter blocks after the limit', () => {
  const limit = createLimiter(2, 1000);
  let status = 200;
  const res = { status(c) { status = c; return this; }, json() {} };
  for (let i = 0; i < 3; i++) limit({ ip: '1.1.1.1' }, res, () => {});
  assert.strictEqual(status, 429);
});
