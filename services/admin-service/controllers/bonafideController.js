const primaryDb = require('../../../shared/db/primary');
const replicaDb = require('../../../shared/db/replica');
const redisClient = require('../../../shared/cache/redis');
const generateBonafideDocx = require('../../../shared/helper/generateBonafideDocx');

const invalidateAdminCaches = async () => {
  let cursor = '0';
  do {
    const reply = await redisClient.scan(cursor, 'MATCH', 'admin_list:*', 'COUNT', 100);
    cursor = reply[0];
    const keys = reply[1];
    if (keys && keys.length > 0) {
      await redisClient.del(keys);
    }
  } while (cursor !== '0');
};

const getAdminForms = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    const { rollno, name } = req.query;

    const cacheKey = `admin_list:${page}:${rollno || ''}:${name || ''}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    let queryText = 'SELECT id, form_data, downloaded, created_at FROM bonafide_forms WHERE 1=1';
    const params = [];
    let paramCounter = 1;

    if (rollno) {
      queryText += ` AND form_data->>'rollno' ILIKE $${paramCounter}`;
      params.push(`%${rollno}%`);
      paramCounter++;
    }

    if (name) {
      queryText += ` AND form_data->>'name' ILIKE $${paramCounter}`;
      params.push(`%${name}%`);
      paramCounter++;
    }

    // Get count first
    let countQuery = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countRes = await replicaDb.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count);

    queryText += ` ORDER BY created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limit, offset);

    const formsRes = await replicaDb.query(queryText, params);
    const totalPages = Math.ceil(total / limit);

    const payload = {
      forms: formsRes.rows,
      currentPage: page,
      totalPages,
      totalCount: total,
    };

    // Cache page results for 30s
    await redisClient.set(cacheKey, JSON.stringify(payload), 'EX', 30);

    return res.json(payload);
  } catch (err) {
    console.error('Get Admin Forms Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch certificate applications.' });
  }
};

const toggleDownloaded = async (req, res) => {
  const { id } = req.params;
  const { downloaded } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'ID is required.' });
  }

  try {
    await primaryDb.query(
      'UPDATE bonafide_forms SET downloaded = $1 WHERE id = $2',
      [!!downloaded, id]
    );

    // Clean list caches
    await invalidateAdminCaches();

    return res.json({ success: true, message: 'Status updated successfully.' });
  } catch (err) {
    console.error('Toggle Downloaded Error:', err.message);
    return res.status(500).json({ error: 'Failed to update downloaded status.' });
  }
};

const downloadDocx = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await replicaDb.query('SELECT form_data FROM bonafide_forms WHERE id = $1', [id]);
    const form = result.rows[0];

    if (!form) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Automatically flag downloaded status to true when docx is downloaded
    await primaryDb.query(
      'UPDATE bonafide_forms SET downloaded = true WHERE id = $1',
      [id]
    );

    // Clear active redis cache pages
    await invalidateAdminCaches();

    const gBuffer = await generateBonafideDocx(form.form_data);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=bonafide-${id}.docx`);
    return res.send(gBuffer);
  } catch (err) {
    console.error('Download DOCX Error:', err.message);
    return res.status(500).json({ error: 'Failed to generate download.' });
  }
};

const getStudentHistoryForAdmin = async (req, res) => {
  try {
    const { rollno } = req.params;
    if (!rollno) {
      return res.status(400).json({ error: 'Roll number is required.' });
    }
    const result = await replicaDb.query(
      `SELECT id, form_data, downloaded, created_at 
       FROM bonafide_forms 
       WHERE form_data->>'rollno' = $1 
       ORDER BY created_at DESC`,
      [rollno]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get Student History For Admin Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch student history.' });
  }
};

module.exports = {
  getAdminForms,
  toggleDownloaded,
  downloadDocx,
  getStudentHistoryForAdmin,
};
