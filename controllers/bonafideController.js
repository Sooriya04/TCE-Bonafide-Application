const { db } = require('../config/firebase');

function getHimHerFromTitle(title) {
  if (!title) return 'him/her';

  const lowerTitle = title.toLowerCase().trim();

  if (lowerTitle.includes('mr.') || lowerTitle === 'mr' || lowerTitle.includes('shri') || lowerTitle.includes('sri')) {
    return 'him';
  }

  if (lowerTitle.includes('ms.') || lowerTitle.includes('mrs.') || lowerTitle.includes('miss') ||
    lowerTitle === 'ms' || lowerTitle === 'mrs' || lowerTitle.includes('kumari') || lowerTitle.includes('smt')) {
    return 'her';
  }

  return 'him/her';
}

exports.getForm = (req, res) => {
  const formData = req.session.bonafideData || {};
  res.render('bonafide', { formData });
};

exports.postForm = (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth();
    const academicYear = month < 5 ? `${currentYear - 1} - ${currentYear}` : `${currentYear} - ${currentYear + 1}`;

    // If Custom is selected, use the custom input value as certificateFor
    let certificateFor = req.body.certificateFor;
    const customCertificateFor = req.body.customCertificateFor || '';
    if (certificateFor === 'Custom' && customCertificateFor.trim()) {
      certificateFor = customCertificateFor.trim();
    }

    // Auto-set today's date (YYYY-MM-DD)
    const day = String(now.getDate()).padStart(2, '0');
    const displayMonth = String(now.getMonth() + 1).padStart(2, '0');
    const todayDate = `${currentYear}-${displayMonth}-${day}`;

    const formData = {
      title: req.body.title,
      name: req.body.name,
      rollno: req.body.rollno,
      relation: req.body.relation,
      parentName: req.body.parentName,
      year: req.body.year,
      course: req.body.course,
      branch: req.body.branch,
      certificateFor,
      customCertificateFor,
      scholarshipType: req.body.scholarshipType || '',
      date: todayDate,
      academicYear,
      cYear: currentYear
    };

    req.session.bonafideData = formData;
    res.render('preview', { formData });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing form');
  }
};

exports.confirmForm = async (req, res) => {
  const finalData = req.session.bonafideData;
  if (!finalData) return res.redirect('/bonafide');

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth();

    finalData.academicYear = month < 5 ? `${currentYear - 1} - ${currentYear}` : `${currentYear} - ${currentYear + 1}`;
    finalData.cYear = currentYear;

    // Duplicate prevention: Use a deterministic Document ID (Idempotency Key)
    // ID format: ROLLNO_PURPOSE_DATE
    const sanitizedPurpose = finalData.certificateFor.replace(/[^a-zA-Z0-9]/g, '_');
    const docId = `${finalData.rollno}_${sanitizedPurpose}_${finalData.date}`;

    // Determine him/her based on title
    const himHer = getHimHerFromTitle(finalData.title);

    // 5-minute cooldown check
    const docRef = db.collection('bonafideForms').doc(docId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const existingData = docSnap.data();
      const lastCreatedAt = existingData.createdAt.toDate();
      const diffMs = Date.now() - lastCreatedAt.getTime();
      const diffMins = diffMs / 60000;

      if (diffMins < 5) {
        const waitMins = Math.ceil(5 - diffMins);
        console.log(`Cooldown active for ${finalData.rollno}. Wait ${waitMins} more minutes.`);
        return res.render('preview', { 
          formData: finalData, 
          errorMessage: `You recently submitted this request. Please wait for ${waitMins} more minute(s) before trying again.` 
        });
      }
    }

    // Save to Firebase (using .set() to overwrite/update instead of creating duplicates)
    await docRef.set({
      ...finalData,
      himHer: himHer,
      createdAt: new Date(),
    });

    req.session.bonafideData = null;
    res.render('success', { name: finalData.name });
  } catch (err) {
    console.error('Error saving form:', err);
    res.status(500).send('Error saving form data.');
  }
};