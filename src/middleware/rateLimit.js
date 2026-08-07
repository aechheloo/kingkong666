const rateLimit = require('express-rate-limit');

const windowMs = Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS) || 60_000;
const maxRequests = Number(process.env.ADMIN_RATE_LIMIT_MAX) || 60;

module.exports = rateLimit({
  windowMs,
  limit: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please try again later.',
});
