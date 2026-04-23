const cron = require('node-cron');
const { runMonthlyReport } = require('../utils/monthlyReport');
const { db } = require('../config/firebase');

function scheduleMonthlyReportJob() {
  // Run on the 1st of every month at 00:05 AM
  cron.schedule('5 0 1 * *', async () => {
    console.log('Running monthly bonafide report job...');
    try {
      const now = new Date();
      // Month is 1-indexed, but Date.getMonth() is 0-indexed.
      // We want to report on the month that JUST ended.
      let year = now.getFullYear();
      let month = now.getMonth(); // This gives us previous month index (0-11)
      
      if (month === 0) { // If it's January, we want December of previous year
        month = 12;
        year -= 1;
      }

      await runMonthlyReport(db, year, month);
      console.log(`Monthly report for ${year}-${month} generated and sent to admin.`);
    } catch (err) {
      console.error('Monthly report job failed:', err.message);
    }
  });
}

module.exports = { scheduleMonthlyReportJob };
