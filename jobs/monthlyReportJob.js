const cron = require('node-cron');
const replicaDb = require('../db/replica');
const { generateBonafideExcel } = require('../utils/monthlyReport');
const { sendMonthlyReportEmail } = require('../helper/sendMonthlyReportEmail');
const path = require('path');
const fs = require('fs');
const logger = require('../logger');

const scheduleMonthlyReportJob = () => {
  cron.schedule('0 0 1 * *', async () => {
    logger.info('Running monthly report generation job...');
    try {
      const now = new Date();
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      // Query replica for records in that range
      const result = await replicaDb.query(
        'SELECT form_data FROM bonafide_forms WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at ASC',
        [firstDayLastMonth, lastDayLastMonth]
      );

      const allForms = result.rows.map(row => row.form_data);

      if (allForms.length > 0) {
        const reportsDir = path.join(__dirname, '../../reports');
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }

        const month = String(firstDayLastMonth.getMonth() + 1).padStart(2, '0');
        const year = firstDayLastMonth.getFullYear();
        const filePath = path.join(reportsDir, `Monthly_Report_${month}_${year}.xlsx`);

        await generateBonafideExcel(filePath, firstDayLastMonth, lastDayLastMonth, allForms);
        await sendMonthlyReportEmail(filePath, firstDayLastMonth, lastDayLastMonth);
        logger.info('Monthly report job completed successfully.');
      } else {
        logger.info('No forms found for the previous month. Skipping report.');
      }
    } catch (err) {
      logger.error('Monthly report job failed', { error: err.message });
    }
  });
};

module.exports = { scheduleMonthlyReportJob };
