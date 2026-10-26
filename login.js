const bcrypt = require('bcryptjs');
const db = require('../lib/db');
const route = require('../lib/http');
const { setSession } = require('../lib/auth');

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12); // keeps timing similar for unknown IDs

module.exports = route({ method: 'POST' }, async (req, res) => {
  const { police_id, password } = req.body || {};
  if (typeof police_id !== 'string' || typeof password !== 'string' || !police_id.trim() || !password) {
    return res.status(400).json({ error: 'Enter your POLICE ID and password.' });
  }
  const r = await db().query('select police_id, password_hash from police_users where police_id = $1', [police_id.trim()]);
  const row = r.rows[0];
  const ok = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
  if (!row || !ok) return res.status(401).json({ error: 'POLICE ID or password is wrong.' });
  setSession(res, row.police_id);
  res.status(200).json({ ok: true });
});
