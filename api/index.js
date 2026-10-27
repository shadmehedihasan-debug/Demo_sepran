// DEMO UNIT backend in ONE file. Handles /api/login, /api/logout, /api/search, /api/arrests, /api/medical.
const crypto = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
 
// ---------- database ----------
let pool;
const db = () => pool || (pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 }));
 
// ---------- login cookie ----------
const COOKIE = 'dl_session';
const MAX_AGE = 8 * 60 * 60;
function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET must be set (32+ characters).');
  return s;
}
function readCookies(h = '') {
  const out = {};
  h.split(';').forEach((p) => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
const setSession = (res, id) => res.setHeader('Set-Cookie',
  `${COOKIE}=${jwt.sign({ sub: id }, secret(), { expiresIn: MAX_AGE })}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`);
const clearSession = (res) => res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
function getSession(req) {
  try { const t = readCookies(req.headers.cookie)[COOKIE]; return t ? jwt.verify(t, secret()) : null; } catch (e) { return null; }
}
 
// ---------- 4 demo arrests (backend only, never listed on any page; DEMO_DATA=off disables) ----------
const DEMO = [
  { detainee_name: 'Demo Person One',   national_id_no: '1000000000001', station_name: 'Demo Police Station', status: 'Logged_On_Time',            arrest_timestamp: '2026-10-20T04:30:00.000Z', digital_log_timestamp: '2026-10-20T05:10:00.000Z' },
  { detainee_name: 'Demo Person Two',   national_id_no: '1000000000002', station_name: 'Demo Police Station', status: 'Late_Log_Penalty_Triggered', arrest_timestamp: '2026-10-21T02:00:00.000Z', digital_log_timestamp: '2026-10-21T09:30:00.000Z' },
  { detainee_name: 'Demo Person Three', national_id_no: '1000000000003', station_name: 'Demo Police Station', status: 'Remand',                    arrest_timestamp: '2026-10-22T06:15:00.000Z', digital_log_timestamp: '2026-10-22T06:50:00.000Z' },
  { detainee_name: 'Demo Person Four',  national_id_no: '1000000000004', station_name: 'Demo Police Station', status: 'Released',                  arrest_timestamp: '2026-10-23T08:00:00.000Z', digital_log_timestamp: '2026-10-23T08:25:00.000Z' }
];
function demoMatches({ nid, name, station }) {
  if (process.env.DEMO_DATA === 'off') return [];
  return DEMO.filter((d) => nid ? d.national_id_no === nid
    : d.detainee_name.toLowerCase() === name.toLowerCase() && d.station_name.toLowerCase() === station.toLowerCase()
  ).map(({ national_id_no, ...visible }) => visible); // the NID is never sent back
}
 
// ---------- handlers ----------
let dummyHash;
const SELECT = `select a.detainee_name, s.station_name, a.status, a.arrest_timestamp, a.digital_log_timestamp
                from arrest_logs a join police_stations s on s.station_id = a.police_station_id`;
 
const routes = {
  login: { method: 'POST', async run(req, res) {
    const { police_id, password } = req.body || {};
    if (typeof police_id !== 'string' || typeof password !== 'string' || !police_id.trim() || !password)
      return res.status(400).json({ error: 'Enter your POLICE ID and password.' });
    const r = await db().query('select police_id, password_hash from police_users where police_id = $1', [police_id.trim()]);
    const row = r.rows[0];
    dummyHash = dummyHash || bcrypt.hashSync('not-a-real-password', 12);
    const ok = await bcrypt.compare(password, row ? row.password_hash : dummyHash);
    if (!row || !ok) return res.status(401).json({ error: 'POLICE ID or password is wrong.' });
    setSession(res, row.police_id);
    res.status(200).json({ ok: true });
  } },
 
  logout: { method: 'POST', async run(req, res) { clearSession(res); res.status(200).json({ ok: true }); } },
 
  search: { method: 'GET', async run(req, res) {
    const nid = String(req.query.nid || '').trim();
    const name = String(req.query.name || '').trim();
    const station = String(req.query.station || '').trim();
    if (nid) {
      if (!/^\d{10,17}$/.test(nid)) return res.status(400).json({ error: 'Enter the NID as 10 to 17 digits.' });
    } else if (!(name && station)) {
      return res.status(400).json({ error: 'Enter an NID, or a full name and a police station.' });
    }
    const demo = demoMatches({ nid, name, station });
    let rows = [];
    try {
      const r = nid
        ? await db().query(`${SELECT} where a.national_id_no = $1 order by a.arrest_timestamp desc limit 10`, [nid])
        : await db().query(`${SELECT} where lower(a.detainee_name) = lower($1) and lower(s.station_name) = lower($2) order by a.arrest_timestamp desc limit 10`, [name, station]);
      rows = r.rows;
    } catch (e) {
      if (!demo.length) throw e;
      console.error('Database unavailable, answering from demo data only:', e.message);
    }
    res.status(200).json({ results: [...demo, ...rows].slice(0, 10) });
  } },
 
  arrests: { method: 'POST', auth: true, async run(req, res, session) {
    const b = req.body || {};
    const name = String(b.detainee_name || '').trim();
    const nid = String(b.nid || '').trim();
    const stationName = String(b.station || '').trim();
    const arrestedAt = new Date(b.arrested_at);
    const requested = ['Active', 'Logged_On_Time', 'Remand', 'Released'].includes(b.status) ? b.status : 'Logged_On_Time';
    if (name.length < 2 || name.length > 120) return res.status(400).json({ error: 'Enter the detainee name.' });
    if (!/^\d{10,17}$/.test(nid)) return res.status(400).json({ error: 'Enter the NID as 10 to 17 digits.' });
    if (!stationName) return res.status(400).json({ error: 'Enter the police station.' });
    if (isNaN(arrestedAt)) return res.status(400).json({ error: 'Enter the date and time of arrest.' });
    const now = new Date();
    if (arrestedAt - now > 5 * 60 * 1000) return res.status(400).json({ error: 'The arrest time can’t be in the future.' });
    const late = (now - arrestedAt) / 3600000 > Number(process.env.LATE_LOG_HOURS || 2); // the system decides "late"
    const status = late ? 'Late_Log_Penalty_Triggered' : requested;
    const evidence = late ? 'Void_Due_To_Late_Log' : 'Valid';
    const arrestId = 'ARR-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    const client = await db().connect();
    try {
      await client.query('begin');
      const st = await client.query('select station_id from police_stations where lower(station_name) = lower($1)', [stationName]);
      if (!st.rows[0]) { await client.query('rollback'); return res.status(400).json({ error: 'That police station isn’t in the system.' }); }
      await client.query(
        `insert into arrest_logs (arrest_id, detainee_name, national_id_no, police_station_id, arrest_timestamp, digital_log_timestamp, status, logged_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [arrestId, name, nid, st.rows[0].station_id, arrestedAt.toISOString(), now.toISOString(), status, session.sub]);
      await client.query('insert into court_logs (arrest_id, sms_sent_status, evidence_admissibility_status) values ($1, false, $2)', [arrestId, evidence]);
      await client.query('commit');
    } catch (e) {
      await client.query('rollback').catch(() => {});
      throw e;
    } finally { client.release(); }
    res.status(201).json({ arrest_id: arrestId, status, late });
  } },
 
  medical: { method: 'POST', auth: true, async run(req, res, session) {
    const b = req.body || {};
    const arrestId = String(b.arrest_id || '').trim().toUpperCase();
    const hospital = String(b.hospital_name || '').trim();
    const doctor = String(b.doctor_id || '').trim();
    const notes = String(b.injury_notes || '').trim();
    const checkedAt = new Date(b.checked_at);
    if (!arrestId) return res.status(400).json({ error: 'Enter the arrest ID.' });
    if (!['Pre_Remand', 'Post_Remand'].includes(b.stage)) return res.status(400).json({ error: 'Choose before or after remand.' });
    if (!hospital || !doctor || !notes) return res.status(400).json({ error: 'Fill in the hospital, doctor ID and injury notes.' });
    if (isNaN(checkedAt)) return res.status(400).json({ error: 'Enter the time of examination.' });
    const found = await db().query('select 1 from arrest_logs where arrest_id = $1', [arrestId]);
    if (!found.rows[0]) return res.status(404).json({ error: 'No arrest found with that ID.' });
    await db().query(
      `insert into medical_records (arrest_id, stage, hospital_name, doctor_id, injury_notes, check_timestamp, logged_by)
       values ($1,$2,$3,$4,$5,$6,$7)`, [arrestId, b.stage, hospital, doctor, notes, checkedAt.toISOString(), session.sub]);
    res.status(201).json({ ok: true });
  } }
};
 
// ---------- router ----------
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const path = new URL(req.url, 'http://localhost').pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const name = !path || path === 'index' ? String((req.query && req.query.route) || '') : path;
  const h = Object.prototype.hasOwnProperty.call(routes, name) ? routes[name] : null;
  if (!h) return res.status(404).json({ error: 'Not found.' });
  if (req.method !== h.method) return res.status(405).json({ error: 'Method not allowed.' });
  let session = null;
  if (h.auth) {
    session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Log in as police first.' });
  }
  try { await h.run(req, res, session); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Server error. Try again.' }); }
};
 
