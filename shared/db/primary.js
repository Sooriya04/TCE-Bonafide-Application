const { Pool } = require('pg');

const primaryPool = new Pool({
  connectionString: process.env.DATABASE_PRIMARY_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: (text, params) => primaryPool.query(text, params),
  pool: primaryPool,
};
