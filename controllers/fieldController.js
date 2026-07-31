const replicaDb = require('../db/replica');
const primaryDb = require('../db/primary');
const redisClient = require('../cache/redis');

const getFields = async (req, res) => {
  try {
    const cachedFields = await redisClient.get('form_fields:active');
    if (cachedFields) {
      return res.json(JSON.parse(cachedFields));
    }

    const result = await replicaDb.query(
      'SELECT * FROM form_fields WHERE is_active = true ORDER BY sort_order ASC'
    );
    await redisClient.set('form_fields:active', JSON.stringify(result.rows), 'EX', 300); // 5 min cache

    return res.json(result.rows);
  } catch (err) {
    req.log.error('Get Form Fields Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to fetch form fields.' });
  }
};

const getAdminFields = async (req, res) => {
  try {
    const result = await replicaDb.query('SELECT * FROM form_fields ORDER BY sort_order ASC');
    return res.json(result.rows);
  } catch (err) {
    req.log.error('Get Admin Form Fields Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to fetch all form fields.' });
  }
};

const createOrUpdateField = async (req, res) => {
  const { key, label, field_type, options, placeholder, hint, required, is_active, sort_order } = req.body;
  if (!key || !label) {
    return res.status(400).json({ error: 'Key and Label are required.' });
  }

  try {
    await primaryDb.query(
      `INSERT INTO form_fields (key, label, field_type, options, placeholder, hint, required, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (key) DO UPDATE SET
         label = EXCLUDED.label,
         field_type = EXCLUDED.field_type,
         options = EXCLUDED.options,
         placeholder = EXCLUDED.placeholder,
         hint = EXCLUDED.hint,
         required = EXCLUDED.required,
         is_active = EXCLUDED.is_active,
         sort_order = EXCLUDED.sort_order`,
      [key, label, field_type || 'text', JSON.stringify(options || []), placeholder || '', hint || '', !!required, is_active !== false, sort_order || 0]
    );

    await redisClient.del('form_fields:active');
    return res.json({ success: true, message: 'Form field saved successfully.' });
  } catch (err) {
    req.log.error('Save Form Field Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to save form field.' });
  }
};

const deleteField = async (req, res) => {
  const { key } = req.params;
  try {
    await primaryDb.query('DELETE FROM form_fields WHERE key = $1', [key]);
    await redisClient.del('form_fields:active');
    return res.json({ success: true, message: 'Form field deleted.' });
  } catch (err) {
    req.log.error('Delete Form Field Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to delete form field.' });
  }
};

module.exports = {
  getFields,
  getAdminFields,
  createOrUpdateField,
  deleteField,
};
