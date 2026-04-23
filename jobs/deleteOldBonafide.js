const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { db } = require('../config/firebase');
const { generateBonafideExcel } = require('../utils/monthlyReport');
const { sendMonthlyReportEmail } = require('../helper/sendMonthlyReportEmail');

async function deleteOldBonafideForms() {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Fetch records to be deleted
    const snapshot = await db
      .collection('bonafideForms')
      .where('createdAt', '<=', oneMonthAgo)
      .get();

    if (!snapshot.empty) {
      console.log(`[Cron] Preparing to delete ${snapshot.size} records older than 1 month...`);
      
      const students = snapshot.docs.map((doc) => doc.data());
      
      // Calculate date range for the report
      // Since we delete records > 1 month old, we search for the boundaries in the fetched data
      const dates = students.map(s => s.createdAt.toDate());
      const start = new Date(Math.min(...dates));
      const end = new Date(Math.max(...dates));

      const reportsDir = path.join(__dirname, '../reports');
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(reportsDir, `Deletion_Backup_${timestamp}.xlsx`);

      // 1. Generate Excel
      await generateBonafideExcel(filePath, start, end, students);

      // 2. Email Admin (Backup subject)
      await sendMonthlyReportEmail(filePath, start, end);
      console.log('[Cron] Backup Excel sent to admin.');

      // 3. Batch Delete
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      
      console.log(`[Cron] Successfully deleted ${snapshot.size} old bonafide forms`);
      
      // Optional: Cleanup local file
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
      console.log('[Cron] No old bonafide forms to delete');
    }
  } catch (err) {
    console.error('[Cron] Error in deletion job:', err);
  }
}

// Schedule: Run on the 1st of every month at 01:00 AM
cron.schedule('0 1 1 * *', () => {
  console.log('[Cron] Running monthly cleanup and backup of old bonafide forms...');
  deleteOldBonafideForms();
});

/**
 * Delete expired sessions from Firestore
 */
async function deleteExpiredSessions() {
  try {
    const now = new Date();
    const snapshot = await db
      .collection('sessions')
      .where('expires', '<=', now)
      .get();

    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`[Cron] Deleted ${snapshot.size} expired sessions`);
    } else {
      console.log('[Cron] No expired sessions to delete');
    }
  } catch (err) {
    console.error('[Cron] Error deleting expired sessions:', err);
  }
}

// Schedule: Run every hour
cron.schedule('0 * * * *', () => {
  console.log('[Cron] Running scheduled deletion of expired sessions...');
  deleteExpiredSessions();
});

module.exports = { deleteOldBonafideForms, deleteExpiredSessions };
