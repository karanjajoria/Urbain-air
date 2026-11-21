// Live air data from Open-Meteo (free, no key needed).
const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';

// Look at the next 24 hourly PM2.5 values and pick the best and worst hour.
function summariseForecast(times, values, nowIso) {
  const start = Math.max(0, times.findIndex(t => t >= nowIso));
  const forecast = times.slice(start, start + 24)
    .map((t, i) => ({ t, pm: values[start + i] }))
    .filter(h => h.pm != null);
  if (!forecast.length) return { forecast, cleanest: null, dirtiest: null };
  const cleanest = forecast.reduce((m, h) => (h.pm < m.pm ? h : m));
  const dirtiest = forecast.reduce((m, h) => (h.pm > m.pm ? h : m));
  return { forecast, cleanest, dirtiest };
}

async function findCity(name) {
  const r = await fetch(`${GEO}?name=${encodeURIComponent(name.slice(0, 80))}&count=1`);
  const g = await r.json();
  const hit = g.results?.[0];
  return hit ? { lat: hit.latitude, lon: hit.longitude, name: hit.name } : null;
}

async function fetchAir(lat, lon, name) {
  const url = `${AIR}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&hourly=pm2_5&forecast_days=2&timezone=auto`;
  const d = await (await fetch(url)).json();
  if (!d.current) return null;
  const { forecast, cleanest, dirtiest } = summariseForecast(d.hourly.time, d.hourly.pm2_5, d.current.time);
  return {
    city: name, aqi: d.current.us_aqi, pm2_5: d.current.pm2_5, pm10: d.current.pm10,
    no2: d.current.nitrogen_dioxide, ozone: d.current.ozone,
    cleanestHour: cleanest?.t, cleanestPm: cleanest?.pm, dirtiestHour: dirtiest?.t, dirtiestPm: dirtiest?.pm, forecast
  };
}

module.exports = { summariseForecast, findCity, fetchAir };
