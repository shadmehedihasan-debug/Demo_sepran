const jwt = require('jsonwebtoken');
const COOKIE = 'dl_session';
const MAX_AGE = 8 * 60 * 60; // 8 hours

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET must be set (32+ characters).');
  return s;
}
function parseCookies(header = '') {
  const out = {};
  header.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function setSession(res, policeId) {
  const token = jwt.sign({ sub: policeId }, secret(), { expiresIn: MAX_AGE });
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`);
}
function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
}
function getSession(req) {
  try {
    const t = parseCookies(req.headers.cookie)[COOKIE];
    return t ? jwt.verify(t, secret()) : null;
  } catch (e) {
    return null;
  }
}
module.exports = { setSession, clearSession, getSession };
