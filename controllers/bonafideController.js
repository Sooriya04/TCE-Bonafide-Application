const { db } = require('../config/firebase');
const {
  sendBonafideNotification,
} = require('../helper/sendBonafideNotification');
const generateBonafideDocx = require('../helper/generateBonafideDocx');

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

    finalData.name = finalData.name.toUpperCase();
    // finalData.parentName = finalData.parentName.toUpperCase(); // Removed as per user request to preserve case

    // Determine him/her based on title
    finalData.himHer = getHimHerFromTitle(finalData.title);

    // Save to Firebase
    await db.collection('bonafideForms').add({
      ...finalData,
      himHer: finalData.himHer, // Save it to database too
      createdAt: new Date(),
    });

    // Generate DOCX buffer
    const buffer = await generateBonafideDocx(finalData);

    // Create filename with .docx extension
    const day = String(now.getDate()).padStart(2, '0');
    const displayMonth = String(now.getMonth() + 1).padStart(2, '0');
    const fileName = `${day}-${displayMonth}-${currentYear}-bonafide-certificate-${finalData.rollno}.docx`;

    // Send email with DOCX attachment
    await sendBonafideNotification(finalData, buffer, fileName);

    req.session.bonafideData = null;
    res.render('success', { name: finalData.name });
  } catch (err) {
    console.error('Error saving form:', err);
    res.status(500).send('Error saving form data.');
  }
};