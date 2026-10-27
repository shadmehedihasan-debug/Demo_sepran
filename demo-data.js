// 4 demo arrest records. They live only in the backend: the pages never list them,
// they can only be found through the search. Set DEMO_DATA=off to switch them off.
module.exports = [
  { detainee_name: 'Demo Person One',   national_id_no: '1000000000001', station_name: 'Demo Police Station',
    status: 'Logged_On_Time',            arrest_timestamp: '2026-10-20T04:30:00.000Z', digital_log_timestamp: '2026-10-20T05:10:00.000Z' },
  { detainee_name: 'Demo Person Two',   national_id_no: '1000000000002', station_name: 'Demo Police Station',
    status: 'Late_Log_Penalty_Triggered', arrest_timestamp: '2026-10-21T02:00:00.000Z', digital_log_timestamp: '2026-10-21T09:30:00.000Z' },
  { detainee_name: 'Demo Person Three', national_id_no: '1000000000003', station_name: 'Demo Police Station',
    status: 'Remand',                    arrest_timestamp: '2026-10-22T06:15:00.000Z', digital_log_timestamp: '2026-10-22T06:50:00.000Z' },
  { detainee_name: 'Demo Person Four',  national_id_no: '1000000000004', station_name: 'Demo Police Station',
    status: 'Released',                  arrest_timestamp: '2026-10-23T08:00:00.000Z', digital_log_timestamp: '2026-10-23T08:25:00.000Z' }
];
