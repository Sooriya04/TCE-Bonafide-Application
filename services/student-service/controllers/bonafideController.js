const primaryDb = require('../../../shared/db/primary');
const replicaDb = require('../../../shared/db/replica');
const redisClient = require('../../../shared/cache/redis');
const { sendBonafideNotification } = require('../../../shared/helper/sendBonafideNotification');

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
    const docId = `${formData.rollno}_${sanitizedPurpose}_${Date.now()}`;

    // Cooldown check (5 minutes) based on student email + purpose to prevent duplicate spamming
    const existing = await primaryDb.query(
      `SELECT created_at FROM bonafide_forms 
       WHERE form_data->>'email' = $1 AND form_data->>'certificateFor' = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [req.session.user.email, formData.certificateFor]
    );

    if (existing.rows.length > 0) {
      const diffMs = now - new Date(existing.rows[0].created_at);
      if (diffMs < 5 * 60 * 1000) {
        return res.status(429).json({ error: 'Please wait 5 minutes before submitting another request for the same purpose.' });
      }
    }

    await primaryDb.query(
      `INSERT INTO bonafide_forms (id, form_data, created_at, downloaded) 
       VALUES ($1, $2, $3, $4)`,
      [docId, JSON.stringify(fullData), now, false]
    );

    // Invalidate Redis admin cache
    await invalidateAdminCaches();

    // Send asynchronous confirmation email to student
    sendBonafideNotification(req.session.user.email, fullData).catch(() => {});

    return res.status(201).json({ id: docId, message: 'Application submitted successfully.' });
  } catch (err) {
    console.error('Submit Form Error:', err.message);
    return res.status(500).json({ error: 'Failed to process application.' });
  }
};

const getStudentForms = async (req, res) => {
  try {
    const studentEmail = req.session.user.email;
    const rollNoPrefix = studentEmail ? studentEmail.split('@')[0].toUpperCase().trim() : '';

    const result = await replicaDb.query(
      `SELECT id, form_data, downloaded, created_at 
       FROM bonafide_forms 
       WHERE form_data->>'email' = $1 OR UPPER(form_data->>'rollno') = $2
       ORDER BY created_at DESC`,
      [studentEmail, rollNoPrefix]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get Student Forms Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch your applications.' });
  }
};

module.exports = {
  submitForm,
  getStudentForms,
};
