const { Pool } = require('pg');
const primary = require('./primary');

const replicaPool = new Pool({
  connectionString: process.env.DATABASE_REPLICA_URL,
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: async (text, params) => {
    try {
      return await replicaPool.query(text, params);
    } catch (err) {
      console.error('Replica read failed, falling back to primary pool:', err.message);
      return primary.query(text, params);
    }
  },
  pool: replicaPool,
};
