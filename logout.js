const route = require('../lib/http');
const { clearSession } = require('../lib/auth');

module.exports = route({ method: 'POST' }, async (req, res) => {
  clearSession(res);
  res.status(200).json({ ok: true });
});
