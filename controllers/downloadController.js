const { db } = require('../config/firebase');
const generateBonafideDocx = require('../helper/generateBonafideDocx');

exports.downloadDocx = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).send('Missing id parameter');
    }

    const docSnap = await db.collection('bonafideForms').doc(id).get();

    if (!docSnap.exists) {
      return res.status(404).send('Form not found');
    }

    const rawData = docSnap.data() || {};

    // Determine him/her based on title
    const getHimHer = (title) => {
      if (!title) return 'him/her';
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('miss') || lowerTitle === 'ms' || lowerTitle.includes('mrs.')) {
        return 'her';
      }
      if (lowerTitle === 'mr') {
        return 'him';
      }
      return 'him/her';
    };

    const formData = {
      title: (rawData.title || '').toString(),
      name: (rawData.name || '').toString(),
      rollno: (rawData.rollno || '').toString(),
      relation: (rawData.relation || '').toString(),
      parentName: (rawData.parentName || '').toString(),
      year: (rawData.year || '').toString(),
      course: (rawData.course || '').toString(),
      branch: (rawData.branch || '').toString(),
      certificateFor: (rawData.certificateFor || '').toString(),
      scholarshipType: (rawData.scholarshipType || '').toString(),
      date: (rawData.date || '').toString(),
      academicYear: (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0 is January
        // If current month is before June (month 5), academic year is (year-1) - year
        if (month < 5) {
          return `${year - 1} - ${year}`;
        }
        // If current month is June or later, academic year is year - (year+1)
        return `${year} - ${year + 1}`;
      })(),
      cYear: (rawData.cYear || '').toString(),
      himHer: getHimHer(rawData.title)
    };

    const buffer = await generateBonafideDocx(formData);

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const fileName = `${day}-${month}-${year}-bonafide-certificate-${formData.rollno || id}.docx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });

    return res.send(buffer);

  } catch (err) {
    console.error('Error in downloadDocx controller:', err);

    if (err.properties && err.properties.errors) {
      console.error('Template errors:', JSON.stringify(err.properties.errors, null, 2));
      return res.status(500).send('Template formatting error');
    }

    return res.status(500).send('Error generating document');
  }
};
