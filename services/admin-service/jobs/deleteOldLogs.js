const cron = require('node-cron');
const primaryDb = require('../../../shared/db/primary');
const logger = require('../../../shared/logger');

// Deletes app logs older than 30 days
cron.schedule('0 1 * * *', async () => {
  logger.info('Running nightly cleanup job: Deleting old application logs...');
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const result = await primaryDb.query(
      'DELETE FROM app_logs WHERE created_at < $1',
      [cutoff]
    );
    logger.info(`Nightly logs cleanup complete. Removed ${result.rowCount} old log records.`);
  } catch (err) {
    logger.error('Logs cleanup job failed', { error: err.message });
  }
});
