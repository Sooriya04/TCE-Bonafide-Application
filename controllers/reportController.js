const { runMonthlyReport } = require('../utils/monthlyReport');
const admin = require('firebase-admin');
const db = admin.firestore();

const generateMonthlyReport = async (req, res) => {
  try {
    const [year, month] = req.params.monthYear.split('-').map(Number);

    if (!year || !month || month < 1 || month > 12) {
      return res
        .status(400)
        .send('Invalid format. Use YYYY-MM (e.g., 2025-07).');
    }

    const filePath = await runMonthlyReport(db, year, month);
    
    // Download the file to the browser as well
    res.download(filePath, (err) => {
        if (err) console.error('Download error:', err);
    });

  } catch (err) {
    console.error('Error generating report:', err.message);
    res.status(500).send(`Failed to generate monthly report: ${err.message}`);
  }
};

module.exports = { generateMonthlyReport };
