const primaryDb = require('../db/primary');
const replicaDb = require('../db/replica');
const redisClient = require('../cache/redis');

const getHealth = async (req, res) => {
  const checks = {
    postgres_primary: false,
    postgres_replica: false,
    redis: false,
  };

  try {
    const primary = require('../db/primary');
    await primary.query('SELECT 1');
    checks.postgres_primary = true;
  } catch (err) {
    checks.postgres_primary = false;
  }

  try {
    await replicaDb.query('SELECT 1');
    checks.postgres_replica = true;
  } catch (err) {
    checks.postgres_replica = false;
  }

  try {
    await redisClient.ping();
    checks.redis = true;
  } catch (err) {
    checks.redis = false;
  }

  const isHealthy = Object.values(checks).every(v => v === true);
  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
};

const getMetrics = async (req, res) => {
  try {
    const memory = process.memoryUsage();
    const upTime = process.uptime();
    const redisInfo = await redisClient.info('memory');

    return res.json({
      uptime_seconds: upTime,
      memory: {
        rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      },
      redis_memory_info: redisInfo.split('\r\n').filter(line => line.startsWith('used_memory_human')),
    });
  } catch (err) {
    req.log.error('Dev Metrics Fetch Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve metrics.' });
  }
};

const getLogs = async (req, res) => {
  try {
    const limit = 30; // Limit to last 30 logs as requested
    const { level } = req.query;

    let queryText = 'SELECT id, level, message, meta, created_at FROM app_logs';
    const params = [];

    if (level) {
      queryText += ' WHERE level = $1';
      params.push(level);
    }

    queryText += ` ORDER BY created_at DESC LIMIT ${limit}`;
    const logsRes = await replicaDb.query(queryText, params);

    return res.json({
      logs: logsRes.rows
    });
  } catch (err) {
    console.error('Dev fetch logs error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve log data.' });
  }
};

const getDevUsers = async (req, res) => {
  try {
    const result = await replicaDb.query(
      "SELECT id, name, email, role, created_at FROM users WHERE role = 'dev' ORDER BY created_at DESC"
    );
    return res.json(result.rows);
  } catch (err) {
    req.log.error('Get Dev Users Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve developers.' });
  }
};

const addDevUser = async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and Name are required.' });
  }

  try {
    // Insert new developer account or upsert role to dev if user exists
    await primaryDb.query(
      `INSERT INTO users (name, email, role, verified)
       VALUES ($1, $2, 'dev', true)
       ON CONFLICT (email) DO UPDATE SET
         role = 'dev',
         name = EXCLUDED.name`,
      [name, email]
    );

    return res.json({ success: true, message: 'Developer added successfully.' });
  } catch (err) {
    req.log.error('Add Dev User Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to add developer.' });
  }
};

const deleteDevUser = async (req, res) => {
  const { id } = req.params;
  try {
    // Revoke dev access by setting role back to 'student' instead of deleting user account entirely
    // (so student can still apply for certificates)
    await primaryDb.query(
      "UPDATE users SET role = 'student' WHERE id = $1",
      [id]
    );
    return res.json({ success: true, message: 'Developer role revoked.' });
  } catch (err) {
    req.log.error('Revoke Dev User Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to revoke developer access.' });
  }
};

module.exports = {
  getHealth,
  getMetrics,
  getLogs,
  getDevUsers,
  addDevUser,
  deleteDevUser,
};
