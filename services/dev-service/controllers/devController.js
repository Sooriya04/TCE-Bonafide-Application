const http = require('http');
const primaryDb = require('../../../shared/db/primary');
const replicaDb = require('../../../shared/db/replica');
const redisClient = require('../../../shared/cache/redis');

// Helper to ping health endpoint of external services
function pingService(urlStr) {
  return new Promise((resolve) => {
    if (!urlStr) return resolve(false);
    try {
      const url = new URL(urlStr + '/health');
      const req = http.get({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        timeout: 1000
      }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch (_) {
      resolve(false);
    }
  });
}

const getHealth = async (req, res) => {
  const checks = {
    postgres_primary: false,
    postgres_replica: false,
    redis: false,
    student_service: false,
    admin_service: false,
  };

  try {
    await primaryDb.query('SELECT 1');
    checks.postgres_primary = true;
  } catch (_) {
    checks.postgres_primary = false;
  }

  try {
    await replicaDb.query('SELECT 1');
    checks.postgres_replica = true;
  } catch (_) {
    checks.postgres_replica = false;
  }

  try {
    await redisClient.ping();
    checks.redis = true;
  } catch (_) {
    checks.redis = false;
  }

  // Ping student and admin microservices
  const [studentHealth, adminHealth] = await Promise.all([
    pingService(process.env.STUDENT_SERVICE_URL),
    pingService(process.env.ADMIN_SERVICE_URL)
  ]);

  checks.student_service = studentHealth;
  checks.admin_service = adminHealth;

  const isHealthy = Object.values(checks).every(v => v === true);
  return res.status(isHealthy ? 200 : 200).json({ // Return 200 even if degraded to let dashboard see individual service checks
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
    console.error('Dev Metrics Fetch Error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve metrics.' });
  }
};

const getLogs = async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const level  = req.query.level  || null;
    const search = req.query.search || null;
    const timeframe = req.query.timeframe || null;

    let where = [];
    const params = [];
    let p = 1;

    if (level) {
      where.push(`level = $${p++}`);
      params.push(level);
    }
    if (search) {
      where.push(`message ILIKE $${p++}`);
      params.push(`%${search}%`);
    }
    if (timeframe) {
      let interval = '';
      if (timeframe === '1h') interval = "1 hour";
      else if (timeframe === '3h') interval = "3 hour";
      else if (timeframe === '1d') interval = "1 day";
      else if (timeframe === '1w') interval = "7 day";
      else if (timeframe === '1m') interval = "30 day";

      if (interval) {
        where.push(`created_at >= NOW() - INTERVAL '${interval}'`);
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await replicaDb.query(
      `SELECT COUNT(*) FROM app_logs ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const logsRes = await replicaDb.query(
      `SELECT id, level, message, meta, created_at FROM app_logs ${whereClause}
       ORDER BY created_at DESC LIMIT $${p} OFFSET $${p + 1}`,
      [...params, limit, offset]
    );

    return res.json({
      logs: logsRes.rows,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error('Dev fetch logs error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve log data.' });
  }
};

const getLogsCount = async (req, res) => {
  try {
    const level  = req.query.level  || null;
    const search = req.query.search || null;
    const timeframe = req.query.timeframe || null;
    let where = [];
    const params = [];
    let p = 1;
    if (level)  { where.push(`level = $${p++}`); params.push(level); }
    if (search) { where.push(`message ILIKE $${p++}`); params.push(`%${search}%`); }
    if (timeframe) {
      let interval = '';
      if (timeframe === '1h') interval = "1 hour";
      else if (timeframe === '3h') interval = "3 hour";
      else if (timeframe === '1d') interval = "1 day";
      else if (timeframe === '1w') interval = "7 day";
      else if (timeframe === '1m') interval = "30 day";

      if (interval) {
        where.push(`created_at >= NOW() - INTERVAL '${interval}'`);
      }
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const res2 = await replicaDb.query(`SELECT COUNT(*) FROM app_logs ${whereClause}`, params);
    return res.json({ total: parseInt(res2.rows[0].count, 10) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get log count.' });
  }
};

const streamLogs = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const level  = req.query.level  || null;
  const search = req.query.search || null;

  let lastId = 0;

  try {
    const maxRes = await replicaDb.query('SELECT MAX(id) FROM app_logs');
    lastId = parseInt(maxRes.rows[0].max) || 0;
  } catch (_) {}

  const poll = async () => {
    try {
      let where = [`id > $1`];
      const params = [lastId];
      let p = 2;
      if (level)  { where.push(`level = $${p++}`); params.push(level); }
      if (search) { where.push(`message ILIKE $${p++}`); params.push(`%${search}%`); }

      const result = await replicaDb.query(
        `SELECT id, level, message, meta, created_at FROM app_logs
         WHERE ${where.join(' AND ')}
         ORDER BY id ASC LIMIT 50`,
        params
      );

      for (const row of result.rows) {
        res.write(`data: ${JSON.stringify(row)}\n\n`);
        lastId = row.id;
      }
    } catch (err) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    }
  };

  const interval = setInterval(poll, 2000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
};

const getDevUsers = async (req, res) => {
  try {
    const result = await replicaDb.query(
      "SELECT id, name, email, role, created_at FROM users WHERE role = 'dev' ORDER BY created_at DESC"
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get Dev Users Error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve developers.' });
  }
};

const addDevUser = async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and Name are required.' });
  }

  try {
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
    console.error('Add Dev User Error:', err.message);
    return res.status(500).json({ error: 'Failed to add developer.' });
  }
};

const deleteDevUser = async (req, res) => {
  const { id } = req.params;
  try {
    await primaryDb.query(
      "UPDATE users SET role = 'student' WHERE id = $1",
      [id]
    );
    return res.json({ success: true, message: 'Developer role revoked.' });
  } catch (err) {
    console.error('Revoke Dev User Error:', err.message);
    return res.status(500).json({ error: 'Failed to revoke developer access.' });
  }
};

module.exports = {
  getHealth,
  getMetrics,
  getLogs,
  getLogsCount,
  streamLogs,
  getDevUsers,
  addDevUser,
  deleteDevUser,
};
