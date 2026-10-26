-- Run once in your Postgres database.

create table if not exists police_stations (
  station_id   serial primary key,
  station_name text not null,
  district     text not null default ''
);
create unique index if not exists police_stations_name_uq on police_stations (lower(station_name));

-- Accounts are created by a senior officer / admin (see scripts/create-user.js). No public sign-up.
create table if not exists police_users (
  police_id     text primary key,
  password_hash text not null,
  station_id    integer references police_stations(station_id),
  created_at    timestamptz not null default now()
);

create table if not exists arrest_logs (
  arrest_id             text primary key,
  detainee_name         text not null,
  national_id_no        text not null,
  police_station_id     integer not null references police_stations(station_id),
  arrest_timestamp      timestamptz not null,
  digital_log_timestamp timestamptz not null default now(),
  status                text not null check (status in
    ('Active','Logged_On_Time','Late_Log_Penalty_Triggered','Remand','Released')),
  logged_by             text references police_users(police_id)
);
create index if not exists arrest_logs_nid_idx  on arrest_logs (national_id_no);
create index if not exists arrest_logs_name_idx on arrest_logs (lower(detainee_name));

create table if not exists medical_records (
  record_id       serial primary key,
  arrest_id       text not null references arrest_logs(arrest_id),
  stage           text not null check (stage in ('Pre_Remand','Post_Remand')),
  hospital_name   text not null,
  doctor_id       text not null,
  injury_notes    text not null,
  check_timestamp timestamptz not null,
  logged_by       text references police_users(police_id)
);
create index if not exists medical_arrest_idx on medical_records (arrest_id);

create table if not exists court_logs (
  log_id                        serial primary key,
  arrest_id                     text not null references arrest_logs(arrest_id),
  magistrate_court_id           text,
  sms_sent_status               boolean not null default false,
  evidence_admissibility_status text not null check (evidence_admissibility_status in
    ('Valid','Void_Due_To_Late_Log'))
);
create index if not exists court_arrest_idx on court_logs (arrest_id);
