const { timingSafeEqual } = require('crypto');

function safeCompare(left = '', right = '') {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  const length = Math.max(leftBuffer.length, rightBuffer.length, 1);
  const paddedLeft = Buffer.alloc(length);
  const paddedRight = Buffer.alloc(length);

  leftBuffer.copy(paddedLeft);
  rightBuffer.copy(paddedRight);

  return timingSafeEqual(paddedLeft, paddedRight) && leftBuffer.length === rightBuffer.length;
}

function parseBasicAuth(header = '') {
  if (!header.startsWith('Basic ')) {
    return null;
  }

  const base64 = header.slice(6);
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0) {
    return null;
  }

  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

module.exports = function adminAuth(req, res, next) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return res.status(503).send('Admin auth is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD.');
  }

  const credentials = parseBasicAuth(req.headers.authorization);

  if (
    !credentials
    || !safeCompare(credentials.username, expectedUsername)
    || !safeCompare(credentials.password, expectedPassword)
  ) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Thu Chi Luong Admin"');
    return res.status(401).send('Authentication required.');
  }

  req.adminUser = credentials.username;
  return next();
};
