const cron = require('node-cron');
const primaryDb = require('../db/primary');

// Deletes application requests older than 30 days
cron.schedule('0 0 * * *', async () => {
  console.log('Running nightly cleanup job: Deleting old bonafide forms...');
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const result = await primaryDb.query(
      'DELETE FROM bonafide_forms WHERE created_at < $1',
      [cutoff]
    );
    console.log(`Nightly clean up complete. Removed ${result.rowCount} old records.`);
  } catch (err) {
    console.error('Clean up job failed:', err.message);
  }
});
