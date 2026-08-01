const primaryDb = require('../db/primary');
const replicaDb = require('../db/replica');
const redisClient = require('../cache/redis');
const generateBonafideDocx = require('../helper/generateBonafideDocx');
const { sendBonafideNotification } = require('../helper/sendBonafideNotification');

// Non-blocking cursor-based scanning to invalidate matched admin list caches
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

const submitForm = async (req, res) => {
  const formData = req.body;
  if (!formData.rollno || !formData.name || !formData.certificateFor) {
    return res.status(400).json({ error: 'Roll No, Name, and Purpose are required fields.' });
  }

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth();
    const academicYear = month < 5 ? `${currentYear - 1} - ${currentYear}` : `${currentYear} - ${currentYear + 1}`;

    const day = String(now.getDate()).padStart(2, '0');
    const displayMonth = String(now.getMonth() + 1).padStart(2, '0');
    const todayDate = `${currentYear}-${displayMonth}-${day}`;

    // Compute title values
    const lowerTitle = (formData.title || '').toLowerCase().trim();
    let himHer = 'him/her';
    if (lowerTitle.includes('mr') || lowerTitle.includes('shri')) {
      himHer = 'him';
    } else if (lowerTitle.includes('ms') || lowerTitle.includes('mrs') || lowerTitle.includes('miss')) {
      himHer = 'her';
    }

    const fullData = {
      ...formData,
      email: req.session.user.email,
      date: todayDate,
      academicYear,
      cYear: currentYear,
      himHer,
    };

    const sanitizedPurpose = (formData.certificateFor || 'Other').replace(/[^a-zA-Z0-9]/g, '_');
    // Using Date.now() guarantees unique records for multiple same-day submissions
    const docId = `${formData.rollno}_${sanitizedPurpose}_${Date.now()}`;

    // Cooldown check (5 minutes) based on student email + purpose to prevent duplicate spamming
    const existing = await primaryDb.query(
      `SELECT created_at FROM bonafide_forms 
       WHERE form_data->>'email' = $1 AND form_data->>'certificateFor' = $2
       ORDER BY created_at DESC LIMIT 1`,
      [req.session.user.email, formData.certificateFor]
    );

    if (existing.rows[0]) {
      const lastCreatedAt = new Date(existing.rows[0].created_at);
      const diffMs = Date.now() - lastCreatedAt.getTime();
      const diffMins = diffMs / 60000;

      if (diffMins < 5) {
        const waitMins = Math.ceil(5 - diffMins);
        return res.status(429).json({
          error: `You recently submitted a request for ${formData.certificateFor}. Please wait for ${waitMins} more minute(s) before trying again.`,
        });
      }
    }

    // Save to PostgreSQL. Insert as a distinct new record.
    await primaryDb.query(
      `INSERT INTO bonafide_forms (id, form_data, created_at, downloaded)
       VALUES ($1, $2, $3, false)`,
      [docId, JSON.stringify(fullData), now]
    );

    // Invalidate Redis caches for admin list
    await invalidateAdminCaches();

    // Generate Word Document asynchronously
    try {
      const gBuffer = await generateBonafideDocx(fullData);
      const gFileName = `${day}-${displayMonth}-${currentYear}-bonafide-certificate-${formData.rollno}.docx`;

      sendBonafideNotification(fullData, gBuffer, gFileName)
        .catch(err => req.log.error('Background Notification Error', { error: err.message }));
    } catch (docxErr) {
      req.log.error('Error generating document buffer', { error: docxErr.message });
    }

    return res.json({ success: true, message: 'Application submitted successfully!', id: docId });
  } catch (err) {
    req.log.error('Form Submit Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to process bonafide certificate request.' });
  }
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
    req.log.error('Get Admin Forms Error', { error: err.message });
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
    req.log.error('Toggle Downloaded Error', { error: err.message });
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
    req.log.error('Download DOCX Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to generate download.' });
  }
};

const getStudentForms = async (req, res) => {
  try {
    const studentEmail = req.session.user.email;
    // Query forms submitted by this student email
    const result = await replicaDb.query(
      `SELECT id, form_data, downloaded, created_at 
       FROM bonafide_forms 
       WHERE form_data->>'email' = $1 
       ORDER BY created_at DESC`,
      [studentEmail]
    );
    return res.json(result.rows);
  } catch (err) {
    req.log.error('Get Student Forms Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to fetch your applications.' });
  }
};

module.exports = {
  submitForm,
  getAdminForms,
  toggleDownloaded,
  downloadDocx,
  getStudentForms,
};
