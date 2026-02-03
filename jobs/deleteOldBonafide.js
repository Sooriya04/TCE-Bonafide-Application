const cron = require('node-cron');
const { db } = require('../config/firebase');

async function deleteOldBonafideForms() {
  try {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const snapshot = await db
      .collection('bonafideForms')
      .where('createdAt', '<=', twoMonthsAgo)
      .get();

    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`[Cron] Deleted ${snapshot.size} old bonafide forms`);
    } else {
      console.log('[Cron] No old bonafide forms to delete');
    }
  } catch (err) {
    console.error('[Cron] Error deleting old bonafide forms:', err);
  }
}

// Schedule: Run every day at 00:00 (midnight)
cron.schedule('0 0 * * *', () => {
  console.log('[Cron] Running scheduled deletion of old bonafide forms...');
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
