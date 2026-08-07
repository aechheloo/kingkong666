function safeCompare(left = '', right = '') {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
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
