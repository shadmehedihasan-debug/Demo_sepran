// Creates a police account (and the station if it is new).
// Usage: DATABASE_URL=... node scripts/create-user.js <POLICE_ID> <PASSWORD> "<Station name>" ["District"]
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const [, , policeId, password, stationName, district = ''] = process.argv;
if (!policeId || !password || !stationName || password.length < 10) {
  console.error('Usage: node scripts/create-user.js <POLICE_ID> <PASSWORD (10+ chars)> "<Station name>" ["District"]');
  process.exit(1);
}
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    let st = await pool.query('select station_id from police_stations where lower(station_name) = lower($1)', [stationName]);
    if (!st.rows[0]) {
      st = await pool.query('insert into police_stations (station_name, district) values ($1,$2) returning station_id', [stationName, district]);
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query('insert into police_users (police_id, password_hash, station_id) values ($1,$2,$3)', [policeId, hash, st.rows[0].station_id]);
    console.log('Created account', policeId, 'at', stationName);
  } finally {
    await pool.end();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
