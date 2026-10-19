// Rate limiting — dependency-free fixed-window limiter keyed by IP + bucket.
// Buckets are configured via env: RATE_LIMIT_{BUCKET}_MAX and RATE_LIMIT_WINDOW_MS.
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAXS } = require('../config');

// ip -> bucket -> { count, resetAt }
const hits = new Map();

// periodic sweep so stale IPs don't accumulate in memory
setInterval(() => {
  const now = Date.now();
  for (const [ip, buckets] of hits) {
    for (const [name, win] of Object.entries(buckets)) {
      if (now >= win.resetAt) delete buckets[name];
    }
    if (!Object.keys(buckets).length) hits.delete(ip);
  }
}, Math.max(RATE_LIMIT_WINDOW_MS, 30_000)).unref();

function clientIp(req) {
  // behind nginx/pm2 the socket IP is the proxy; prefer forwarded chain
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimit(bucket) {
  const max = RATE_LIMIT_MAXS[bucket];
  if (!max) throw new Error(`rateLimit: unknown bucket "${bucket}"`);
  return function limited(req, res, next) {
    const now = Date.now();
    const ip = clientIp(req);
    let buckets = hits.get(ip);
    if (!buckets) { buckets = {}; hits.set(ip, buckets); }
    let win = buckets[bucket];
    if (!win || now >= win.resetAt) {
      win = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
      buckets[bucket] = win;
    }
    win.count++;
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - win.count));
    res.setHeader('RateLimit-Reset', Math.ceil((win.resetAt - now) / 1000));
    if (win.count > max) {
      const retry = Math.ceil((win.resetAt - now) / 1000);
      res.setHeader('Retry-After', retry);
      return res.status(429).json({ error: `Too many requests. Try again in ${retry}s.` });
    }
    next();
  };
}

module.exports = { rateLimit, clientIp };
