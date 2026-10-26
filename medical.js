const db = require('../lib/db');
const route = require('../lib/http');

module.exports = route({ method: 'POST', auth: true }, async (req, res, session) => {
  const b = req.body || {};
  const arrestId = String(b.arrest_id || '').trim().toUpperCase();
  const stage = b.stage;
  const hospital = String(b.hospital_name || '').trim();
  const doctor = String(b.doctor_id || '').trim();
  const notes = String(b.injury_notes || '').trim();
  const checkedAt = new Date(b.checked_at);

  if (!arrestId) return res.status(400).json({ error: 'Enter the arrest ID.' });
  if (!['Pre_Remand', 'Post_Remand'].includes(stage)) return res.status(400).json({ error: 'Choose before or after remand.' });
  if (!hospital || !doctor || !notes) return res.status(400).json({ error: 'Fill in the hospital, doctor ID and injury notes.' });
  if (isNaN(checkedAt)) return res.status(400).json({ error: 'Enter the time of examination.' });

  const found = await db().query('select 1 from arrest_logs where arrest_id = $1', [arrestId]);
  if (!found.rows[0]) return res.status(404).json({ error: 'No arrest found with that ID.' });

  await db().query(
    `insert into medical_records (arrest_id, stage, hospital_name, doctor_id, injury_notes, check_timestamp, logged_by)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [arrestId, stage, hospital, doctor, notes, checkedAt.toISOString(), session.sub]);
  res.status(201).json({ ok: true });
});
