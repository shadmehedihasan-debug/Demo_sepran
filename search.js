const db = require('../lib/db');
const route = require('../lib/http');

// Public family lookup. Returns logging status only, never medical notes or court data.
const SELECT = `select a.detainee_name, s.station_name, a.status, a.arrest_timestamp, a.digital_log_timestamp
                from arrest_logs a join police_stations s on s.station_id = a.police_station_id`;

module.exports = route({ method: 'GET' }, async (req, res) => {
  const nid = String(req.query.nid || '').trim();
  const name = String(req.query.name || '').trim();
  const station = String(req.query.station || '').trim();
  let r;
  if (nid) {
    if (!/^\d{10,17}$/.test(nid)) return res.status(400).json({ error: 'Enter the NID as 10 to 17 digits.' });
    r = await db().query(`${SELECT} where a.national_id_no = $1 order by a.arrest_timestamp desc limit 10`, [nid]);
  } else if (name && station) {
    r = await db().query(
      `${SELECT} where lower(a.detainee_name) = lower($1) and lower(s.station_name) = lower($2)
       order by a.arrest_timestamp desc limit 10`, [name, station]);
  } else {
    return res.status(400).json({ error: 'Enter an NID, or a full name and a police station.' });
  }
  res.status(200).json({ results: r.rows });
});
