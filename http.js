const { getSession } = require('./auth');

// Wraps a handler: method check, optional login check, JSON errors, no caching.
module.exports = function route({ method, auth = false }, fn) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== method) return res.status(405).json({ error: 'Method not allowed.' });
    let session = null;
    if (auth) {
      session = getSession(req);
      if (!session) return res.status(401).json({ error: 'Log in as police first.' });
    }
    try {
      await fn(req, res, session);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error. Try again.' });
    }
  };
};
