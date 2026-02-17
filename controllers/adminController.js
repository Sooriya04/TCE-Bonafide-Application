const { db } = require('../config/firebase');

exports.getAdminPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    const { rollno, name } = req.query;

    let snap = await db
      .collection('bonafideForms')
      .orderBy('createdAt', 'desc')
      .get();

    let allForms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (rollno) {
      allForms = allForms.filter((f) =>
        f.rollno?.toString().toLowerCase().includes(rollno.toLowerCase())
      );
    }
    if (name) {
      allForms = allForms.filter((f) =>
        f.name?.toLowerCase().includes(name.toLowerCase())
      );
    }

    const total = allForms.length;
    const totalPages = Math.ceil(total / limit);
    const forms = allForms.slice(offset, offset + limit);

    return res.render('admin', {
      forms,
      currentPage: page,
      totalPages,
      rollno,
      name,
    });
  } catch (err) {
    console.error('Error loading admin page:', err);
    return res.status(500).send('Error loading admin page');
  }
};

exports.toggleDownloaded = async (req, res) => {
  try {
    const { id } = req.params;
    const { downloaded } = req.body;

    if (!id) return res.status(400).json({ error: 'Missing id' });

    await db.collection('bonafideForms').doc(id).update({
      downloaded: !!downloaded,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Error toggling downloaded status:', err);
    return res.status(500).json({ error: 'Failed to update' });
  }
};
