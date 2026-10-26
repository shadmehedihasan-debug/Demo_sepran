const crypto = require('crypto');
const db = require('../lib/db');
const route = require('../lib/http');

const OFFICER_STATUSES = ['Active', 'Logged_On_Time', 'Remand', 'Released'];

module.exports = route({ method: 'POST', auth: true }, async (req, res, session) => {
  const b = req.body || {};
  const name = String(b.detainee_name || '').trim();
  const nid = String(b.nid || '').trim();
  const stationName = String(b.station || '').trim();
  const arrestedAt = new Date(b.arrested_at);
  const requested = OFFICER_STATUSES.includes(b.status) ? b.status : 'Logged_On_Time';

  if (name.length < 2 || name.length > 120) return res.status(400).json({ error: 'Enter the detainee name.' });
  if (!/^\d{10,17}$/.test(nid)) return res.status(400).json({ error: 'Enter the NID as 10 to 17 digits.' });
  if (!stationName) return res.status(400).json({ error: 'Enter the police station.' });
  if (isNaN(arrestedAt)) return res.status(400).json({ error: 'Enter the date and time of arrest.' });

  const now = new Date();
  if (arrestedAt - now > 5 * 60 * 1000) return res.status(400).json({ error: 'The arrest time can’t be in the future.' });

  // The system decides "late", the officer does not.
  const lateHours = Number(process.env.LATE_LOG_HOURS || 2);
  const late = (now - arrestedAt) / 3600000 > lateHours;
  const status = late ? 'Late_Log_Penalty_Triggered' : requested;
  const evidence = late ? 'Void_Due_To_Late_Log' : 'Valid';
  const arrestId = 'ARR-' + crypto.randomBytes(5).toString('hex').toUpperCase();

  const client = await db().connect();
  try {
    await client.query('begin');
    const st = await client.query('select station_id from police_stations where lower(station_name) = lower($1)', [stationName]);
    if (!st.rows[0]) {
      await client.query('rollback');
      return res.status(400).json({ error: 'That police station isn’t in the system.' });
    }
    await client.query(
      `insert into arrest_logs (arrest_id, detainee_name, national_id_no, police_station_id, arrest_timestamp, digital_log_timestamp, status, logged_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [arrestId, name, nid, st.rows[0].station_id, arrestedAt.toISOString(), now.toISOString(), status, session.sub]);
    await client.query(
      'insert into court_logs (arrest_id, sms_sent_status, evidence_admissibility_status) values ($1, false, $2)',
      [arrestId, evidence]);
    await client.query('commit');
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  res.status(201).json({ arrest_id: arrestId, status, late });
});
