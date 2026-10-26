const { Pool } = require('pg');
let pool;
module.exports = function db() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  return pool;
};
