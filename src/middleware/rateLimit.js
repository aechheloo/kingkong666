const requestsByIp = new Map();

const windowMs = Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS) || 60_000;
const maxRequests = Number(process.env.ADMIN_RATE_LIMIT_MAX) || 60;

function cleanup(now) {
  for (const [ip, entry] of requestsByIp.entries()) {
    if (entry.resetAt <= now) {
      requestsByIp.delete(ip);
    }
  }
}

module.exports = function rateLimit(req, res, next) {
  const now = Date.now();
  cleanup(now);

  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const current = requestsByIp.get(ip);

  if (!current || current.resetAt <= now) {
    requestsByIp.set(ip, {
      count: 1,
      resetAt: now + windowMs,
    });
    return next();
  }

  if (current.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader('Retry-After', retryAfterSeconds);
    return res.status(429).send('Too many requests. Please try again later.');
  }

  current.count += 1;
  return next();
};
