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
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    const { level } = req.query;

    let queryText = 'SELECT * FROM app_logs';
    const params = [];

    if (level) {
      queryText += ' WHERE level = $1';
      params.push(level);
    }

    // Get total count
    const countRes = await replicaDb.query(`SELECT COUNT(*) FROM (${queryText}) AS temp`, params);
    const total = parseInt(countRes.rows[0].count);

    queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const logsRes = await replicaDb.query(queryText, params);

    return res.json({
      logs: logsRes.rows,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalCount: total,
    });
  } catch (err) {
    console.error('Dev fetch logs error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve log data.' });
  }
};

module.exports = {
  getHealth,
  getMetrics,
  getLogs,
};
