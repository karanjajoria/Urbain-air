// Simple per-IP limiter so one visitor cannot burn the free Gemini quota.
function createLimiter(max = 20, windowMs = 60000) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter(t => now - t < windowMs);
    recent.push(now);
    hits.set(req.ip, recent);
    if (hits.size > 5000) for (const [ip, ts] of hits) if (now - ts[ts.length - 1] > windowMs) hits.delete(ip);
    if (recent.length > max) return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    next();
  };
}
module.exports = { createLimiter };
