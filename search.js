const db = require('../lib/db');
const route = require('../lib/http');
const DEMO = require('../lib/demo-data');

// Public family lookup. Returns logging status only, never medical notes or court data.
const SELECT = `select a.detainee_name, s.station_name, a.status, a.arrest_timestamp, a.digital_log_timestamp
                from arrest_logs a join police_stations s on s.station_id = a.police_station_id`;

function demoMatches({ nid, name, station }) {
  if (process.env.DEMO_DATA === 'off') return [];
  return DEMO.filter((d) =>
    nid ? d.national_id_no === nid
        : d.detainee_name.toLowerCase() === name.toLowerCase() && d.station_name.toLowerCase() === station.toLowerCase()
  ).map(({ national_id_no, ...visible }) => visible); // the NID is never sent back
}

module.exports = route({ method: 'GET' }, async (req, res) => {
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
      : await db().query(
          `${SELECT} where lower(a.detainee_name) = lower($1) and lower(s.station_name) = lower($2)
           order by a.arrest_timestamp desc limit 10`, [name, station]);
    rows = r.rows;
  } catch (e) {
    if (!demo.length) throw e; // no demo match and no database: report the real error
    console.error('Database unavailable, answering from demo data only:', e.message);
  }
  res.status(200).json({ results: [...demo, ...rows].slice(0, 10) });
});
