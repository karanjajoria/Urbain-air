// Everything that arrives from the browser is cleaned here before it goes anywhere else.
const clip = (v, n = 40) => String(v ?? '').slice(0, n);
const pickLang = l => (l === 'hi' ? 'hi' : 'en');

function cleanAir(a) {
  if (!a || typeof a.pm2_5 !== 'number') return null;
  return {
    city: clip(a.city, 60), aqi: +a.aqi, pm2_5: +a.pm2_5, pm10: +a.pm10, no2: +a.no2, ozone: +a.ozone,
    cleanestHour: clip(a.cleanestHour), cleanestPm: +a.cleanestPm,
    dirtiestHour: clip(a.dirtiestHour), dirtiestPm: +a.dirtiestPm
  };
}

function cleanProfile(p = {}) {
  return {
    kids: !!p.kids, elderly: !!p.elderly, respiratory: !!p.respiratory, pregnant: !!p.pregnant,
    commute: clip(p.commute), heating: clip(p.heating), cooking: clip(p.cooking), purifier: clip(p.purifier)
  };
}

module.exports = { clip, pickLang, cleanAir, cleanProfile };
